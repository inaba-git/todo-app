// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY, useTheme } from './useTheme.ts'

// jsdom には matchMedia がないので、OS の設定(ダークかどうか)を差し替えて使う
function mockSystemDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: dark && query.includes('dark') }))
  )
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useTheme', () => {
  it('初回は OS の設定に合わせる(ダーク)', () => {
    mockSystemDark(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('初回は OS の設定に合わせる(ライト)', () => {
    mockSystemDark(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('matchMedia が使えない環境ではライトになる', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('light')
  })

  it('保存されたテーマが OS の設定より優先される', () => {
    mockSystemDark(true)
    localStorage.setItem(THEME_KEY, JSON.stringify('light'))
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('壊れた値が保存されていてもライトとして動く', () => {
    mockSystemDark(false)
    localStorage.setItem(THEME_KEY, JSON.stringify('rainbow'))
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('light')
  })

  it('切り替えるとテーマが反転し、<html> と localStorage に反映される', () => {
    mockSystemDark(false)
    const { result } = renderHook(() => useTheme())

    act(() => result.current[1]())
    expect(result.current[0]).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('"dark"')

    act(() => result.current[1]())
    expect(result.current[0]).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('"light"')
  })

  it('切り替えたテーマは、次に開いたときにも引き継がれる', () => {
    mockSystemDark(false)
    const first = renderHook(() => useTheme())
    act(() => first.result.current[1]())
    first.unmount()

    const second = renderHook(() => useTheme())
    expect(second.result.current[0]).toBe('dark')
  })
})
