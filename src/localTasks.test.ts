// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isLocalImportHandled,
  LOCAL_TASKS_KEY,
  markLocalImportHandled,
  readLocalTasks,
} from './localTasks.ts'

const ID = '33333333-3333-4333-8333-333333333333'
const legacy = {
  id: ID,
  title: '古いタスク',
  completed: true,
  dueDate: '2026-10-01',
  priority: 'high',
  createdAt: 1000,
}

beforeEach(() => {
  localStorage.clear()
})

describe('readLocalTasks', () => {
  it('保存されていなければ空配列', () => {
    expect(readLocalTasks()).toEqual([])
  })

  it('古い形式のタスクを、取り込める形に補完して返す(完了日時は推測で埋めない)', () => {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify([legacy]))
    expect(readLocalTasks()).toEqual([
      {
        ...legacy,
        category: 'other',
        subtasks: [],
        memo: '',
        completedAt: null,
      },
    ])
  })

  it('記録されていた完了日時はそのまま使う', () => {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify([{ ...legacy, completedAt: 5000 }]))
    expect(readLocalTasks()[0].completedAt).toBe(5000)
  })

  it('DB の id(uuid)にできないもの・壊れたタスクは除外する', () => {
    localStorage.setItem(
      LOCAL_TASKS_KEY,
      JSON.stringify([
        legacy,
        { ...legacy, id: 'not-a-uuid' },
        { ...legacy, id: '44444444-4444-4444-8444-444444444444', title: '   ' },
        { ...legacy, id: '55555555-5555-4555-8555-555555555555', priority: 'urgent' },
        { ...legacy, id: '66666666-6666-4666-8666-666666666666', dueDate: '10/01' },
        null,
        'text',
      ])
    )
    expect(readLocalTasks().map((t) => t.id)).toEqual([ID])
  })

  it('壊れた JSON や配列でない値でも例外にならず空配列', () => {
    localStorage.setItem(LOCAL_TASKS_KEY, '{not json')
    expect(readLocalTasks()).toEqual([])
    localStorage.setItem(LOCAL_TASKS_KEY, '{"a":1}')
    expect(readLocalTasks()).toEqual([])
  })

  it('localStorage が使えなくても空配列', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readLocalTasks()).toEqual([])
  })
})

describe('取り込み確認の記録', () => {
  it('ユーザーごとに記録され、他のユーザーには影響しない', () => {
    expect(isLocalImportHandled('user-a')).toBe(false)
    markLocalImportHandled('user-a')
    expect(isLocalImportHandled('user-a')).toBe(true)
    expect(isLocalImportHandled('user-b')).toBe(false)
  })

  it('記録できない環境でも例外にならない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => markLocalImportHandled('user-a')).not.toThrow()
  })
})
