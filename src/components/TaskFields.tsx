import { CATEGORIES, PRIORITIES } from '../constants.ts'
import type { Category, Priority, TaskFieldValues } from '../types.ts'

interface TaskFieldsProps<T extends TaskFieldValues> {
  values: T
  onChange: (values: T) => void
}

// 追加フォームと編集フォームで共通の「期限日・優先度・カテゴリ」入力欄
// values は他の項目(タスク名・メモなど)を持っていてもよく、変更しない項目はそのまま onChange に渡す
export default function TaskFields<T extends TaskFieldValues>({
  values,
  onChange,
}: TaskFieldsProps<T>) {
  return (
    <>
      <label>
        期限日
        <input type="date" value={values.dueDate} onChange={(e) => onChange({ ...values, dueDate: e.target.value })} />
      </label>
      <label>
        優先度
        <select
          value={values.priority}
          onChange={(e) => onChange({ ...values, priority: e.target.value as Priority })}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        カテゴリ
        <select
          value={values.category}
          onChange={(e) => onChange({ ...values, category: e.target.value as Category })}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
