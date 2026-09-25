import { useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_CATEGORY, DEFAULT_PRIORITY } from '../constants.ts'
import TaskFields from './TaskFields.tsx'
import MemoField from './MemoField.tsx'
import type { NewTaskFields } from '../types.ts'

type FormFields = Omit<NewTaskFields, 'title'>

const INITIAL_FIELDS: FormFields = {
  dueDate: '',
  priority: DEFAULT_PRIORITY,
  category: DEFAULT_CATEGORY,
  memo: '',
}

export default function TaskForm({ onAdd }: { onAdd: (fields: NewTaskFields) => void }) {
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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
