// 追加フォームと編集フォームで共通のメモ入力欄(複数行)
interface MemoFieldProps {
  value: string
  onChange: (value: string) => void
}

export default function MemoField({ value, onChange }: MemoFieldProps) {
  return (
    <textarea
      className="memo-input"
      rows={2}
      placeholder="メモ・詳細(任意)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="メモ"
    />
  )
}
