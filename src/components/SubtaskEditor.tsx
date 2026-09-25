import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Subtask } from '../types.ts'

interface SubtaskEditorProps {
  subtasks: Subtask[]
  onChange: (subtasks: Subtask[]) => void
}

// サブタスクの追加・完了・名前変更・削除。変更のたびに新しい配列を onChange で返す。
// (親が「即保存」するか「保存ボタンまで下書きとして保持」するかは呼び出し側で決める)
export default function SubtaskEditor({ subtasks, onChange }: SubtaskEditorProps) {
  const [newTitle, setNewTitle] = useState('')

  const add = () => {
    const title = newTitle.trim()
    if (!title) return
    onChange([...subtasks, { id: crypto.randomUUID(), title, completed: false }])
    setNewTitle('')
  }

  const update = (id: string, changes: Partial<Subtask>) =>
    onChange(subtasks.map((s) => (s.id === id ? { ...s, ...changes } : s)))

  const remove = (id: string) => onChange(subtasks.filter((s) => s.id !== id))

  // Enter で親の編集フォームが送信されないようにする
  const onEnter =
    (action: (e: KeyboardEvent<HTMLInputElement>) => void) =>
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        action(e)
      }
    }

  return (
    <div className="subtasks">
      {subtasks.length > 0 && (
        <ul className="subtask-list">
          {subtasks.map((s) => (
            <li key={s.id} className={`subtask-item ${s.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                checked={s.completed}
                onChange={() => update(s.id, { completed: !s.completed })}
                aria-label={`サブタスク「${s.title}」を${s.completed ? '未完了に戻す' : '完了にする'}`}
              />
              <input
                type="text"
                className="subtask-title"
                value={s.title}
                onChange={(e) => update(s.id, { title: e.target.value })}
                onBlur={() => !s.title.trim() && remove(s.id)}
                onKeyDown={onEnter((e) => e.currentTarget.blur())}
                aria-label="サブタスク名"
              />
              <button
                type="button"
                className="subtask-delete"
                onClick={() => remove(s.id)}
                aria-label={`サブタスク「${s.title}」を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="subtask-add">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={onEnter(add)}
          placeholder="サブタスクを追加…"
          aria-label="新しいサブタスク名"
        />
        <button type="button" onClick={add} disabled={!newTitle.trim()}>
          追加
        </button>
      </div>
    </div>
  )
}
