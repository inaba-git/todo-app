import { useCallback, useEffect, useRef, useState } from 'react'
import type { TasksApi } from './tasksApi.ts'
import {
  createTask,
  deleteTaskById,
  removeCompleted,
  toggleTaskById,
  updateTaskById,
} from './taskUtils.ts'
import type { NewTaskFields, StoredTask, Task, TaskChanges } from './types.ts'

export type SyncStatus = 'loading' | 'ready' | 'error'

// 画面が使うタスクの入れ物。保存先(Supabase)への同期は useTasks が裏で行う
export interface TaskStore {
  tasks: StoredTask[]
  /** 最初の読み込み中 / 読み込み済み / 最初の読み込みに失敗 */
  status: SyncStatus
  error: string | null
  dismissError: () => void
  /** 最初の読み込みに失敗したときの再試行 */
  reload: () => void
  addTask: (fields: NewTaskFields) => void
  updateTask: (id: string, changes: TaskChanges) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  clearCompleted: () => void
  /** 端末内のタスクなどを追加する。保存できたら true */
  importTasks: (tasks: Task[]) => Promise<boolean>
  /** 送信待ちの変更をすべて保存し、終わるまで待つ(ログアウト前など) */
  flush: () => Promise<void>
}

// 編集のたびに送信しないよう、更新はこの時間だけまとめてから送る(サブタスク名の入力など)
export const SAVE_DELAY_MS = 400

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/schema cache|does not exist/i.test(message)) {
    return 'タスクのテーブルが見つかりません。supabase/schema.sql を Supabase の SQL Editor で実行してください。'
  }
  return `タスクの同期に失敗しました(${message})。通信状況を確認してください。`
}

// タスクの追加・編集・削除を、まず画面に反映(楽観的更新)し、続けて api に保存する。
// - 保存は順番どおりに1つずつ行う(追加 → 更新 → 削除の順序が入れ替わらない)
// - 保存に失敗したら、エラーを表示して保存先の内容で画面を戻す
// - タブを開き直した・戻ってきたときは保存先から読み直す(別の端末での変更を反映)
export function useTasks(api: TasksApi): TaskStore {
  const [tasks, setTasks] = useState<StoredTask[]>([])
  const [status, setStatus] = useState<SyncStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const tasksRef = useRef<StoredTask[]>([])
  const versionRef = useRef(0) // 画面側で変更するたびに増やす
  const pendingRef = useRef(new Map<string, TaskChanges>()) // まとめ待ちの更新(id ごと)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const inFlightRef = useRef(0)
  const needsReloadRef = useRef(false)

  const commit = useCallback((next: StoredTask[]) => {
    tasksRef.current = next
    versionRef.current += 1
    setTasks(next)
  }, [])

  // force: 画面の内容を捨てて保存先の内容にする(最初の読み込み・失敗後)。
  // force でない読み直しは、未送信の変更があるときは結果を捨てる(自分の変更を上書きしない)
  const load = useCallback(
    async (force: boolean) => {
      const startVersion = versionRef.current
      try {
        const rows = await api.list()
        const dirty =
          versionRef.current !== startVersion ||
          inFlightRef.current > 0 ||
          pendingRef.current.size > 0
        if (dirty && !force) return
        tasksRef.current = rows
        setTasks(rows)
        setStatus('ready')
      } catch (e) {
        if (!force) return // 裏での読み直しの失敗は黙って無視する
        setError(describeError(e))
        setStatus((s) => (s === 'ready' ? s : 'error'))
      }
    },
    [api]
  )

  // 保存を順番待ちの列に入れる。成功したら true
  const run = useCallback(
    (op: () => Promise<void>): Promise<boolean> => {
      inFlightRef.current += 1
      const result = queueRef.current.then(op).then(
        () => true,
        (e: unknown) => {
          setError(describeError(e))
          needsReloadRef.current = true
          return false
        }
      )
      queueRef.current = result.then(() => {
        inFlightRef.current -= 1
        if (inFlightRef.current === 0 && pendingRef.current.size === 0 && needsReloadRef.current) {
          needsReloadRef.current = false
          return load(true) // 失敗があったら、保存先の内容で画面を戻す
        }
      })
      return result
    },
    [load]
  )

  const flush = useCallback((): Promise<void> => {
    clearTimeout(timerRef.current)
    timerRef.current = undefined
    const entries = [...pendingRef.current]
    pendingRef.current.clear()
    for (const [id, changes] of entries) void run(() => api.update(id, changes))
    return queueRef.current.then(() => undefined)
  }, [api, run])

  const queueUpdate = useCallback(
    (id: string, changes: TaskChanges, immediate: boolean) => {
      pendingRef.current.set(id, { ...pendingRef.current.get(id), ...changes })
      if (immediate) {
        void flush()
      } else {
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => void flush(), SAVE_DELAY_MS)
      }
    },
    [flush]
  )

  const addTask = useCallback(
    (fields: NewTaskFields) => {
      const task = createTask(fields)
      commit([...tasksRef.current, task])
      void run(() => api.insert(task))
    },
    [api, commit, run]
  )

  const updateTask = useCallback(
    (id: string, changes: TaskChanges) => {
      if (!tasksRef.current.some((t) => t.id === id)) return
      commit(updateTaskById(tasksRef.current, id, changes))
      queueUpdate(id, changes, false)
    },
    [commit, queueUpdate]
  )

  const toggleTask = useCallback(
    (id: string) => {
      const next = toggleTaskById(tasksRef.current, id)
      const toggled = next.find((t) => t.id === id)
      if (!toggled) return
      commit(next)
      queueUpdate(id, { completed: toggled.completed, completedAt: toggled.completedAt ?? null }, true)
    },
    [commit, queueUpdate]
  )

  const deleteTask = useCallback(
    (id: string) => {
      commit(deleteTaskById(tasksRef.current, id))
      pendingRef.current.delete(id) // 削除するタスクの未送信の更新は不要
      void run(() => api.remove(id))
    },
    [api, commit, run]
  )

  const clearCompleted = useCallback(() => {
    const ids = tasksRef.current.filter((t) => t.completed).map((t) => t.id)
    if (ids.length === 0) return
    commit(removeCompleted(tasksRef.current))
    for (const id of ids) pendingRef.current.delete(id)
    void run(() => api.removeMany(ids))
  }, [api, commit, run])

  const importTasks = useCallback(
    async (list: Task[]): Promise<boolean> => {
      const known = new Set(tasksRef.current.map((t) => t.id))
      const fresh = list.filter((t) => !known.has(t.id))
      if (fresh.length === 0) return true
      commit([...tasksRef.current, ...fresh])
      return run(() => api.importMany(fresh))
    },
    [api, commit, run]
  )

  const reload = useCallback(() => {
    setError(null)
    setStatus('loading')
    void load(true)
  }, [load])

  // 最初の読み込み
  useEffect(() => {
    void load(true)
  }, [load])

  // タブを閉じる・隠すときは送信待ちを保存し、戻ってきたときは読み直す
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
      else void load(false)
    }
    const onFocus = () => void load(false)
    const onPageHide = () => void flush()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pagehide', onPageHide)
      void flush() // 画面を離れるときも、送信待ちを取りこぼさない
    }
  }, [flush, load])

  return {
    tasks,
    status,
    error,
    dismissError: () => setError(null),
    reload,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    clearCompleted,
    importTasks,
    flush,
  }
}
