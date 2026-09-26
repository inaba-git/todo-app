// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SAVE_DELAY_MS, useTasks } from './useTasks.ts'
import { createMemoryTasksApi } from './test/memoryApi.ts'
import { makeTask } from './test/factories.ts'
import type { NewTaskFields } from './types.ts'

const fields: NewTaskFields = {
  title: '新しいタスク',
  dueDate: '',
  priority: 'medium',
  category: 'other',
  memo: '',
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// 最初の読み込みが終わるまで待つ(実時間)
async function setup(initial = [makeTask({ id: 'a', title: 'A' }), makeTask({ id: 'b', title: 'B' })]) {
  const api = createMemoryTasksApi(initial)
  const hook = renderHook(() => useTasks(api))
  await waitFor(() => expect(hook.result.current.status).toBe('ready'))
  return { api, hook, store: () => hook.result.current }
}

describe('読み込み', () => {
  it('最初は loading で、保存先のタスクを読み込むと ready になる', async () => {
    const api = createMemoryTasksApi([makeTask({ title: '保存済み' })])
    const { result } = renderHook(() => useTasks(api))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.tasks.map((t) => t.title)).toEqual(['保存済み'])
  })

  it('読み込みに失敗したら error になり、もう一度読み込める', async () => {
    const api = createMemoryTasksApi([makeTask({ title: 'あとで読める' })])
    api.failList = true
    const { result } = renderHook(() => useTasks(api))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('タスクの同期に失敗しました')

    api.failList = false
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.error).toBeNull()
    expect(result.current.tasks).toHaveLength(1)
  })

  it('テーブルが未作成のときは、schema.sql を実行するよう案内する', async () => {
    const api = createMemoryTasksApi()
    api.list = async () => {
      throw new Error("Could not find the table 'public.tasks' in the schema cache")
    }
    const { result } = renderHook(() => useTasks(api))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('supabase/schema.sql')
  })
})

describe('追加・削除・完了', () => {
  it('追加: すぐ画面に出て、そのあと保存先にも追加される', async () => {
    const { api, store } = await setup([])
    act(() => store().addTask(fields))
    expect(store().tasks).toHaveLength(1) // 保存を待たずに反映(楽観的更新)
    expect(store().tasks[0]).toMatchObject({ title: '新しいタスク', completed: false })
    await waitFor(() => expect(api.rows).toHaveLength(1))
    expect(api.rows[0].id).toBe(store().tasks[0].id)
  })

  it('削除: 画面から消え、保存先からも削除される', async () => {
    const { api, store } = await setup()
    act(() => store().deleteTask('a'))
    expect(store().tasks.map((t) => t.id)).toEqual(['b'])
    await waitFor(() => expect(api.rows.map((t) => t.id)).toEqual(['b']))
  })

  it('完了の切り替え: すぐ保存され、完了日時も一緒に保存される。戻すと日時は消える', async () => {
    const { api, store } = await setup()
    act(() => store().toggleTask('a'))
    expect(store().tasks.find((t) => t.id === 'a')?.completed).toBe(true)
    await waitFor(() => expect(api.rows.find((t) => t.id === 'a')?.completed).toBe(true))
    expect(typeof api.rows.find((t) => t.id === 'a')?.completedAt).toBe('number')

    act(() => store().toggleTask('a'))
    await waitFor(() => expect(api.rows.find((t) => t.id === 'a')?.completed).toBe(false))
    expect(api.rows.find((t) => t.id === 'a')?.completedAt).toBeNull()
  })

  it('完了済みをすべて削除: 完了済みだけがまとめて削除される', async () => {
    const { api, store } = await setup([
      makeTask({ id: 'a', completed: true, completedAt: 1 }),
      makeTask({ id: 'b' }),
      makeTask({ id: 'c', completed: true, completedAt: 2 }),
    ])
    act(() => store().clearCompleted())
    expect(store().tasks.map((t) => t.id)).toEqual(['b'])
    await waitFor(() => expect(api.rows.map((t) => t.id)).toEqual(['b']))
    expect(api.calls.filter((c) => c.startsWith('removeMany'))).toEqual(['removeMany:a,c'])
  })

  it('完了済みがなければ何も送らない', async () => {
    const { api, store } = await setup()
    act(() => store().clearCompleted())
    expect(api.calls.some((c) => c.startsWith('removeMany'))).toBe(false)
  })
})

