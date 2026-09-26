import { describe, expect, it } from 'vitest'
import { fromRow, toRow, toRowChanges } from './taskRows.ts'
import type { TaskRow } from './taskRows.ts'
import { makeTask } from './test/factories.ts'

const CREATED = Date.UTC(2026, 8, 26, 3, 4, 5, 678) // ミリ秒まで含めて往復できること
const COMPLETED = Date.UTC(2026, 8, 27, 10, 0, 0, 1)

describe('toRow (Task → DB の行)', () => {
  const task = makeTask({
    id: '22222222-2222-4222-8222-222222222222',
    title: 'レポート',
    dueDate: '2026-10-01',
    priority: 'high',
    category: 'class',
    memo: 'メモ',
    subtasks: [{ id: 's1', title: '下書き', completed: true }],
    completed: true,
    completedAt: COMPLETED,
    createdAt: CREATED,
  })

  it('各項目を DB の列名・型に変換する(時刻は ISO 文字列)', () => {
    expect(toRow(task)).toEqual({
      id: task.id,
      title: 'レポート',
      due_date: '2026-10-01',
      priority: 'high',
      category: 'class',
      memo: 'メモ',
      subtasks: [{ id: 's1', title: '下書き', completed: true }],
      completed: true,
      completed_at: '2026-09-27T10:00:00.001Z',
      created_at: '2026-09-26T03:04:05.678Z',
    })
  })

  it('期限なし(空文字)と未完了(completedAt なし)は NULL になる', () => {
    const row = toRow(makeTask({ dueDate: '', completedAt: null }))
    expect(row.due_date).toBeNull()
    expect(row.completed_at).toBeNull()
  })

  it('user_id は含めない(DB 側が auth.uid() を入れる。アプリから他人の id は指定できない)', () => {
    expect('user_id' in toRow(task)).toBe(false)
  })
})

describe('fromRow (DB の行 → Task)', () => {
  const row: TaskRow = {
    id: 'abc',
    user_id: 'someone',
    title: 'タスク',
    due_date: null,
    priority: 'low',
    category: 'job',
    memo: '',
    subtasks: [],
    completed: false,
    completed_at: null,
    created_at: '2026-09-26T03:04:05.678Z',
  }

  it('期限なしは空文字、時刻はミリ秒に戻る', () => {
    expect(fromRow(row)).toEqual({
      id: 'abc',
      title: 'タスク',
      dueDate: '',
      priority: 'low',
      category: 'job',
      memo: '',
      subtasks: [],
      completed: false,
      completedAt: null,
      createdAt: CREATED,
    })
  })

  it('user_id はアプリ側の Task には持ち込まない', () => {
    expect('user_id' in fromRow(row)).toBe(false)
  })

  it('subtasks が配列でなければ空配列にする', () => {
    expect(fromRow({ ...row, subtasks: null as never }).subtasks).toEqual([])
  })

  it('toRow → fromRow で元の Task に戻る', () => {
    const task = makeTask({
      dueDate: '2026-12-31',
      completed: true,
      completedAt: COMPLETED,
      createdAt: CREATED,
      subtasks: [{ id: 's', title: 'x', completed: false }],
    })
    expect(fromRow(toRow(task) as TaskRow)).toEqual(task)
  })
})

describe('toRowChanges (更新する項目 → DB の列)', () => {
  it('指定された項目だけを列名に直して返す', () => {
    expect(toRowChanges({ title: '新しい名前', dueDate: '2026-11-01' })).toEqual({
      title: '新しい名前',
      due_date: '2026-11-01',
    })
  })

  it('期限日を空にする変更は NULL にする', () => {
    expect(toRowChanges({ dueDate: '' })).toEqual({ due_date: null })
  })

  it('完了の切り替え(completed と completedAt)', () => {
    expect(toRowChanges({ completed: true, completedAt: COMPLETED })).toEqual({
      completed: true,
      completed_at: '2026-09-27T10:00:00.001Z',
    })
    expect(toRowChanges({ completed: false, completedAt: null })).toEqual({
      completed: false,
      completed_at: null,
    })
  })

  it('優先度・カテゴリ・メモ・サブタスクも変換できる', () => {
    const subtasks = [{ id: 's', title: 'x', completed: true }]
    expect(toRowChanges({ priority: 'low', category: 'research', memo: 'm', subtasks })).toEqual({
      priority: 'low',
      category: 'research',
      memo: 'm',
      subtasks,
    })
  })

  it('何も指定しなければ空のオブジェクト', () => {
    expect(toRowChanges({})).toEqual({})
  })

  it('id は更新の対象にならない(Task の changes に含まれない)', () => {
    expect('id' in toRowChanges({ title: 'x' })).toBe(false)
  })
})
