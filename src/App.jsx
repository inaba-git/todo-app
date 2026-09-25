import { useMemo, useState } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { useTheme } from './useTheme.js'
import {
  computeCompletionHistory,
  computeStats,
  filterTasks,
  hasEstimatedCompletion,
  normalizeTask,
  sortTasks,
} from './taskUtils.js'
import { todayString } from './dateUtils.js'
import Stats from './components/Stats.jsx'
import TaskForm from './components/TaskForm.jsx'
import TaskList from './components/TaskList.jsx'
import Calendar from './components/Calendar.jsx'
import FilterBar from './components/FilterBar.jsx'

const INITIAL_FILTERS = { search: '', priority: 'all', category: 'all' }

export default function App() {
  const [storedTasks, setTasks] = useLocalStorage('todo-app.tasks', [])
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useLocalStorage('todo-app.view', 'list')
  const [sort, setSort] = useLocalStorage('todo-app.sort', 'created')
  const [statsOpen, setStatsOpen] = useLocalStorage('todo-app.statsOpen', true)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showCompleted, setShowCompleted] = useState(true)

  const tasks = useMemo(() => storedTasks.map(normalizeTask), [storedTasks])
  const visibleTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])
  const isFiltered = visibleTasks.length !== tasks.length
  // 統計は絞り込みに関係なく常に全タスクを対象にする
  const today = todayString()
  const stats = computeStats(tasks, today)
  const history = computeCompletionHistory(tasks, today)
  const estimatedCount = storedTasks.filter(hasEstimatedCompletion).length

  const addTask = (fields) => {
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...fields,
        subtasks: [],
        completed: false,
        completedAt: null,
        createdAt: Date.now(),
      },
    ])
  }

  const updateTask = (id, changes) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)))
  }

  const toggleTask = (id) => {
    // 完了にした瞬間の時刻を記録し、未完了に戻したら消す(振り返りグラフ用)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, completedAt: t.completed ? null : Date.now() }
          : t
      )
    )
  }

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const clearCompleted = () => {
    if (confirm('完了済みのタスクをすべて削除しますか?')) {
      setTasks((prev) => prev.filter((t) => !t.completed))
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

  const handlers = { onToggle: toggleTask, onDelete: deleteTask, onUpdate: updateTask }

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

      <Stats
        stats={stats}
        history={history}
        estimatedCount={estimatedCount}
        open={statsOpen}
        onToggle={() => setStatsOpen((v) => !v)}
      />

      <TaskForm onAdd={addTask} />

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
                  isFiltered ? '条件に一致するタスクはありません' : '完了したタスクはまだありません'
                }
              />
            )}
          </section>
        </>
      )}
    </main>
  )
}