describe('編集(まとめて送信)', () => {
  async function setupFake() {
    vi.useFakeTimers()
    const api = createMemoryTasksApi([makeTask({ id: 'a', title: 'A' }), makeTask({ id: 'b', title: 'B' })])
    const hook = renderHook(() => useTasks(api))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(hook.result.current.status).toBe('ready')
    return { api, store: () => hook.result.current }
  }
  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  const updates = (api: { calls: string[] }) => api.calls.filter((c) => c.startsWith('update'))

  it('編集はすぐ画面に反映され、保存は少し待ってから1回にまとめて送る', async () => {
    const { api, store } = await setupFake()
    act(() => store().updateTask('a', { title: 'A1' }))
    await advance(100)
    act(() => store().updateTask('a', { title: 'A12' }))
    await advance(100)
    act(() => store().updateTask('a', { title: 'A123', memo: 'メモ' }))
    expect(store().tasks.find((t) => t.id === 'a')?.title).toBe('A123')
    expect(updates(api)).toEqual([]) // まだ送っていない

    await advance(SAVE_DELAY_MS)
    expect(updates(api)).toEqual(['update:a']) // 3回の編集が1回に
    expect(api.rows.find((t) => t.id === 'a')).toMatchObject({ title: 'A123', memo: 'メモ' })
  })

  it('別々のタスクの編集は、それぞれ1回ずつ送る', async () => {
    const { api, store } = await setupFake()
    act(() => store().updateTask('a', { title: 'A2' }))
    act(() => store().updateTask('b', { title: 'B2' }))
    await advance(SAVE_DELAY_MS)
    expect(updates(api).sort()).toEqual(['update:a', 'update:b'])
  })

  it('削除したタスクの、送信待ちの編集は送らない', async () => {
    const { api, store } = await setupFake()
    act(() => store().updateTask('a', { title: '消える前の編集' }))
    act(() => store().deleteTask('a'))
    await advance(SAVE_DELAY_MS * 2)
    expect(updates(api)).toEqual([])
    expect(api.rows.map((t) => t.id)).toEqual(['b'])
  })

  it('追加 → 編集は、その順番のまま保存される', async () => {
    const { api, store } = await setupFake()
    act(() => store().addTask(fields))
    const id = store().tasks[store().tasks.length - 1].id
    act(() => store().updateTask(id, { memo: '追加直後の編集' }))
    await advance(SAVE_DELAY_MS)
    const writes = api.calls.filter((c) => /^(insert|update)/.test(c))
    expect(writes).toEqual([`insert:${id}`, `update:${id}`])
    expect(api.rows.find((t) => t.id === id)?.memo).toBe('追加直後の編集')
  })

  it('flush: 待たずにすぐ保存し、完了するまで待てる(ログアウト前など)', async () => {
    const { api, store } = await setupFake()
    act(() => store().updateTask('a', { title: '保存してほしい' }))
    await act(async () => {
      await store().flush()
    })
    expect(api.rows.find((t) => t.id === 'a')?.title).toBe('保存してほしい')
  })

  it('タブを隠す(別のタブへ移る)と、送信待ちの編集をすぐ保存する', async () => {
    const { api, store } = await setupFake()
    act(() => store().updateTask('a', { title: '隠す前の編集' }))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api.rows.find((t) => t.id === 'a')?.title).toBe('隠す前の編集')
  })
})

describe('保存の失敗', () => {
  it('追加の保存に失敗したら、エラーを表示して保存先の内容に戻す', async () => {
    const { api, store } = await setup([])
    api.failNext = new Error('network down')
    act(() => store().addTask(fields))
    expect(store().tasks).toHaveLength(1) // いったん画面には出る
    await waitFor(() => expect(store().error).toContain('network down'))
    await waitFor(() => expect(store().tasks).toHaveLength(0)) // 保存先に無いので消える
  })

  it('エラーは閉じられる', async () => {
    const { api, store } = await setup([])
    api.failNext = new Error('x')
    act(() => store().addTask(fields))
    await waitFor(() => expect(store().error).not.toBeNull())
    act(() => store().dismissError())
    expect(store().error).toBeNull()
  })
})

describe('別の端末での変更の反映', () => {
  it('タブに戻ってくる(focus)と、保存先の最新の内容を読み直す', async () => {
    const { api, store } = await setup()
    api.rows.push(makeTask({ id: 'from-phone', title: 'スマホで追加' }))
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => expect(store().tasks.map((t) => t.title)).toContain('スマホで追加'))
  })

  it('未送信の編集があるときは、読み直しの結果で上書きしない', async () => {
    vi.useFakeTimers()
    const api = createMemoryTasksApi([makeTask({ id: 'a', title: 'A' })])
    const hook = renderHook(() => useTasks(api))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    act(() => hook.result.current.updateTask('a', { title: '編集中' }))
    api.rows = [makeTask({ id: 'a', title: '古い内容' })]
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(hook.result.current.tasks[0].title).toBe('編集中')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS)
    })
    expect(api.rows[0].title).toBe('編集中')
  })

  it('読み直しに失敗しても、エラーは表示しない(裏の処理なので)', async () => {
    const { api, store } = await setup()
    api.failList = true
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await new Promise((r) => setTimeout(r, 30))
    expect(store().error).toBeNull()
    expect(store().tasks).toHaveLength(2)
  })
})

describe('端末のタスクの取り込み (importTasks)', () => {
  it('まだ無いタスクだけを追加し、成功したら true', async () => {
    const { api, store } = await setup([makeTask({ id: 'a', title: '既存' })])
    let ok = false
    await act(async () => {
      ok = await store().importTasks([
        makeTask({ id: 'a', title: '重複(追加しない)' }),
        makeTask({ id: 'n', title: '取り込むタスク' }),
      ])
    })
    expect(ok).toBe(true)
    expect(store().tasks.map((t) => t.title)).toEqual(['既存', '取り込むタスク'])
    expect(api.rows.map((t) => t.title)).toEqual(['既存', '取り込むタスク'])
  })

  it('取り込むものがなければ何も送らず true', async () => {
    const { api, store } = await setup([makeTask({ id: 'a' })])
    let ok = false
    await act(async () => {
      ok = await store().importTasks([makeTask({ id: 'a' })])
    })
    expect(ok).toBe(true)
    expect(api.calls.some((c) => c.startsWith('importMany'))).toBe(false)
  })

  it('保存に失敗したら false を返し、画面も元に戻る', async () => {
    const { api, store } = await setup([])
    api.failNext = new Error('nope')
    let ok = true
    await act(async () => {
      ok = await store().importTasks([makeTask({ id: 'n' })])
    })
    expect(ok).toBe(false)
    await waitFor(() => expect(store().tasks).toHaveLength(0))
    expect(store().error).toContain('nope')
  })
})
