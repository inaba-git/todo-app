import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient.ts'
import { createSupabaseTasksApi } from './tasksApi.ts'
import { useSession } from './useSession.ts'
import { useTasks } from './useTasks.ts'
import TodoApp from './TodoApp.tsx'
import LoginScreen from './components/LoginScreen.tsx'
import LocalImportBanner from './components/LocalImportBanner.tsx'

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  )
}

// ログインしたあとの画面。タスクの保存先をアカウント(Supabase)にする
function SignedIn({ client, session }: { client: SupabaseClient; session: Session }) {
  const api = useMemo(() => createSupabaseTasksApi(client), [client])
  const store = useTasks(api)

  const handleSignOut = async () => {
    await store.flush() // 送信待ちの変更を保存してから、この端末だけログアウトする
    await client.auth.signOut({ scope: 'local' })
  }

  return (
    <TodoApp
      store={store}
      userEmail={session.user.email ?? null}
      onSignOut={handleSignOut}
      notices={<LocalImportBanner userId={session.user.id} store={store} />}
    />
  )
}

// ログインの有無で画面を切り替える: 未設定 → 設定案内 / 未ログイン → ログイン画面 / ログイン済み → ToDo
export default function App({ client = supabase }: { client?: SupabaseClient | null }) {
  const { session, loading } = useSession(client)

  if (!client) {
    return (
      <Message title="ToDoリスト">
        <p className="auth-error" role="alert">
          Supabase の接続情報が設定されていません。
        </p>
        <p className="auth-note">
          <code>.env</code> に <code>VITE_SUPABASE_URL</code> と{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> を設定し、開発サーバーを再起動してください
          (Netlify では環境変数を設定して再デプロイします)。
        </p>
      </Message>
    )
  }

  if (loading) {
    return (
      <Message title="ToDoリスト">
        <p className="sync-status" role="status">
          読み込んでいます…
        </p>
      </Message>
    )
  }

  if (!session) return <LoginScreen client={client} />

  return <SignedIn key={session.user.id} client={client} session={session} />
}
