import { CATEGORIES, PRIORITIES } from '../constants.js'

// 追加フォームと編集フォームで共通の「期限日・優先度・カテゴリ」入力欄
export default function TaskFields({ values, onChange }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value })

  return (
    <>
      <label>
        期限日
        <input type="date" value={values.dueDate} onChange={set('dueDate')} />
      </label>
      <label>
        優先度
        <select value={values.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        カテゴリ
        <select value={values.category} onChange={set('category')}>
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
