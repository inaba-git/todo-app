import { CATEGORIES, DEFAULT_CATEGORY, PRIORITIES, PRIORITY_ORDER } from './constants.ts'
import { addDays, timestampToDateString } from './dateUtils.ts'
import type {
  Category,
  CompletionHistory,
  Filters,
  NewTaskFields,
  Option,
  SortKey,
  StoredTask,
  Task,
  TaskChanges,
  TaskStats,
} from './types.ts'

function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((c) => c.value === value)
}

// 以前のバージョンで保存されたタスクを補完する
// (カテゴリなし → 「その他」、サブタスクなし → 空配列、メモなし → 空文字、
//  完了日時なし → 完了済みなら追加日時で代用 / 未完了なら null)。
// 補完は固定値(追加日時)から決まるので、読み込むたびに同じ結果になる。
// 変更不要なら同じ参照を返す。
export function normalizeTask(task: StoredTask): Task {
  const category = isCategory(task.category) ? task.category : DEFAULT_CATEGORY
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const memo = typeof task.memo === 'string' ? task.memo : ''
  let completedAt: number | null = null
  if (task.completed) {
    if (typeof task.completedAt === 'number') completedAt = task.completedAt
    else if (typeof task.createdAt === 'number') completedAt = task.createdAt
  }
  if (
    category === task.category &&
    subtasks === task.subtasks &&
    memo === task.memo &&
    completedAt === task.completedAt
  ) {
    // 補完が要らない = 上の4項目がすべて揃っているので、そのまま Task として返せる
    return task as Task
  }
  return { ...task, category, subtasks, memo, completedAt }
}

// 新しいタスクを作る(未完了・サブタスクなし)。id と時刻は引数で差し替えられる(テスト用)
export function createTask(
  fields: NewTaskFields,
  { id = crypto.randomUUID(), now = Date.now() }: { id?: string; now?: number } = {}
): Task {
  return {
    id,
    ...fields,
    subtasks: [],
    completed: false,
    completedAt: null,
    createdAt: now,
  }
}

// 指定した id のタスクだけを changes で更新した新しい配列を返す(元の配列は変更しない)
export function updateTaskById(
  tasks: StoredTask[],
  id: string,
  changes: TaskChanges
): StoredTask[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...changes } : t))
}

// 完了 ⇔ 未完了を切り替える。完了にした瞬間の時刻を記録し、未完了に戻したら消す(振り返りグラフ用)
export function toggleTaskById(
  tasks: StoredTask[],
  id: string,
  now: number = Date.now()
): StoredTask[] {
  return tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed, completedAt: t.completed ? null : now } : t
  )
}

export function deleteTaskById(tasks: StoredTask[], id: string): StoredTask[] {
  return tasks.filter((t) => t.id !== id)
}

// 完了済みのタスクをすべて取り除く
export function removeCompleted(tasks: StoredTask[]): StoredTask[] {
  return tasks.filter((t) => !t.completed)
}

// この端末に保存されていた古いタスクを、アカウント(DB)に取り込める形にする。
// 完了日時は推測で埋めず、未記録なら null のままにする(表示側が従来どおり追加日で代用する)
export function toImportableTask(task: StoredTask): Task {
  return {
    ...normalizeTask(task),
    completedAt: typeof task.completedAt === 'number' ? task.completedAt : null,
  }
}

// 完了日時が記録されておらず、追加日時で代用されている完了済みタスクか
export function hasEstimatedCompletion(storedTask: StoredTask): boolean {
  return storedTask.completed && typeof storedTask.completedAt !== 'number'
}

type DueTask = Pick<Task, 'dueDate' | 'completed'>

// 期限切れ: 未完了で、期限日が今日より前
export function isOverdue(task: DueTask, today: string): boolean {
  return !task.completed && task.dueDate !== '' && task.dueDate < today
}

// 直近7日が期限: 未完了で、期限日が今日〜6日後(今日を含む7日間)。期限切れは含めない
export function isDueThisWeek(task: DueTask, today: string): boolean {
  return (
    !task.completed &&
    task.dueDate !== '' &&
    task.dueDate >= today &&
    task.dueDate <= addDays(today, 6)
  )
}

