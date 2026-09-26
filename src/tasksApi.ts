import type { SupabaseClient } from '@supabase/supabase-js'
import { fromRow, toRow, toRowChanges } from './taskRows.ts'
import type { TaskRow } from './taskRows.ts'
import type { Task, TaskChanges } from './types.ts'

// タスクの保存先。画面側(useTasks)はこのインターフェースだけを知っていればよい
export interface TasksApi {
  list: () => Promise<Task[]>
  insert: (task: Task) => Promise<void>
  update: (id: string, changes: TaskChanges) => Promise<void>
  remove: (id: string) => Promise<void>
  removeMany: (ids: string[]) => Promise<void>
  /** 既にある id はそのままにして、無いものだけ追加する */
  importMany: (tasks: Task[]) => Promise<void>
}

const TABLE = 'tasks'

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

// Supabase(tasks テーブル)を保存先にする実装。
// どの操作も、ログイン中ユーザーの行にしか作用しない(RLS。supabase/schema.sql を参照)
export function createSupabaseTasksApi(client: SupabaseClient): TasksApi {
  return {
    async list() {
      const { data, error } = await client
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: true })
      check(error)
      return ((data ?? []) as TaskRow[]).map(fromRow)
    },

    async insert(task) {
      const { error } = await client.from(TABLE).insert(toRow(task))
      check(error)
    },

    async update(id, changes) {
      const row = toRowChanges(changes)
      if (Object.keys(row).length === 0) return
      const { error } = await client.from(TABLE).update(row).eq('id', id)
      check(error)
    },

    async remove(id) {
      const { error } = await client.from(TABLE).delete().eq('id', id)
      check(error)
    },

    async removeMany(ids) {
      if (ids.length === 0) return
      const { error } = await client.from(TABLE).delete().in('id', ids)
      check(error)
    },

    async importMany(tasks) {
      if (tasks.length === 0) return
      const { error } = await client
        .from(TABLE)
        .upsert(tasks.map(toRow), { onConflict: 'id', ignoreDuplicates: true })
      check(error)
    },
  }
}
