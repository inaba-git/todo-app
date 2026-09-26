import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

// ログイン中のセッションを返す。loading は「ログイン済みかどうかがまだ分からない間」。
// メールのリンクから戻ってきたとき(URL のトークン)の処理は supabase-js が行い、
// 完了すると onAuthStateChange で通知される。
export function useSession(client: SupabaseClient | null): {
  session: Session | null
  loading: boolean
} {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(client !== null)

  useEffect(() => {
    if (!client) return
    let active = true

    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {
        // 取得できなければ未ログイン扱いにする
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  return { session, loading }
}
