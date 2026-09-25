export interface BarChartItem {
  key: string
  label: string
  sublabel: string
  count: number
  /** 今日・直近の区間など、強調表示する棒 */
  current: boolean
}

interface BarChartProps {
  title: string
  items: BarChartItem[]
}

// CSS だけの縦棒グラフ。棒の高さは、表示中の最大値に対する割合
export default function BarChart({ title, items }: BarChartProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="chart">
      <h3>
        {title} <span className="chart-total">合計 {total}件</span>
      </h3>
      <div className="chart-bars" role="list">
        {items.map((item) => (
          <div
            key={item.key}
            role="listitem"
            className={`chart-col ${item.current ? 'current' : ''}`}
            aria-label={`${item.label} ${item.sublabel} ${item.count}件`}
          >
            <span className="chart-value">{item.count}</span>
            <span className="chart-bar-area">
              <span
                className={`chart-bar ${item.count === 0 ? 'zero' : ''}`}
                style={{ height: `${(item.count / max) * 100}%` }}
              />
            </span>
            <span className="chart-label">{item.label}</span>
            <span className="chart-sublabel">{item.sublabel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
