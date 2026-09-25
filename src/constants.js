export const PRIORITIES = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export const CATEGORIES = [
  { value: 'research', label: '研究' },
  { value: 'job', label: '就活' },
  { value: 'class', label: '授業' },
  { value: 'other', label: 'その他' },
]

export const SORT_OPTIONS = [
  { value: 'created', label: '追加した順' },
  { value: 'due', label: '期限日が近い順' },
  { value: 'priority', label: '優先度が高い順' },
]

export const DEFAULT_CATEGORY = 'other'
export const DEFAULT_PRIORITY = 'medium'

export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
export const PRIORITY_LABELS = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label]))
export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))
