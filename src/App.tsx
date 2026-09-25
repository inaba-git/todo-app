import { useMemo, useState } from 'react'
import { useLocalStorage } from './useLocalStorage.ts'
import { useTheme } from './useTheme.ts'
import {
  computeCompletionHistory,
  computeStats,
  createTask,
  deleteTaskById,
  filterTasks,
  hasEstimatedCompletion,
  normalizeTask,
  removeCompleted,
  sortTasks,
  toggleTaskById,
  updateTaskById,
} from './taskUtils.ts'
import { todayString } from './dateUtils.ts'
import Stats from './components/Stats.tsx'
import TaskForm from './components/TaskForm.tsx'
import TaskList from './components/TaskList.tsx'
import Calendar from './components/Calendar.tsx'
import FilterBar from './components/FilterBar.tsx'
import type {
  Filters,
  NewTaskFields,
  SortKey,
  StoredTask,
  TaskChanges,
  TaskHandlers,
  ViewMode,
} from './types.ts'

const INITIAL_FILTERS: Filters = { search: '', priority: 'all', category: 'all' }

export default function App() {
  const [storedTasks, setTasks] = useLocalStorage<StoredTask[]>('todo-app.tasks', [])
  const [theme, toggleTheme] = useTheme()
  const [view, setView] = useLocalStorage<ViewMode>('todo-app.view', 'list')
  const [sort, setSort] = useLocalStorage<SortKey>('todo-app.sort', 'created')
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

  const addTask = (fields: NewTaskFields) => {
    const task = createTask(fields)
    setTasks((prev) => [...prev, task])
  }

  const updateTask = (id: string, changes: TaskChanges) => {
    setTasks((prev) => updateTaskById(prev, id, changes))
  }

  const toggleTask = (id: string) => {
    setTasks((prev) => toggleTaskById(prev, id))
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => deleteTaskById(prev, id))
  }

  const clearCompleted = () => {
    if (confirm('完了済みのタスクをすべて削除しますか?')) {
      setTasks(removeCompleted)
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

  const handlers: TaskHandlers = { onToggle: toggleTask, onDelete: deleteTask, onUpdate: updateTask }

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
