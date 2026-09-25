export type Priority = 'high' | 'medium' | 'low'
export type Category = 'research' | 'job' | 'class' | 'other'
export type SortKey = 'created' | 'due' | 'priority'
export type ViewMode = 'list' | 'calendar'
export type Theme = 'light' | 'dark'

export interface Option<T extends string> {
  value: T
  label: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  /** 期限日(YYYY-MM-DD)。未設定は空文字 */
  dueDate: string
  priority: Priority
  category: Category
  memo: string
  subtasks: Subtask[]
  completed: boolean
  /** 完了にした時刻(ミリ秒)。未完了は null */
  completedAt: number | null
  /** 追加した時刻(ミリ秒) */
  createdAt: number
}

/**
 * localStorage に保存されているタスク。以前のバージョンで保存されたデータには
 * カテゴリ・サブタスク・メモ・完了日時がないことがあるため、それらは任意扱い。
 * 読み込み時に normalizeTask で Task に補完する。
 */
export type StoredTask = Omit<Task, 'category' | 'subtasks' | 'memo' | 'completedAt'> &
  Partial<Pick<Task, 'subtasks' | 'memo' | 'completedAt'>> & { category?: string }

/** 追加フォームで入力する項目 */
export type NewTaskFields = Pick<Task, 'title' | 'dueDate' | 'priority' | 'category' | 'memo'>

/** 期限日・優先度・カテゴリの入力欄(TaskFields)が扱う項目 */
export type TaskFieldValues = Pick<Task, 'dueDate' | 'priority' | 'category'>

/** 更新するフィールドだけを指定する */
export type TaskChanges = Partial<Omit<Task, 'id'>>

export interface TaskHandlers {
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, changes: TaskChanges) => void
}

export interface Filters {
  search: string
  priority: Priority | 'all'
  category: Category | 'all'
}

export interface TaskStats {
  total: number
  completed: number
  priority: Record<Priority, number>
  category: Record<Category, number>
  overdue: number
  dueThisWeek: number
}

export interface CompletionHistory {
  days: { date: string; count: number }[]
  weeks: { start: string; end: string; count: number }[]
}
