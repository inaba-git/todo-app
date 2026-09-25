// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorage } from './useLocalStorage.ts'
import { createTask, normalizeTask, toggleTaskById } from './taskUtils.ts'
import type { StoredTask } from './types.ts'

const KEY = 'test.key'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('useLocalStorage: 読み込み', () => {
  it('保存データがなければ初期値を返す', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('保存データがあれば初期値ではなく保存されていた値を返す', () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 1, list: [1, 2] }))
    const { result } = renderHook(() => useLocalStorage(KEY, {}))
    expect(result.current[0]).toEqual({ a: 1, list: [1, 2] })
  })

  it('保存データが壊れた JSON でも落ちずに初期値を返す', () => {
    localStorage.setItem(KEY, '{not json')
    const { result } = renderHook(() => useLocalStorage(KEY, 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('localStorage が使えない環境(getItem が例外)でも初期値で動く', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { result } = renderHook(() => useLocalStorage(KEY, 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('false や 0 など「空っぽの値」も保存されていれば読み込む', () => {
    localStorage.setItem(KEY, 'false')
    const { result } = renderHook(() => useLocalStorage(KEY, true))
    expect(result.current[0]).toBe(false)
  })
})

describe('useLocalStorage: 保存', () => {
  it('値を更新すると JSON として localStorage に保存される', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>(KEY, []))
    act(() => result.current[1](['a', 'b']))
    expect(result.current[0]).toEqual(['a', 'b'])
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toEqual(['a', 'b'])
  })

  it('関数で更新できる(直前の値を受け取る)', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 1))
    act(() => result.current[1]((n) => n + 1))
    act(() => result.current[1]((n) => n + 1))
    expect(result.current[0]).toBe(3)
    expect(localStorage.getItem(KEY)).toBe('3')
  })

  it('初期値も保存される', () => {
    renderHook(() => useLocalStorage(KEY, { theme: 'light' }))
    expect(localStorage.getItem(KEY)).toBe('{"theme":"light"}')
  })

  it('キーごとに別々に保存される', () => {
    const one = renderHook(() => useLocalStorage('key.one', 'A'))
    const two = renderHook(() => useLocalStorage('key.two', 'B'))
    act(() => one.result.current[1]('A2'))
    expect(localStorage.getItem('key.one')).toBe('"A2"')
    expect(localStorage.getItem('key.two')).toBe('"B"')
    expect(two.result.current[0]).toBe('B')
  })

  it('保存に失敗(容量超過など)しても例外にならず、画面上の値は更新される', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })
    const { result } = renderHook(() => useLocalStorage(KEY, 'a'))
    expect(() => act(() => result.current[1]('b'))).not.toThrow()
    expect(result.current[0]).toBe('b')
  })
})

describe('タスクの保存と復元(再読み込みの想定)', () => {
  const TASKS_KEY = 'todo-app.tasks'

  it('追加・完了したタスクが、フックを作り直しても(再読み込み後も)残っている', () => {
    const first = renderHook(() => useLocalStorage<StoredTask[]>(TASKS_KEY, []))
    const task = createTask(
      { title: '保存されるタスク', dueDate: '2026-10-01', priority: 'high', category: 'job', memo: 'メモ' },
      { id: 't1', now: 100 }
    )
    act(() => first.result.current[1]((prev) => [...prev, task]))
    act(() => first.result.current[1]((prev) => toggleTaskById(prev, 't1', 200)))
    first.unmount()

    const second = renderHook(() => useLocalStorage<StoredTask[]>(TASKS_KEY, []))
    expect(second.result.current[0]).toEqual([
      { ...task, completed: true, completedAt: 200 },
    ])
  })

  it('古い形式で保存されたタスクは、読み込み後に normalizeTask で補完できる', () => {
    localStorage.setItem(
      TASKS_KEY,
      JSON.stringify([
        { id: 'old', title: '古いタスク', dueDate: '', priority: 'low', completed: true, createdAt: 50 },
      ])
    )
    const { result } = renderHook(() => useLocalStorage<StoredTask[]>(TASKS_KEY, []))
    expect(result.current[0].map(normalizeTask)).toEqual([
      {
        id: 'old',
        title: '古いタスク',
        dueDate: '',
        priority: 'low',
        completed: true,
        createdAt: 50,
        category: 'other',
        subtasks: [],
        memo: '',
        completedAt: 50,
      },
    ])
  })
})
