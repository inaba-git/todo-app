import { useMemo, useState } from 'react'
import { formatDate, toDateString, todayString } from '../dateUtils.js'
import { CATEGORY_LABELS, PRIORITY_ORDER } from '../constants.js'
import TaskList from './TaskList.jsx'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const MAX_CHIPS = 2

// 同じ日の中では「未完了 → 優先度の高い順」に並べる
function sortForDay(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
}

export default function Calendar({ tasks, isFiltered, onToggle, onDelete, onUpdate }) {
  const today = todayString()
  const [year, month] = today.split('-').map(Number)
  const [view, setView] = useState({ year, monthIndex: month - 1 })
  const [selected, setSelected] = useState(today)

  // 期限日ごとにタスクをまとめる
  const tasksByDate = useMemo(() => {
    const map = {}
    for (const task of tasks) {
      if (!task.dueDate) continue
      ;(map[task.dueDate] ||= []).push(task)
    }
    for (const list of Object.values(map)) list.sort(sortForDay)
    return map
  }, [tasks])

  const noDueCount = tasks.filter((t) => !t.dueDate).length

  const firstWeekday = new Date(view.year, view.monthIndex, 1).getDay()
  const daysInMonth = new Date(view.year, view.monthIndex + 1, 0).getDate()
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const moveMonth = (delta) => {
    setView(({ year, monthIndex }) => {
      const d = new Date(year, monthIndex + delta, 1)
      return { year: d.getFullYear(), monthIndex: d.getMonth() }
    })
  }

  const goToday = () => {
    setView({ year, monthIndex: month - 1 })
    setSelected(today)
  }

  const selectedTasks = tasksByDate[selected] || []

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          className="nav-button"
          onClick={() => moveMonth(-1)}
          aria-label="前の月"
        >
          ◀
        </button>
        <h2 className="calendar-title">
          {view.year}年{view.monthIndex + 1}月
        </h2>
        <button
          type="button"
          className="nav-button"
          onClick={() => moveMonth(1)}
          aria-label="次の月"
        >
          ▶
        </button>
        <button type="button" className="link-button today-button" onClick={goToday}>
          今日
        </button>
      </div>

      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`weekday ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}
          >
            {w}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} className="day blank" />

          const dateStr = toDateString(view.year, view.monthIndex, day)
          const dayTasks = tasksByDate[dateStr] || []
          const activeCount = dayTasks.filter((t) => !t.completed).length
          const weekday = (firstWeekday + day - 1) % 7
          const classes = [
            'day',
            dateStr === today && 'today',
            dateStr === selected && 'selected',
            weekday === 0 && 'sun',
            weekday === 6 && 'sat',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={dateStr}
              type="button"
              className={classes}
              onClick={() => setSelected(dateStr)}
              aria-pressed={dateStr === selected}
              aria-label={`${formatDate(dateStr)} タスク${dayTasks.length}件`}
            >
              <span className="day-number">{day}</span>
              {dayTasks.length > 0 && (
                <span className="day-count" title={`未完了 ${activeCount}件`}>
                  {dayTasks.length}
                </span>
              )}
              <span className="chips">
                {dayTasks.slice(0, MAX_CHIPS).map((t) => (
                  <span
                    key={t.id}
                    className={`chip priority-${t.priority} ${t.completed ? 'completed' : ''}`}
                    title={`${CATEGORY_LABELS[t.category]}: ${t.title}`}
                  >
                    <span className={`chip-cat category-${t.category}`}>
                      {CATEGORY_LABELS[t.category][0]}
                    </span>
                    {t.title}
                  </span>
                ))}
                {dayTasks.length > MAX_CHIPS && (
                  <span className="chip-more">他{dayTasks.length - MAX_CHIPS}件</span>
                )}
              </span>
              {/* 狭い画面ではタスク名の代わりに色付きの点を表示する */}
              <span className="dots" aria-hidden="true">
                {dayTasks.slice(0, 4).map((t) => (
                  <span
                    key={t.id}
                    className={`dot priority-${t.priority} ${t.completed ? 'completed' : ''}`}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <section className="day-detail">
        <h2>
          {formatDate(selected)} のタスク <span className="count">{selectedTasks.length}</span>
        </h2>
        <TaskList
          tasks={selectedTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
          emptyMessage={
            isFiltered ? '条件に一致する、この日のタスクはありません' : 'この日に期限のタスクはありません'
          }
        />
        {noDueCount > 0 && (
          <p className="calendar-note">
            期限日が未設定のタスクが {noDueCount} 件あります(リスト表示で確認できます)
          </p>
        )}
      </section>
    </div>
  )
}
