import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { vi } from 'vitest'
import { toRow } from '../taskRows.ts'
import type { TaskRow, TaskRowInput } from '../taskRows.ts'
import type { Task } from '../types.ts'

type AuthListener = (event: string, session: Session | null) => void

export const USER_ID = '11111111-1111-4111-8111-111111111111'

export function makeSession(email = 'user@example.com', id = USER_ID): Session {
  return { user: { id, email }, access_token: 'token' } as unknown as Session
}

// テスト用: Supabase クライアントの、このアプリが使う部分だけを模したもの。
// (RLS など DB 側の動きは再現しない。RLS は supabase/schema.sql で設定する)
export function createFakeSupabase({
  session = null,
  tasks = [],
}: { session?: Session | null; tasks?: Task[] } = {}) {
  let current = session
  const listeners = new Set<AuthListener>()
  const rows: TaskRow[] = tasks.map((t) => ({ ...toRow(t), user_id: USER_ID }))
  const errors: { signInWithOtp: { message: string; status?: number } | null } = {
    signInWithOtp: null,
  }

  const notify = (event: string) => listeners.forEach((listener) => listener(event, current))

  const auth = {
    getSession: vi.fn(async () => ({ data: { session: current }, error: null })),
    onAuthStateChange: vi.fn((listener: AuthListener) => {
      listeners.add(listener)
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }
    }),
    signInWithOtp: vi.fn(async (_credentials: unknown) => ({
      data: {},
      error: errors.signInWithOtp,
    })),
    signOut: vi.fn(async (_options?: unknown) => {
      current = null
      notify('SIGNED_OUT')
      return { error: null }
    }),
  }

  const table = {
    select: vi.fn(() => ({
      order: async () => ({
        data: [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)),
        error: null,
      }),
    })),
    insert: vi.fn(async (row: TaskRowInput) => {
      rows.push({ ...row, user_id: USER_ID })
      return { error: null }
    }),
    update: vi.fn((changes: Partial<TaskRowInput>) => ({
      eq: async (_column: string, id: string) => {
        const row = rows.find((r) => r.id === id)
        if (row) Object.assign(row, changes)
        return { error: null }
      },
    })),
    delete: vi.fn(() => ({
      eq: async (_column: string, id: string) => {
        remove([id])
        return { error: null }
      },
      in: async (_column: string, ids: string[]) => {
        remove(ids)
        return { error: null }
      },
    })),
    upsert: vi.fn(async (input: TaskRowInput[], _options?: unknown) => {
      const known = new Set(rows.map((r) => r.id))
      for (const row of input) if (!known.has(row.id)) rows.push({ ...row, user_id: USER_ID })
      return { error: null }
    }),
  }

  function remove(ids: string[]) {
    for (const id of ids) {
      const index = rows.findIndex((r) => r.id === id)
      if (index >= 0) rows.splice(index, 1)
    }
  }

  const client = { auth, from: vi.fn(() => table) } as unknown as SupabaseClient

  return {
    client,
    auth,
    table,
    rows,
    errors,
    /** メールのリンクからログインした状態にする */
    signIn(next: Session = makeSession()) {
      current = next
      notify('SIGNED_IN')
    },
  }
}
