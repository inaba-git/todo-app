import { useState } from 'react'
import { CATEGORIES, PRIORITIES } from '../constants.ts'
import { shortDate, weekdayLabel } from '../dateUtils.ts'
import BarChart from './BarChart.tsx'
import type { BarChartItem } from './BarChart.tsx'
import { completionPercent } from '../taskUtils.ts'
import type { CompletionHistory, TaskStats } from '../types.ts'

// ラベル + 横棒 + 件数 の1行。棒の長さは全タスク数に対する割合
interface BarRowProps {
  label: string
  count: number
  total: number
  colorClass: string
}

function BarRow({ label, count, total, colorClass }: BarRowProps) {
  const percent = total > 0 ? (count / total) * 100 : 0
  return (
    <li className="bar-row">
      <span className="bar-label">{label}</span>
      <span className="bar-track">
        <span className={`bar-fill ${colorClass}`} style={{ width: `${percent}%` }} />
      </span>
      <span className="bar-count">{count}件</span>
    </li>
  )
}

function Overview({ stats }: { stats: TaskStats }) {
  const { total, completed, priority, category, overdue, dueThisWeek } = stats
  const percent = completionPercent(stats)

  return (
    <>
      <div className="progress">
        <div className="progress-head">
          <span>全体の完了率</span>
          <span>
            <strong className="progress-percent">{percent}%</strong>
            <span className="progress-detail">
              {' '}
              ({completed} / {total}件)
            </span>
          </span>
        </div>
        <div
          className="bar-track progress-track"
          role="progressbar"
          aria-label="全体の完了率"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="bar-fill progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="stat-tiles">
        <div className={`stat-tile ${overdue > 0 ? 'danger-tile' : ''}`}>
          <span className="stat-number">{overdue}</span>
          <span className="stat-label">期限切れ</span>
        </div>
        <div className="stat-tile">
          <span className="stat-number">{dueThisWeek}</span>
          <span className="stat-label">直近7日が期限</span>
        </div>
      </div>
      <p className="stats-note">期限切れ・直近7日は未完了タスクのみを数えています</p>

      <div className="stat-charts">
        <div>
          <h3>優先度別</h3>
          <ul className="bar-list">
            {PRIORITIES.map((p) => (
              <BarRow
                key={p.value}
                label={p.label}
                count={priority[p.value]}
                total={total}
                colorClass={`fill-priority-${p.value}`}
              />
            ))}
          </ul>
        </div>
        <div>
          <h3>カテゴリ別</h3>
          <ul className="bar-list">
            {CATEGORIES.map((c) => (
              <BarRow
                key={c.value}
                label={c.label}
                count={category[c.value]}
                total={total}
                colorClass={`fill-category-${c.value}`}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

function Review({
  history,
  estimatedCount,
}: {
  history: CompletionHistory
  estimatedCount: number
}) {
  const dayItems: BarChartItem[] = history.days.map((d, i) => ({
    key: d.date,
    label: shortDate(d.date),
    sublabel: i === history.days.length - 1 ? '今日' : `(${weekdayLabel(d.date)})`,
    count: d.count,
    current: i === history.days.length - 1,
  }))

  const weekItems: BarChartItem[] = history.weeks.map((w, i) => {
    const weeksAgo = history.weeks.length - 1 - i
    return {
      key: w.start,
      label: `${shortDate(w.start)}〜${shortDate(w.end)}`,
      sublabel: weeksAgo === 0 ? '直近7日' : `${weeksAgo}週前`,
      count: w.count,
      current: weeksAgo === 0,
    }
  })

  return (
    <>
      <BarChart title="直近7日間の完了数" items={dayItems} />
      <BarChart title="直近4週間の完了数(7日ごと)" items={weekItems} />
      <p className="stats-note">
        「完了にした日」で集計します。完了を取り消したタスクは数えません。
        {estimatedCount > 0 &&
          ` 完了日時が未記録の過去のタスク ${estimatedCount}件は、追加日に完了したものとして数えています。`}
      </p>
    </>
  )
}

interface StatsProps {
  stats: TaskStats
  history: CompletionHistory
  /** 完了日時が未記録で、追加日で代用している完了済みタスクの件数 */
  estimatedCount: number
  open: boolean
  onToggle: () => void
}

export default function Stats({ stats, history, estimatedCount, open, onToggle }: StatsProps) {
  const [tab, setTab] = useState<'overview' | 'review'>('overview')
  const { overdue } = stats
  const percent = completionPercent(stats)

  return (
    <section className="stats">
      <button
        type="button"
        className="stats-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>
          {open ? '▾' : '▸'} 📊 統計
        </span>
        {!open && (
          <span className="stats-summary">
            完了 {percent}%
            {overdue > 0 && <span className="danger"> ・ 期限切れ {overdue}件</span>}
          </span>
        )}
      </button>

      {open && (
        <div className="stats-body">
          <div className="tabs stats-tabs" role="tablist" aria-label="統計の切り替え">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'overview'}
              className={`tab ${tab === 'overview' ? 'active' : ''}`}
              onClick={() => setTab('overview')}
            >
              概要
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'review'}
              className={`tab ${tab === 'review' ? 'active' : ''}`}
              onClick={() => setTab('review')}
            >
              振り返り
            </button>
          </div>

          {tab === 'overview' ? (
            <Overview stats={stats} />
          ) : (
            <Review history={history} estimatedCount={estimatedCount} />
          )}
        </div>
      )}
    </section>
  )
}
