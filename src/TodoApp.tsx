import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocalStorage } from './useLocalStorage.ts'
import { useTheme } from './useTheme.ts'
import {
  computeCompletionHistory,
  computeStats,
  filterTasks,
  hasEstimatedCompletion,
  normalizeTask,
  sortTasks,
} from './taskUtils.ts'
import { todayString } from './dateUtils.ts'
import Stats from './components/Stats.tsx'
import TaskForm from './components/TaskForm.tsx'
import TaskList from './components/TaskList.tsx'
import Calendar from './components/Calendar.tsx'
import FilterBar from './components/FilterBar.tsx'
import type { TaskStore } from './useTasks.ts'
import type { Filters, SortKey, TaskHandlers, ViewMode } from './types.ts'

const INITIAL_FILTERS: Filters = { search: '', priority: 'all', category: 'all' }

interface TodoAppProps {
  /** タスクの保存先(ログイン中のアカウント)との橋渡し */
  store: TaskStore
  userEmail: string | null
  onSignOut: () => void
  /** ヘッダーの下に出すお知らせ(端末のタスクの取り込み確認など) */
  notices?: ReactNode
}

// ログイン後のメイン画面。タスクの保存は store に任せ、ここは表示と操作に専念する
export default function TodoApp({ store, userEmail, onSignOut, notices }: TodoAppProps) {
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useLocalStorage<ViewMode>('todo-app.view', 'list')
  const [sort, setSort] = useLocalStorage<SortKey>('todo-app.sort', 'created')
  // 統計・検索絞り込みの開閉は保存して、次回も同じ状態にする(初期状態は折りたたみ)。
  // 統計は旧キー 'todo-app.statsOpen' に初期値 true が保存されているため、新しい初期値が
  // 既存の訪問者にも効くようにキーを変えた(以降に開閉した状態は新しいキーに保存される)。
  const [statsOpen, setStatsOpen] = useLocalStorage('todo-app.statsOpen.v2', false)
  const [filtersOpen, setFiltersOpen] = useLocalStorage('todo-app.filtersOpen', false)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showCompleted, setShowCompleted] = useState(true)

  const storedTasks = store.tasks
  const tasks = useMemo(() => storedTasks.map(normalizeTask), [storedTasks])
  const visibleTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])
  const isFiltered = visibleTasks.length !== tasks.length
  // 統計は絞り込みに関係なく常に全タスクを対象にする
  const today = todayString()
  const stats = computeStats(tasks, today)
  const history = computeCompletionHistory(tasks, today)
  const estimatedCount = storedTasks.filter(hasEstimatedCompletion).length

  const clearCompleted = () => {
    if (confirm('完了済みのタスクをすべて削除しますか?')) {
      store.clearCompleted()
    }
  }

  const activeTasks = sortTasks(
    visibleTasks.filter((t) => !t.completed),
    sort
  )
  const completedTasks = sortTasks(
    visibleTasks.filter((t) => t.completed),
    sort
  )
  const totalCompleted = tasks.filter((t) => t.completed).length

  const handlers: TaskHandlers = {
    onToggle: store.toggleTask,
    onDelete: store.deleteTask,
    onUpdate: store.updateTask,
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>ToDoリスト</h1>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <div className="account-bar">
        {userEmail && <span className="account-email">{userEmail}</span>}
        <button type="button" className="link-button logout-button" onClick={onSignOut}>
          ログアウト
        </button>
      </div>

      {store.error && (
        <div className="sync-error" role="alert">
          <span>{store.error}</span>
          <button type="button" onClick={store.dismissError} aria-label="エラーを閉じる">
            ×
          </button>
        </div>
      )}

      {notices}

      {store.status === 'loading' && (
        <p className="sync-status" role="status">
          タスクを読み込んでいます…
        </p>
      )}

      {store.status === 'error' && (
        <p className="sync-status">
          <button type="button" className="cancel-button" onClick={store.reload}>
            もう一度読み込む
          </button>
        </p>
      )}

      {store.status === 'ready' && (
        <>
          <Stats
            stats={stats}
            history={history}
            estimatedCount={estimatedCount}
            open={statsOpen}
            onToggle={() => setStatsOpen((v) => !v)}
          />

          <TaskForm onAdd={store.addTask} />

          <div className="tabs" role="tablist" aria-label="表示切り替え">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={`tab ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              📋 リスト
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'calendar'}
              className={`tab ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              📅 カレンダー
            </button>
          </div>

          <FilterBar
            filters={filters}
            onChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            showSort={view === 'list'}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((v) => !v)}
          />

          {view === 'calendar' ? (
            <Calendar tasks={visibleTasks} isFiltered={isFiltered} {...handlers} />
          ) : (
            <>
              <section className="section">
                <h2>
                  未完了 <span className="count">{activeTasks.length}</span>
                </h2>
                <TaskList
                  tasks={activeTasks}
                  {...handlers}
                  emptyMessage={
                    isFiltered ? '条件に一致するタスクはありません' : '未完了のタスクはありません 🎉'
                  }
                />
              </section>

              <section className="section">
                <div className="section-header">
                  <h2>
                    <button
                      type="button"
                      className="toggle-section"
                      onClick={() => setShowCompleted((v) => !v)}
                      aria-expanded={showCompleted}
                    >
                      {showCompleted ? '▾' : '▸'} 完了済み
                    </button>
                    <span className="count">{completedTasks.length}</span>
                  </h2>
                  {totalCompleted > 0 && (
                    <button type="button" className="link-button" onClick={clearCompleted}>
                      完了済みをすべて削除
                    </button>
                  )}
                </div>
                {showCompleted && (
                  <TaskList
                    tasks={completedTasks}
                    {...handlers}
                    emptyMessage={
                      isFiltered
                        ? '条件に一致するタスクはありません'
                        : '完了したタスクはまだありません'
                    }
                  />
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}
