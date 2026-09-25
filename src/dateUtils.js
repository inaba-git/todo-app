const pad = (n) => String(n).padStart(2, '0')

// ローカル日付の YYYY-MM-DD(toISOString は UTC になるため使わない)
export function toDateString(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

export function todayString() {
  const d = new Date()
  return toDateString(d.getFullYear(), d.getMonth(), d.getDate())
}

// YYYY-MM-DD に日数を足した YYYY-MM-DD(月またぎ・年またぎに対応)
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return toDateString(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}/${m}/${d}`
}

// タイムスタンプ(ミリ秒)をローカル日付の YYYY-MM-DD にする
export function timestampToDateString(timestamp) {
  const d = new Date(timestamp)
  return toDateString(d.getFullYear(), d.getMonth(), d.getDate())
}

// "2026-09-26" → "9/26"
export function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}/${d}`
}

// "2026-09-26" → "土"
export function weekdayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return '日月火水木金土'[new Date(y, m - 1, d).getDay()]
}
