import { useState } from 'react'
import { DEFAULT_CATEGORY, DEFAULT_PRIORITY } from '../constants.js'
import TaskFields from './TaskFields.jsx'
import MemoField from './MemoField.jsx'

const INITIAL_FIELDS = {
  dueDate: '',
  priority: DEFAULT_PRIORITY,
  category: DEFAULT_CATEGORY,
  memo: '',
}

export default function TaskForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState(INITIAL_FIELDS)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({ title: trimmed, ...fields, memo: fields.memo.trim() })
    setTitle('')
    setFields(INITIAL_FIELDS)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="task-input"
        placeholder="新しいタスクを入力…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="タスク名"
      />
      <MemoField value={fields.memo} onChange={(memo) => setFields({ ...fields, memo })} />
      <div className="form-row">
        <TaskFields values={fields} onChange={setFields} />
        <button type="submit" className="add-button" disabled={!title.trim()}>
          追加
        </button>
      </div>
    </form>
  )
}
