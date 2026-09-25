import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  formatDate,
  shortDate,
  timestampToDateString,
  toDateString,
  todayString,
  weekdayLabel,
} from './dateUtils.ts'

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('toDateString: 月・日を 2 桁にそろえる(月は 0 始まり)', () => {
    expect(toDateString(2026, 0, 5)).toBe('2026-01-05')
    expect(toDateString(2026, 11, 31)).toBe('2026-12-31')
  })

  it('todayString: UTC ではなくローカルの日付を返す', () => {
    // ローカル時刻で 23:59 でも、日付は翌日にならない
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 26, 23, 59))
    expect(todayString()).toBe('2026-09-26')
    vi.setSystemTime(new Date(2026, 8, 27, 0, 0))
    expect(todayString()).toBe('2026-09-27')
  })

  describe('addDays', () => {
    it('日数を足せる(負の数で引ける)', () => {
      expect(addDays('2026-09-26', 6)).toBe('2026-10-02')
      expect(addDays('2026-09-26', -6)).toBe('2026-09-20')
      expect(addDays('2026-09-26', 0)).toBe('2026-09-26')
    })

    it('月またぎ・年またぎ・閏年に対応する', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
      expect(addDays('2026-12-30', 6)).toBe('2027-01-05')
      expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    })
  })

  it('formatDate: YYYY/MM/DD にする', () => {
    expect(formatDate('2026-09-26')).toBe('2026/09/26')
  })

  it('shortDate: 月/日(0 埋めなし)にする', () => {
    expect(shortDate('2026-09-06')).toBe('9/6')
    expect(shortDate('2026-12-31')).toBe('12/31')
  })

  it('weekdayLabel: 曜日を返す', () => {
    expect(weekdayLabel('2026-09-26')).toBe('土')
    expect(weekdayLabel('2026-09-27')).toBe('日')
    expect(weekdayLabel('2026-09-28')).toBe('月')
  })

  it('timestampToDateString: ローカル日付の YYYY-MM-DD にする', () => {
    expect(timestampToDateString(new Date(2026, 8, 26, 0, 0).getTime())).toBe('2026-09-26')
    expect(timestampToDateString(new Date(2026, 8, 26, 23, 59).getTime())).toBe('2026-09-26')
  })
})
