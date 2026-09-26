/// <reference types="vite/client" />

// .env(Netlify では環境変数)に設定する Supabase の接続情報
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
