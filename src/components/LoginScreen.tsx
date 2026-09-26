import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

type SendState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string }

// メールのリンクが期限切れなどのとき、Supabase は #error=...&error_description=... 付きで戻してくる
function readLinkError(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (!params.has('error')) return null
  if (params.get('error_code') === 'otp_expired') {
    return 'ログインリンクの有効期限が切れているか、すでに使用済みです。もう一度リンクを送信してください。'
  }
  return `ログインに失敗しました(${params.get('error_description') ?? params.get('error')})。もう一度お試しください。`
}

function sendErrorMessage(error: { message: string; status?: number }): string {
  if (error.status === 429 || /rate limit/i.test(error.message)) {
    return 'メールの送信回数の上限に達しました。しばらく待ってからもう一度お試しください。'
  }
  return `メールを送信できませんでした(${error.message})。`
}

// ログインしていないときの画面。メールアドレスを入力すると、ログイン用のリンクが届く(パスワード不要)
export default function LoginScreen({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<SendState>({ kind: 'idle' })
  const [linkError] = useState(readLinkError)

  // エラー表示のあとは URL からエラー情報を消す(再読み込みで同じ表示が続かないように)
  useEffect(() => {
    if (window.location.hash.includes('error')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const address = email.trim()
    if (!address) return
    setState({ kind: 'sending' })
    const { error } = await client.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    })
    setState(error ? { kind: 'error', message: sendErrorMessage(error) } : { kind: 'sent', email: address })
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <h1>ToDoリスト</h1>

        {state.kind === 'sent' ? (
          <div className="auth-sent" role="status">
            <p>
              <strong>{state.email}</strong> にログイン用のリンクを送信しました。
            </p>
            <p className="auth-note">
              メールを開いてリンクをクリックしてください。届かないときは迷惑メールフォルダも確認してください。
            </p>
            <button type="button" className="link-button" onClick={() => setState({ kind: 'idle' })}>
              別のメールアドレスで送信する
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-note">
              メールアドレスを入力すると、ログイン用のリンクをお送りします(パスワードは不要です)。
            </p>
            {linkError && (
              <p className="auth-error" role="alert">
                {linkError}
              </p>
            )}
            <label>
              メールアドレス
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            {state.kind === 'error' && (
              <p className="auth-error" role="alert">
                {state.message}
              </p>
            )}
            <button
              type="submit"
              className="add-button auth-submit"
              disabled={state.kind === 'sending' || !email.trim()}
            >
              {state.kind === 'sending' ? '送信中…' : 'ログインリンクを送信'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
