import type { Category, Priority, Subtask, Task, TaskChanges } from './types.ts'

// Supabase の tasks テーブルの1行(supabase/schema.sql と対応)。
// user_id は DB 側が auth.uid() を自動で入れるので、アプリからは送らない。
export interface TaskRow {
  id: string
  user_id?: string
  title: string
  due_date: string | null
  priority: Priority
  category: Category
  memo: string
  subtasks: Subtask[]
  completed: boolean
  completed_at: string | null
  created_at: string
}

export type TaskRowInput = Omit<TaskRow, 'user_id'>

const toIso = (ms: number): string => new Date(ms).toISOString()

// アプリの Task(時刻はミリ秒、期限なしは空文字)→ DB の行
export function toRow(task: Task): TaskRowInput {
  return {
    id: task.id,
    title: task.title,
    due_date: task.dueDate === '' ? null : task.dueDate,
    priority: task.priority,
    category: task.category,
    memo: task.memo,
    subtasks: task.subtasks,
    completed: task.completed,
    completed_at: task.completedAt === null ? null : toIso(task.completedAt),
    created_at: toIso(task.createdAt),
  }
}

// 更新したい項目(TaskChanges)→ DB の列。指定された項目だけを含める
export function toRowChanges(changes: TaskChanges): Partial<TaskRowInput> {
  const row: Partial<TaskRowInput> = {}
  if (changes.title !== undefined) row.title = changes.title
  if (changes.dueDate !== undefined) row.due_date = changes.dueDate === '' ? null : changes.dueDate
  if (changes.priority !== undefined) row.priority = changes.priority
  if (changes.category !== undefined) row.category = changes.category
  if (changes.memo !== undefined) row.memo = changes.memo
  if (changes.subtasks !== undefined) row.subtasks = changes.subtasks
  if (changes.completed !== undefined) row.completed = changes.completed
  if (changes.completedAt !== undefined) {
    row.completed_at = changes.completedAt === null ? null : toIso(changes.completedAt)
  }
  if (changes.createdAt !== undefined) row.created_at = toIso(changes.createdAt)
  return row
}

// DB の行 → アプリの Task
export function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date ?? '',
    priority: row.priority,
    category: row.category,
    memo: row.memo ?? '',
    subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    completed: row.completed,
    completedAt: row.completed_at === null ? null : Date.parse(row.completed_at),
    createdAt: Date.parse(row.created_at),
  }
}
