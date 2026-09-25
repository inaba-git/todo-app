import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatDate, todayString } from '../dateUtils.ts'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../constants.ts'
import { getDueStatus, subtaskProgress } from '../taskUtils.ts'
import TaskFields from './TaskFields.tsx'
import SubtaskEditor from './SubtaskEditor.tsx'
import MemoField from './MemoField.tsx'
import type { Task, TaskHandlers } from '../types.ts'

// 編集中の下書き。「保存」を押すまで保存データには反映しない
type EditDraft = Pick<
  Task,
  'title' | 'dueDate' | 'priority' | 'category' | 'memo' | 'subtasks'
>

interface TaskItemProps extends TaskHandlers {
  task: Task
}

export default function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  // draft がある間が編集モード
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [showMemo, setShowMemo] = useState(false)

  const startEdit = () => {
    setDraft({
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      category: task.category,
      memo: task.memo,
      subtasks: task.subtasks,
    })
  }

  const cancelEdit = () => setDraft(null)

  const saveEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!draft) return
    const title = draft.title.trim()
    if (!title) return
    onUpdate(task.id, { ...draft, title, memo: draft.memo.trim() })
    setDraft(null)
  }

  const classes = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`

  if (draft) {
    return (
      <li className={`${classes} editing`}>
        <form
          className="task-edit"
          onSubmit={saveEdit}
          onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
        >
          <input
            type="text"
            className="task-input"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            aria-label="タスク名"
            autoFocus
          />
          <MemoField value={draft.memo} onChange={(memo) => setDraft({ ...draft, memo })} />
          <div className="form-row">
            <TaskFields values={draft} onChange={setDraft} />
            <div className="edit-actions">
              <button type="button" className="cancel-button" onClick={cancelEdit}>
                キャンセル
              </button>
              <button type="submit" className="add-button" disabled={!draft.title.trim()}>
                保存
              </button>
            </div>
          </div>
          <div className="edit-subtasks">
            <span className="edit-subtasks-label">サブタスク</span>
            <SubtaskEditor
              subtasks={draft.subtasks}
              onChange={(subtasks) => setDraft({ ...draft, subtasks })}
            />
          </div>
        </form>
      </li>
    )
  }

  const progress = subtaskProgress(task)
  const dueStatus = getDueStatus(task, todayString())

  return (
    <li className={classes}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`「${task.title}」を${task.completed ? '未完了に戻す' : '完了にする'}`}
      />
      <div className="task-body">
        <span className="task-title" onClick={startEdit} title="クリックで編集">
          {task.title}
        </span>
        {task.memo && (
          <>
            <button
              type="button"
              className="memo-toggle"
              onClick={() => setShowMemo((v) => !v)}
              aria-expanded={showMemo}
              title={showMemo ? 'メモを閉じる' : 'クリックでメモ全文を表示'}
            >
              {showMemo ? '📝 メモ ▾' : `📝 ${task.memo}`}
            </button>
            {showMemo && <p className="memo-full">{task.memo}</p>}
          </>
        )}
        <div className="task-meta">
          <span className={`priority-badge priority-${task.priority}`}>
            優先度: {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`category-badge category-${task.category}`}>
            {CATEGORY_LABELS[task.category]}
          </span>
          {task.dueDate && (
            <span className={`due-date ${dueStatus}`}>
              期限: {formatDate(task.dueDate)}
              {dueStatus === 'overdue' && '(期限切れ)'}
              {dueStatus === 'today' && '(今日)'}
            </span>
          )}
          <button
            type="button"
            className="subtask-toggle"
            onClick={() => setShowSubtasks((v) => !v)}
            aria-expanded={showSubtasks}
          >
            {progress.total > 0 ? `☑ ${progress.done}/${progress.total} 完了` : '＋ サブタスク'}
            {progress.total > 0 && (showSubtasks ? ' ▾' : ' ▸')}
          </button>
        </div>
        {progress.total > 0 && (
          <span className="bar-track subtask-track" aria-hidden="true">
            <span className="bar-fill progress-fill" style={{ width: `${progress.percent}%` }} />
          </span>
        )}
        {showSubtasks && (
          <SubtaskEditor
            subtasks={task.subtasks}
            onChange={(subtasks) => onUpdate(task.id, { subtasks })}
          />
        )}
      </div>
      <div className="task-actions">
        <button
          type="button"
          className="edit-button"
          onClick={startEdit}
          aria-label={`「${task.title}」を編集`}
        >
          編集
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={() => onDelete(task.id)}
          aria-label={`「${task.title}」を削除`}
        >
          削除
        </button>
      </div>
    </li>
  )
}
