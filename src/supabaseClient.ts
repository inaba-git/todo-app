import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// 接続情報は .env(本番は Netlify の環境変数)から読む。Vite はビルド時に値を埋め込むので、
// ブラウザに渡ってよい publishable key だけを設定すること(secret key / service_role key は不可)。
const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 未設定なら null(アプリ側で設定手順を表示する)
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null
