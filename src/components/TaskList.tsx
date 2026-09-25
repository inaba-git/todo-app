import TaskItem from './TaskItem.tsx'
import type { Task, TaskHandlers } from '../types.ts'

interface TaskListProps extends TaskHandlers {
  tasks: Task[]
  emptyMessage: string
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onUpdate,
  emptyMessage,
}: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty">{emptyMessage}</p>
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </ul>
  )
}