export type DueStatus = 'overdue' | 'today' | ''

// タスクの期限表示用。期限切れ → 'overdue'、今日が期限 → 'today'、それ以外(完了済み含む)→ ''
export function getDueStatus(task: DueTask, today: string): DueStatus {
  if (isOverdue(task, today)) return 'overdue'
  if (!task.completed && task.dueDate === today) return 'today'
  return ''
}

export function subtaskProgress(task: Task): { done: number; total: number; percent: number } {
  const total = task.subtasks.length
  const done = task.subtasks.filter((s) => s.completed).length
  return { done, total, percent: total > 0 ? (done / total) * 100 : 0 }
}

// 検索語・優先度・カテゴリで絞り込む('all' は絞り込みなし)
export function filterTasks(tasks: Task[], { search, priority, category }: Filters): Task[] {
  const keyword = search.trim().toLowerCase()
  return tasks.filter(
    (t) =>
      (!keyword || t.title.toLowerCase().includes(keyword)) &&
      (priority === 'all' || t.priority === priority) &&
      (category === 'all' || t.category === category)
  )
}

type Comparator = (a: Task, b: Task) => number

const byCreated: Comparator = (a, b) => a.createdAt - b.createdAt
const byPriority: Comparator = (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]

// 期限日の昇順(期限なしは最後)
const byDue: Comparator = (a, b) => {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return 0
}

// 同順位のときは追加順で安定させる
const COMPARATORS: Record<SortKey, Comparator[]> = {
  created: [byCreated],
  due: [byDue, byPriority, byCreated],
  priority: [byPriority, byDue, byCreated],
}

export function sortTasks(tasks: Task[], sortKey: SortKey): Task[] {
  const comparators = COMPARATORS[sortKey] || COMPARATORS.created
  return [...tasks].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b)
      if (result !== 0) return result
    }
    return 0
  })
}

function zeroCounts<T extends string>(options: Option<T>[]): Record<T, number> {
  return Object.fromEntries(options.map((o) => [o.value, 0])) as Record<T, number>
}

// 統計用の集計。件数は全タスク対象、期限切れ・直近7日は未完了タスクのみ対象。
// 「直近7日」は今日を含む7日間(今日〜6日後)。期限切れ(今日より前)は含めない。
export function computeStats(tasks: Task[], today: string): TaskStats {
  const priority = zeroCounts(PRIORITIES)
  const category = zeroCounts(CATEGORIES)
  let completed = 0
  let overdue = 0
  let dueThisWeek = 0

  for (const task of tasks) {
    priority[task.priority] += 1
    category[task.category] += 1
    if (task.completed) completed += 1
    if (isOverdue(task, today)) overdue += 1
    if (isDueThisWeek(task, today)) dueThisWeek += 1
  }

  return { total: tasks.length, completed, priority, category, overdue, dueThisWeek }
}

// 全体の完了率(%)。四捨五入して整数にし、タスクが 0 件のときは 0
export function completionPercent({ total, completed }: Pick<TaskStats, 'total' | 'completed'>): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

// 振り返りグラフ用: 直近7日の日別と、直近4週間(7日ずつ4区間)の週別の完了数。
// 「週」は曜日始まりではなく、今日から数えて7日ごとの区間(最後の区間 = 直近7日)。
export function computeCompletionHistory(tasks: Task[], today: string): CompletionHistory {
  const countByDate: Record<string, number> = {}
  for (const task of tasks) {
    if (!task.completed || typeof task.completedAt !== 'number') continue
    const date = timestampToDateString(task.completedAt)
    countByDate[date] = (countByDate[date] || 0) + 1
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return { date, count: countByDate[date] || 0 }
  })

  const weeks = Array.from({ length: 4 }, (_, k) => {
    const end = addDays(today, -7 * (3 - k))
    const start = addDays(end, -6)
    let count = 0
    for (let i = 0; i < 7; i++) count += countByDate[addDays(start, i)] || 0
    return { start, end, count }
  })

  return { days, weeks }
}
