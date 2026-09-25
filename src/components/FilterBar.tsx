import { CATEGORIES, PRIORITIES, SORT_OPTIONS } from '../constants.ts'
import type { Filters, SortKey } from '../types.ts'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  showSort: boolean
}

// 検索・絞り込み(両表示共通)と並び替え(リスト表示のみ)
export default function FilterBar({
  filters,
  onChange,
  sort,
  onSortChange,
  showSort,
}: FilterBarProps) {
  const isFiltered =
    filters.search !== '' || filters.priority !== 'all' || filters.category !== 'all'

  return (
    <div className="filter-bar">
      <input
        type="search"
        className="search-input"
        placeholder="🔍 タスク名で検索"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        aria-label="タスク名で検索"
      />
      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value as Filters['priority'] })}
        aria-label="優先度で絞り込み"
      >
        <option value="all">優先度: すべて</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            優先度: {p.label}
          </option>
        ))}
      </select>
      <select
        value={filters.category}
        onChange={(e) => onChange({ ...filters, category: e.target.value as Filters['category'] })}
        aria-label="カテゴリで絞り込み"
      >
        <option value="all">カテゴリ: すべて</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      {showSort && (
        <select value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)} aria-label="並び替え">
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              並び順: {s.label}
            </option>
          ))}
        </select>
      )}
      {isFiltered && (
        <button
          type="button"
          className="link-button"
          onClick={() => onChange({ search: '', priority: 'all', category: 'all' })}
        >
          条件をクリア
        </button>
      )}
    </div>
  )
}
