// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TodoApp from './TodoApp.tsx'
import { useTasks } from './useTasks.ts'
import { createMemoryTasksApi } from './test/memoryApi.ts'
import { makeTask } from './test/factories.ts'
import type { TasksApi } from './tasksApi.ts'
import type { Task } from './types.ts'

const STATS_KEY = 'todo-app.statsOpen.v2'
const FILTERS_KEY = 'todo-app.filtersOpen'

const statsToggle = () => screen.getByRole('button', { name: /統計/ })
const filterToggle = () => screen.getByRole('button', { name: /検索・絞り込み/ })
const isOpen = (button: HTMLElement) => button.getAttribute('aria-expanded') === 'true'
const searchBox = () => screen.queryByLabelText('タスク名で検索')

// 保存先はメモリ上の偽物(通信なし)。ログイン後の画面(TodoApp)だけをテストする
function Harness({ api }: { api: TasksApi }) {
  const store = useTasks(api)
  return <TodoApp store={store} userEmail="user@example.com" onSignOut={() => {}} />
}

// 読み込みが終わって画面が出るまで待つ
async function renderApp(tasks: Task[] = []) {
  const api = createMemoryTasksApi(tasks)
  const view = render(<Harness api={api} />)
  await screen.findByRole('button', { name: /統計/ })
  return { ...view, api }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('初期表示', () => {
  it('統計と検索・絞り込みは、初めて開いたときは折りたたまれている', async () => {
    await renderApp()
    expect(isOpen(statsToggle())).toBe(false)
    expect(isOpen(filterToggle())).toBe(false)
    expect(screen.queryByText('全体の完了率')).toBeNull()
    expect(searchBox()).toBeNull()
    expect(screen.queryByLabelText('優先度で絞り込み')).toBeNull()
    expect(screen.queryByLabelText('カテゴリで絞り込み')).toBeNull()
    expect(screen.queryByLabelText('並び替え')).toBeNull()
  })

  it('折りたたみ中でも、統計は完了率の要約が見える', async () => {
    await renderApp()
    expect(statsToggle().textContent).toContain('完了 0%')
  })

  it('折りたたみ中でも、検索・絞り込みはラベル(とアイコン)が見える', async () => {
    await renderApp()
    expect(filterToggle().textContent).toContain('🔍')
    expect(filterToggle().textContent).toContain('検索・絞り込み')
  })

  it('タスクの一覧や追加フォームは、折りたたみに関係なく表示される', async () => {
    await renderApp([makeTask({ title: '表示されるタスク' })])
    expect(screen.getByText('表示されるタスク')).toBeTruthy()
    expect(screen.getByPlaceholderText('新しいタスクを入力…')).toBeTruthy()
  })

  it('以前のバージョンが保存した「統計は開いている」という値には引きずられない', async () => {
    localStorage.setItem('todo-app.statsOpen', 'true')
    await renderApp()
    expect(isOpen(statsToggle())).toBe(false)
  })
})

describe('統計の開閉', () => {
  it('クリックで開くと内容が表示され、状態が保存される', async () => {
    await renderApp()
    fireEvent.click(statsToggle())
    expect(isOpen(statsToggle())).toBe(true)
    expect(screen.getByText('全体の完了率')).toBeTruthy()
    expect(localStorage.getItem(STATS_KEY)).toBe('true')
  })

  it('開いたまま閉じて開き直しても(再読み込みしても)開いたまま', async () => {
    const first = await renderApp()
    fireEvent.click(statsToggle())
    first.unmount()

    await renderApp()
    expect(isOpen(statsToggle())).toBe(true)
    expect(screen.getByText('全体の完了率')).toBeTruthy()
  })

  it('もう一度クリックすると折りたたまれ、その状態も保存される', async () => {
    const first = await renderApp()
    fireEvent.click(statsToggle())
    fireEvent.click(statsToggle())
    expect(localStorage.getItem(STATS_KEY)).toBe('false')
    first.unmount()

    await renderApp()
    expect(isOpen(statsToggle())).toBe(false)
  })
})

describe('検索・絞り込みの開閉', () => {
  it('クリックで開くと検索・絞り込み・並び替えが表示され、状態が保存される', async () => {
    await renderApp()
    fireEvent.click(filterToggle())
    expect(isOpen(filterToggle())).toBe(true)
    expect(searchBox()).toBeTruthy()
    expect(screen.getByLabelText('優先度で絞り込み')).toBeTruthy()
    expect(screen.getByLabelText('カテゴリで絞り込み')).toBeTruthy()
    expect(screen.getByLabelText('並び替え')).toBeTruthy()
    expect(localStorage.getItem(FILTERS_KEY)).toBe('true')
  })

  it('開いたままにした状態は、次に開いたときも維持される', async () => {
    const first = await renderApp()
    fireEvent.click(filterToggle())
    first.unmount()

    await renderApp()
    expect(isOpen(filterToggle())).toBe(true)
    expect(searchBox()).toBeTruthy()
  })

  it('もう一度クリックすると折りたたまれ、その状態も保存される', async () => {
    const first = await renderApp()
    fireEvent.click(filterToggle())
    fireEvent.click(filterToggle())
    expect(localStorage.getItem(FILTERS_KEY)).toBe('false')
    first.unmount()

    await renderApp()
    expect(isOpen(filterToggle())).toBe(false)
    expect(searchBox()).toBeNull()
  })

  it('統計と検索・絞り込みの開閉は、それぞれ独立している', async () => {
    await renderApp()
    fireEvent.click(filterToggle())
    expect(isOpen(statsToggle())).toBe(false)
    fireEvent.click(statsToggle())
    fireEvent.click(filterToggle())
    expect(isOpen(statsToggle())).toBe(true)
    expect(isOpen(filterToggle())).toBe(false)
  })
})

describe('折りたたんでも検索・絞り込みは機能する', () => {
  const tasks = [
    makeTask({ title: '論文を読む', category: 'research' }),
    makeTask({ title: '部屋の掃除', category: 'other' }),
  ]

  it('開いて検索すると一覧が絞り込まれる', async () => {
    await renderApp(tasks)
    fireEvent.click(filterToggle())
    fireEvent.change(searchBox()!, { target: { value: '論文' } })
    expect(screen.getByText('論文を読む')).toBeTruthy()
    expect(screen.queryByText('部屋の掃除')).toBeNull()
  })

  it('条件が効いたまま折りたたむと「絞り込み中」と表示され、一覧は絞り込まれたまま', async () => {
    await renderApp(tasks)
    expect(screen.queryByText('絞り込み中')).toBeNull()

    fireEvent.click(filterToggle())
    fireEvent.change(searchBox()!, { target: { value: '論文' } })
    expect(screen.queryByText('絞り込み中')).toBeNull() // 開いている間は表示しない

    fireEvent.click(filterToggle())
    expect(screen.getByText('絞り込み中')).toBeTruthy()
    expect(screen.queryByText('部屋の掃除')).toBeNull()

    // 開き直すと、入力していた条件がそのまま残っている
    fireEvent.click(filterToggle())
    expect((searchBox() as HTMLInputElement).value).toBe('論文')
  })

  it('「条件をクリア」で全件に戻り、「絞り込み中」も消える', async () => {
    await renderApp(tasks)
    fireEvent.click(filterToggle())
    fireEvent.change(searchBox()!, { target: { value: '論文' } })
    fireEvent.click(screen.getByRole('button', { name: '条件をクリア' }))
    expect(screen.getByText('部屋の掃除')).toBeTruthy()

    fireEvent.click(filterToggle())
    expect(screen.queryByText('絞り込み中')).toBeNull()
  })
})
