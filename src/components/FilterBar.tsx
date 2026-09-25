import { CATEGORIES, PRIORITIES, SORT_OPTIONS } from '../constants.ts'
import type { Filters, SortKey } from '../types.ts'

interface FilterFieldsProps {
  filters: Filters
  onChange: (filters: Filters) => void
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  showSort: boolean
}

// 検索語・優先度・カテゴリのどれかで絞り込み中か
function hasActiveFilters(filters: Filters): boolean {
  return filters.search !== '' || filters.priority !== 'all' || filters.category !== 'all'
}

// 検索・絞り込み(両表示共通)と並び替え(リスト表示のみ)の入力欄
function FilterFields({
  filters,
  onChange,
  sort,
  onSortChange,
  showSort,
}: FilterFieldsProps) {
  const isFiltered = hasActiveFilters(filters)

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

interface FilterBarProps extends FilterFieldsProps {
  open: boolean
  onToggle: () => void
}

// 折りたたみ式の「検索・絞り込み」エリア。閉じている間は見出しだけを表示する
export default function FilterBar({ open, onToggle, ...fieldsProps }: FilterBarProps) {
  const isFiltered = hasActiveFilters(fieldsProps.filters)

  return (
    <section className="filter-panel">
      <button type="button" className="filter-toggle" onClick={onToggle} aria-expanded={open}>
        <span>{open ? '▾' : '▸'} 🔍 検索・絞り込み</span>
        {/* 閉じている間も、条件が効いていることが分かるようにする */}
        {!open && isFiltered && <span className="filter-summary">絞り込み中</span>}
      </button>
      {open && <FilterFields {...fieldsProps} />}
    </section>
  )
}
