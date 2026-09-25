import { useEffect, useState } from 'react'

// localStorage と同期する useState。読み込み・保存に失敗してもアプリは動き続ける。
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 容量超過やプライベートモードなどで保存できない場合は無視する
    }
  }, [key, value])

  return [value, setValue]
}
