import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

// localStorage と同期する useState。読み込み・保存に失敗してもアプリは動き続ける。
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) as T : initialValue
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
