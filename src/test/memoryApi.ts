import type { TasksApi } from '../tasksApi.ts'
import type { Task } from '../types.ts'

export interface MemoryTasksApi extends TasksApi {
  /** 保存されているタスク(サーバー側の状態に相当) */
  rows: Task[]
  /** 呼ばれた操作の記録(例: "insert:abc") */
  calls: string[]
  /** 次に呼ばれる保存系の操作(list 以外)を、このエラーで失敗させる */
  failNext: Error | null
  /** true の間は list も失敗する */
  failList: boolean
}

// テスト用: メモリ上に保存するだけの TasksApi(通信は発生しない)
export function createMemoryTasksApi(initial: Task[] = []): MemoryTasksApi {
  const fail = (): void => {
    if (api.failNext) {
      const error = api.failNext
      api.failNext = null
      throw error
    }
  }

  const api: MemoryTasksApi = {
    rows: [...initial],
    calls: [],
    failNext: null,
    failList: false,

    async list() {
      api.calls.push('list')
      if (api.failList) throw new Error('list failed')
      return api.rows.map((t) => ({ ...t }))
    },
    async insert(task) {
      api.calls.push(`insert:${task.id}`)
      fail()
      api.rows.push({ ...task })
    },
    async update(id, changes) {
      api.calls.push(`update:${id}`)
      fail()
      api.rows = api.rows.map((t) => (t.id === id ? { ...t, ...changes } : t))
    },
    async remove(id) {
      api.calls.push(`remove:${id}`)
      fail()
      api.rows = api.rows.filter((t) => t.id !== id)
    },
    async removeMany(ids) {
      api.calls.push(`removeMany:${ids.join(',')}`)
      fail()
      api.rows = api.rows.filter((t) => !ids.includes(t.id))
    },
    async importMany(tasks) {
      api.calls.push(`importMany:${tasks.length}`)
      fail()
      const known = new Set(api.rows.map((t) => t.id))
      api.rows.push(...tasks.filter((t) => !known.has(t.id)).map((t) => ({ ...t })))
    },
  }
  return api
}
