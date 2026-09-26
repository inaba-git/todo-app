import { PRIORITIES } from './constants.ts'
import { toImportableTask } from './taskUtils.ts'
import type { StoredTask, Task } from './types.ts'

// ログイン機能の追加前にこの端末の localStorage に保存されていたタスクを、
// アカウントに取り込むための読み出し・取り込み済みの記録。

export const LOCAL_TASKS_KEY = 'todo-app.tasks'
const handledKey = (userId: string) => `todo-app.localImport.${userId}`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/

function isStoredTask(value: unknown): value is StoredTask {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    UUID.test(t.id) && // DB の id は uuid 型
    typeof t.title === 'string' &&
    t.title.trim() !== '' &&
    typeof t.dueDate === 'string' &&
    (t.dueDate === '' || DATE.test(t.dueDate)) &&
    PRIORITIES.some((p) => p.value === t.priority) &&
    typeof t.completed === 'boolean' &&
    typeof t.createdAt === 'number'
  )
}

// 取り込める形のタスクだけを返す(壊れたデータ・読めない環境では空配列)
export function readLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredTask).map(toImportableTask)
  } catch {
    return []
  }
}

// 「取り込む」「取り込まない」のどちらかを選んだ(=もう確認しない)か
export function isLocalImportHandled(userId: string): boolean {
  try {
    return localStorage.getItem(handledKey(userId)) === 'done'
  } catch {
    return false
  }
}

export function markLocalImportHandled(userId: string): void {
  try {
    localStorage.setItem(handledKey(userId), 'done')
  } catch {
    // 記録できなくても、次回もう一度確認するだけ
  }
}
