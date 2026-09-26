import { useState } from 'react'
import { isLocalImportHandled, markLocalImportHandled, readLocalTasks } from '../localTasks.ts'
import type { TaskStore } from '../useTasks.ts'

// ログイン機能の追加前に、この端末に保存されていたタスクがあれば、アカウントへの取り込みを確認する。
// どちらを選んでも、この端末のデータ自体は削除しない。
export default function LocalImportBanner({ userId, store }: { userId: string; store: TaskStore }) {
  const [localTasks] = useState(() => (isLocalImportHandled(userId) ? [] : readLocalTasks()))
  const [handled, setHandled] = useState(false)
  const [busy, setBusy] = useState(false)

  if (store.status !== 'ready' || handled || localTasks.length === 0) return null

  const finish = () => {
    markLocalImportHandled(userId)
    setHandled(true)
  }

  const handleImport = async () => {
    setBusy(true)
    const ok = await store.importTasks(localTasks)
    setBusy(false)
    if (ok) finish() // 失敗したときはエラーが表示され、もう一度試せる
  }

  return (
    <div className="notice" role="region" aria-label="この端末のタスクの取り込み">
      <p>
        この端末に保存されているタスクが <strong>{localTasks.length}件</strong>{' '}
        あります。アカウントに取り込みますか?
        <span className="notice-sub">(どちらを選んでも、この端末のデータは削除されません)</span>
      </p>
      <div className="notice-actions">
        <button type="button" className="add-button" onClick={handleImport} disabled={busy}>
          {busy ? '取り込み中…' : '取り込む'}
        </button>
        <button type="button" className="cancel-button" onClick={finish} disabled={busy}>
          取り込まない
        </button>
      </div>
    </div>
  )
}
