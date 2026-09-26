// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'
import { LOCAL_TASKS_KEY } from './localTasks.ts'
import { createFakeSupabase, makeSession, USER_ID } from './test/fakeSupabase.ts'
import { makeTask } from './test/factories.ts'

const ID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const emailInput = () => screen.getByLabelText('メールアドレス')
const sendButton = () => screen.getByRole('button', { name: /ログインリンクを送信|送信中/ })

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('接続情報が未設定のとき', () => {
  it('設定方法を案内し、ログイン画面もタスク画面も出さない', () => {
    render(<App client={null} />)
    expect(screen.getByRole('alert').textContent).toContain('接続情報が設定されていません')
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeTruthy()
    expect(screen.queryByLabelText('メールアドレス')).toBeNull()
  })
})

describe('ログインしていないとき', () => {
  it('ログイン画面(メールアドレス入力欄のみ)を表示し、タスクの画面は出さない', async () => {
    const { client } = createFakeSupabase()
    render(<App client={client} />)
    expect(await screen.findByLabelText('メールアドレス')).toBeTruthy()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByPlaceholderText('新しいタスクを入力…')).toBeNull()
    expect(screen.queryByText('ログアウト')).toBeNull()
  })

  it('確認中(ログイン済みかどうか不明な間)は、ログイン画面を出さずに読み込み中と表示する', () => {
    const { client, auth } = createFakeSupabase()
    auth.getSession.mockReturnValue(new Promise(() => {})) // いつまでも終わらない
    render(<App client={client} />)
    expect(screen.getByRole('status').textContent).toContain('読み込んでいます')
    expect(screen.queryByLabelText('メールアドレス')).toBeNull()
  })

  it('メールアドレスを入力すると、マジックリンクの送信を依頼する(前後の空白は除く)', async () => {
    const { client, auth } = createFakeSupabase()
    render(<App client={client} />)
    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: '  me@example.com ' },
    })
    fireEvent.click(sendButton())

    await screen.findByText(/にログイン用のリンクを送信しました/)
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(1)
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      options: { emailRedirectTo: window.location.origin },
    })
    expect(screen.getByText('me@example.com')).toBeTruthy()
  })

  it('送信後は「別のメールアドレスで送信する」で入力欄に戻れる', async () => {
    const { client } = createFakeSupabase()
    render(<App client={client} />)
    fireEvent.change(await screen.findByLabelText('メールアドレス'), { target: { value: 'a@example.com' } })
    fireEvent.click(sendButton())
    fireEvent.click(await screen.findByRole('button', { name: '別のメールアドレスで送信する' }))
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy()
  })

  it('入力が空の間は送信できない', async () => {
    const { client } = createFakeSupabase()
    render(<App client={client} />)
    await screen.findByLabelText('メールアドレス')
    expect((sendButton() as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(emailInput(), { target: { value: 'a@example.com' } })
    expect((sendButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it('送信回数の上限に達したときは、待つよう案内する', async () => {
    const { client, errors } = createFakeSupabase()
    errors.signInWithOtp = { message: 'email rate limit exceeded', status: 429 }
    render(<App client={client} />)
    fireEvent.change(await screen.findByLabelText('メールアドレス'), { target: { value: 'a@example.com' } })
    fireEvent.click(sendButton())
    expect((await screen.findByRole('alert')).textContent).toContain('上限に達しました')
  })

  it('その他の送信エラーは、内容を表示する。入力は残り、もう一度送れる', async () => {
    const { client, errors } = createFakeSupabase()
    errors.signInWithOtp = { message: 'Signups not allowed for this instance' }
    render(<App client={client} />)
    fireEvent.change(await screen.findByLabelText('メールアドレス'), { target: { value: 'me@example.com' } })
    fireEvent.click(sendButton())
    expect((await screen.findByRole('alert')).textContent).toContain('Signups not allowed for this instance')
    expect((emailInput() as HTMLInputElement).value).toBe('me@example.com')
    expect((sendButton() as HTMLButtonElement).disabled).toBe(false) // もう一度送れる
  })

  it('期限切れのリンクで戻ってきたときは、その旨を表示し、URL からエラーを消す', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'
    const { client } = createFakeSupabase()
    render(<App client={client} />)
    expect((await screen.findByRole('alert')).textContent).toContain('有効期限が切れているか')
    expect(window.location.hash).toBe('')
  })
})

describe('ログインしたあと', () => {
  it('リンクからログインすると(セッションができると)、ログイン画面からタスク画面に切り替わる', async () => {
    const fake = createFakeSupabase()
    render(<App client={fake.client} />)
    await screen.findByLabelText('メールアドレス')
    act(() => fake.signIn(makeSession('me@example.com')))
    expect(await screen.findByPlaceholderText('新しいタスクを入力…')).toBeTruthy()
    expect(screen.queryByLabelText('メールアドレス')).toBeNull()
  })

  it('保存済みのセッションがあれば、ログイン画面を出さずにタスクを表示する', async () => {
    const fake = createFakeSupabase({
      session: makeSession('me@example.com'),
      tasks: [makeTask({ id: ID_A, title: 'アカウントに保存されたタスク' })],
    })
    render(<App client={fake.client} />)
    expect(await screen.findByText('アカウントに保存されたタスク')).toBeTruthy()
    expect(screen.getByText('me@example.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy()
    expect(fake.client.from).toHaveBeenCalledWith('tasks')
  })

  it('タスクの保存先は Supabase。追加しても localStorage には保存しない', async () => {
    const fake = createFakeSupabase({ session: makeSession() })
    render(<App client={fake.client} />)
    fireEvent.change(await screen.findByPlaceholderText('新しいタスクを入力…'), {
      target: { value: '新しいタスク' },
    })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    expect(await screen.findByText('新しいタスク')).toBeTruthy()
    await waitFor(() => expect(fake.rows.map((r) => r.title)).toEqual(['新しいタスク']))
    const sent = fake.table.insert.mock.calls[0][0]
    expect('user_id' in sent).toBe(false) // 誰のタスクかは DB 側(auth.uid())が決める
    expect(fake.rows[0].user_id).toBe(USER_ID)
    expect(localStorage.getItem(LOCAL_TASKS_KEY)).toBeNull()
  })

  it('読み込みに失敗したら、エラーと再試行ボタンを表示する', async () => {
    const fake = createFakeSupabase({
      session: makeSession(),
      tasks: [makeTask({ id: ID_A, title: '再試行で読める' })],
    })
    fake.table.select.mockImplementationOnce((() => ({
      order: async () => ({ data: null, error: { message: 'connection refused' } }),
    })) as never)
    render(<App client={fake.client} />)
    expect((await screen.findByRole('alert')).textContent).toContain('connection refused')

    fireEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }))
    expect(await screen.findByText('再試行で読める')).toBeTruthy()
  })
})

describe('ログアウト', () => {
  it('ログアウトするとログイン画面に戻る。この端末だけをログアウトする', async () => {
    const fake = createFakeSupabase({ session: makeSession() })
    render(<App client={fake.client} />)
    fireEvent.click(await screen.findByRole('button', { name: 'ログアウト' }))

    expect(await screen.findByLabelText('メールアドレス')).toBeTruthy()
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(screen.queryByPlaceholderText('新しいタスクを入力…')).toBeNull()
  })

  it('保存前の編集があっても、ログアウトの前に保存する', async () => {
    const fake = createFakeSupabase({
      session: makeSession(),
      tasks: [makeTask({ id: ID_A, title: '編集前' })],
    })
    render(<App client={fake.client} />)
    fireEvent.click(await screen.findByText('編集前'))
    const titleInputs = screen.getAllByLabelText('タスク名') // 追加フォームと編集フォーム
    fireEvent.change(titleInputs[titleInputs.length - 1], { target: { value: '編集後' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' })) // 送信待ちのうちにログアウト
    await screen.findByLabelText('メールアドレス')
    expect(fake.rows[0].title).toBe('編集後')
    // 保存(update)が、ログアウト(signOut)より前に行われている
    expect(fake.table.update.mock.invocationCallOrder[0]).toBeLessThan(
      fake.auth.signOut.mock.invocationCallOrder[0]
    )
  })
})

describe('この端末に保存されていたタスクの取り込み', () => {
  const local = [
    { id: ID_A, title: '端末のタスク1', completed: false, dueDate: '', priority: 'high', createdAt: 1000 },
    { id: ID_B, title: '端末のタスク2', completed: true, dueDate: '2026-10-01', priority: 'low', createdAt: 2000 },
  ]
  const importButton = () => screen.findByRole('button', { name: '取り込む' })

  beforeEach(() => {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(local))
  })

  it('端末にタスクがあれば、件数を示して取り込むか確認する', async () => {
    const fake = createFakeSupabase({ session: makeSession() })
    render(<App client={fake.client} />)
    await importButton()
    expect(screen.getByRole('region', { name: 'この端末のタスクの取り込み' }).textContent).toContain('2件')
    expect(screen.queryByText('端末のタスク1')).toBeNull() // 取り込むまでは表示しない
  })

  it('「取り込む」でアカウントに追加され、画面にも表示される。端末のデータは消えない', async () => {
    const fake = createFakeSupabase({ session: makeSession() })
    render(<App client={fake.client} />)
    fireEvent.click(await importButton())

    expect(await screen.findByText('端末のタスク1')).toBeTruthy()
    await waitFor(() => expect(fake.rows).toHaveLength(2))
    expect(fake.rows.find((r) => r.id === ID_B)).toMatchObject({ completed: true, due_date: '2026-10-01' })
    expect(screen.queryByRole('region', { name: 'この端末のタスクの取り込み' })).toBeNull()
    expect(JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) ?? '[]')).toHaveLength(2)
  })

  it('一度選んだら、次にログインしたときは確認しない', async () => {
    const fake = createFakeSupabase({ session: makeSession() })
    const first = render(<App client={fake.client} />)
    fireEvent.click(await importButton())
    await screen.findByText('端末のタスク1')
    first.unmount()

    render(<App client={fake.client} />)
    await screen.findByText('端末のタスク1')
    expect(screen.queryByRole('region', { name: 'この端末のタスクの取り込み' })).toBeNull()
  })

  it('「取り込まない」を選ぶとアカウントには何も追加されず、もう確認しない', async () => {
    const fake = createFakeSupabase({ session: makeSession() })
    const first = render(<App client={fake.client} />)
    fireEvent.click(await screen.findByRole('button', { name: '取り込まない' }))
    expect(screen.queryByRole('region', { name: 'この端末のタスクの取り込み' })).toBeNull()
    expect(fake.rows).toHaveLength(0)
    expect(fake.table.upsert).not.toHaveBeenCalled()
    first.unmount()

    render(<App client={fake.client} />)
    await screen.findByPlaceholderText('新しいタスクを入力…')
    expect(screen.queryByRole('region', { name: 'この端末のタスクの取り込み' })).toBeNull()
  })

  it('端末にタスクがなければ、何も確認しない', async () => {
    localStorage.removeItem(LOCAL_TASKS_KEY)
    const fake = createFakeSupabase({ session: makeSession() })
    render(<App client={fake.client} />)
    await screen.findByPlaceholderText('新しいタスクを入力…')
    expect(screen.queryByRole('region', { name: 'この端末のタスクの取り込み' })).toBeNull()
  })
})
