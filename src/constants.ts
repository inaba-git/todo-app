import type { Category, Option, Priority, SortKey } from './types.ts'

export const PRIORITIES: Option<Priority>[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export const CATEGORIES: Option<Category>[] = [
  { value: 'research', label: '研究' },
  { value: 'job', label: '就活' },
  { value: 'class', label: '授業' },
  { value: 'other', label: 'その他' },
]

export const SORT_OPTIONS: Option<SortKey>[] = [
  { value: 'created', label: '追加した順' },
  { value: 'due', label: '期限日が近い順' },
  { value: 'priority', label: '優先度が高い順' },
]

export const DEFAULT_CATEGORY: Category = 'other'
export const DEFAULT_PRIORITY: Priority = 'medium'

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
export const PRIORITY_LABELS = Object.fromEntries(
  PRIORITIES.map((p) => [p.value, p.label])
) as Record<Priority, string>
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
) as Record<Category, string>
