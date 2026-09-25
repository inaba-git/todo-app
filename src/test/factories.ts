import type { Task } from '../types.ts'

let counter = 0

// テスト用の Task を作る。指定しなかった項目は無難な初期値になる
export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1
  return {
    id: `task-${counter}`,
    title: `タスク${counter}`,
    dueDate: '',
    priority: 'medium',
    category: 'other',
    memo: '',
    subtasks: [],
    completed: false,
    completedAt: null,
    createdAt: counter,
    ...overrides,
  }
}
