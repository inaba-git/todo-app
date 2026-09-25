import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_CATEGORY,
  PRIORITIES,
  PRIORITY_ORDER,
} from './constants.js'
import { addDays, timestampToDateString } from './dateUtils.js'

// 以前のバージョンで保存されたタスクを補完する
// (カテゴリなし → 「その他」、サブタスクなし → 空配列、メモなし → 空文字、
//  完了日時なし → 完了済みなら追加日時で代用 / 未完了なら null)。
// 補完は固定値(追加日時)から決まるので、読み込むたびに同じ結果になる。
// 変更不要なら同じ参照を返す。
export function normalizeTask(task) {
  const category = CATEGORY_LABELS[task.category] ? task.category : DEFAULT_CATEGORY
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const memo = typeof task.memo === 'string' ? task.memo : ''
  let completedAt = null
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
    return task
  }
  return { ...task, category, subtasks, memo, completedAt }
}

// 完了日時が記録されておらず、追加日時で代用されている完了済みタスクか
export function hasEstimatedCompletion(storedTask) {
  return storedTask.completed && typeof storedTask.completedAt !== 'number'
}

export function subtaskProgress(task) {
  const total = task.subtasks.length
  const done = task.subtasks.filter((s) => s.completed).length
  return { done, total, percent: total > 0 ? (done / total) * 100 : 0 }
}

// 検索語・優先度・カテゴリで絞り込む('all' は絞り込みなし)
export function filterTasks(tasks, { search, priority, category }) {
  const keyword = search.trim().toLowerCase()
  return tasks.filter(
    (t) =>
      (!keyword || t.title.toLowerCase().includes(keyword)) &&
      (priority === 'all' || t.priority === priority) &&
      (category === 'all' || t.category === category)
  )
}

const byCreated = (a, b) => a.createdAt - b.createdAt
const byPriority = (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]

// 期限日の昇順(期限なしは最後)
function byDue(a, b) {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return 0
}

// 同順位のときは追加順で安定させる
const COMPARATORS = {
  created: [byCreated],
  due: [byDue, byPriority, byCreated],
  priority: [byPriority, byDue, byCreated],
}

export function sortTasks(tasks, sortKey) {
  const comparators = COMPARATORS[sortKey] || COMPARATORS.created
  return [...tasks].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b)
      if (result !== 0) return result
    }
    return 0
  })
}

// 統計用の集計。件数は全タスク対象、期限切れ・直近7日は未完了タスクのみ対象。
// 「直近7日」は今日を含む7日間(今日〜6日後)。期限切れ(今日より前)は含めない。
export function computeStats(tasks, today) {
  const weekEnd = addDays(today, 6)
  const priority = Object.fromEntries(PRIORITIES.map((p) => [p.value, 0]))
  const category = Object.fromEntries(CATEGORIES.map((c) => [c.value, 0]))
  let completed = 0
  let overdue = 0
  let dueThisWeek = 0

  for (const task of tasks) {
    priority[task.priority] += 1
    category[task.category] += 1
    if (task.completed) {
      completed += 1
    } else if (task.dueDate) {
      if (task.dueDate < today) overdue += 1
      else if (task.dueDate <= weekEnd) dueThisWeek += 1
    }
  }

  return { total: tasks.length, completed, priority, category, overdue, dueThisWeek }
}

// 振り返りグラフ用: 直近7日の日別と、直近4週間(7日ずつ4区間)の週別の完了数。
// 「週」は曜日始まりではなく、今日から数えて7日ごとの区間(最後の区間 = 直近7日)。
export function computeCompletionHistory(tasks, today) {
  const countByDate = {}
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
