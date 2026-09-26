import { describe, expect, it } from 'vitest'
import {
  completionPercent,
  computeCompletionHistory,
  computeStats,
  createTask,
  deleteTaskById,
  filterTasks,
  getDueStatus,
  hasEstimatedCompletion,
  isDueThisWeek,
  isOverdue,
  normalizeTask,
  removeCompleted,
  sortTasks,
  subtaskProgress,
  toggleTaskById,
  toImportableTask,
  updateTaskById,
} from './taskUtils.ts'
import { makeTask } from './test/factories.ts'
import type { Filters, NewTaskFields, StoredTask, Subtask } from './types.ts'

// 2026-09-26 は土曜日。「直近7日」は 9/26 〜 10/2
const TODAY = '2026-09-26'
const ALL: Filters = { search: '', priority: 'all', category: 'all' }

const sub = (id: string, completed: boolean): Subtask => ({ id, title: `sub-${id}`, completed })
const titles = (tasks: { title: string }[]) => tasks.map((t) => t.title)

describe('タスクの追加 (createTask)', () => {
  const fields: NewTaskFields = {
    title: 'レポート',
    dueDate: '2026-10-01',
    priority: 'high',
    category: 'class',
    memo: '参考文献を集める',
  }

  it('入力内容を引き継ぎ、未完了・サブタスクなしで作られる', () => {
    const task = createTask(fields, { id: 'abc', now: 1000 })
    expect(task).toEqual({
      id: 'abc',
      ...fields,
      subtasks: [],
      completed: false,
      completedAt: null,
      createdAt: 1000,
    })
  })

  it('id を省略すると呼ぶたびに別の id になる', () => {
    expect(createTask(fields).id).not.toBe(createTask(fields).id)
  })

  it('now を省略すると現在時刻が追加日時になる', () => {
    const before = Date.now()
    const { createdAt } = createTask(fields)
    expect(createdAt).toBeGreaterThanOrEqual(before)
    expect(createdAt).toBeLessThanOrEqual(Date.now())
  })

  it('期限日なし(空文字)でも作れる', () => {
    expect(createTask({ ...fields, dueDate: '' }).dueDate).toBe('')
  })
})

describe('タスクの編集 (updateTaskById)', () => {
  const a = makeTask({ id: 'a', title: 'A' })
  const b = makeTask({ id: 'b', title: 'B' })

  it('指定した id のタスクだけが更新される', () => {
    const result = updateTaskById([a, b], 'a', { title: 'A2', priority: 'high' })
    expect(result[0]).toMatchObject({ id: 'a', title: 'A2', priority: 'high' })
    expect(result[1]).toBe(b)
  })

  it('指定しなかった項目はそのまま残る', () => {
    const [updated] = updateTaskById([{ ...a, memo: 'メモ', dueDate: '2026-10-01' }], 'a', {
      title: 'A2',
    })
    expect(updated).toMatchObject({ memo: 'メモ', dueDate: '2026-10-01', category: 'other' })
  })

  it('期限日・カテゴリ・メモ・サブタスクも更新できる', () => {
    const subtasks = [sub('1', false)]
    const [updated] = updateTaskById([a], 'a', {
      dueDate: '2026-12-31',
      category: 'job',
      memo: '更新',
      subtasks,
    })
    expect(updated).toMatchObject({ dueDate: '2026-12-31', category: 'job', memo: '更新', subtasks })
  })

  it('元の配列とタスクは変更されない', () => {
    const original = [a, b]
    updateTaskById(original, 'a', { title: '変更' })
    expect(original).toEqual([a, b])
    expect(a.title).toBe('A')
  })

  it('存在しない id なら内容は変わらない', () => {
    expect(updateTaskById([a, b], 'zzz', { title: 'X' })).toEqual([a, b])
  })
})

describe('完了の切り替え (toggleTaskById)', () => {
  it('完了にすると completed が true になり、完了時刻が記録される', () => {
    const [t] = toggleTaskById([makeTask({ id: 'a' })], 'a', 5000)
    expect(t).toMatchObject({ completed: true, completedAt: 5000 })
  })

  it('未完了に戻すと完了時刻が消える', () => {
    const done = makeTask({ id: 'a', completed: true, completedAt: 5000 })
    const [t] = toggleTaskById([done], 'a', 9000)
    expect(t).toMatchObject({ completed: false, completedAt: null })
  })

  it('他のタスクには影響しない', () => {
    const other = makeTask({ id: 'b' })
    const result = toggleTaskById([makeTask({ id: 'a' }), other], 'a', 1)
    expect(result[1]).toBe(other)
  })
})

describe('タスクの削除', () => {
  const a = makeTask({ id: 'a', completed: true })
  const b = makeTask({ id: 'b' })
  const c = makeTask({ id: 'c', completed: true })

  it('deleteTaskById: 指定した id のタスクだけが消える', () => {
    expect(deleteTaskById([a, b, c], 'b')).toEqual([a, c])
  })

  it('deleteTaskById: 存在しない id なら何も消えない', () => {
    expect(deleteTaskById([a, b], 'zzz')).toEqual([a, b])
  })

  it('removeCompleted: 完了済みだけがすべて消える', () => {
    expect(removeCompleted([a, b, c])).toEqual([b])
  })

  it('removeCompleted: 元の配列は変更されない', () => {
    const original = [a, b, c]
    removeCompleted(original)
    expect(original).toHaveLength(3)
  })
})

describe('古い保存データの補完 (normalizeTask)', () => {
  const legacy: StoredTask = {
    id: 'old',
    title: '古いタスク',
    dueDate: '',
    priority: 'medium',
    completed: false,
    createdAt: 1234,
  }

  it('カテゴリ・サブタスク・メモがなければ「その他」・空配列・空文字になる', () => {
    expect(normalizeTask(legacy)).toMatchObject({ category: 'other', subtasks: [], memo: '' })
  })

  it('未知のカテゴリは「その他」になる', () => {
    expect(normalizeTask({ ...legacy, category: 'hobby' }).category).toBe('other')
  })

  it('完了済みで完了日時がなければ、追加日時で代用する', () => {
    expect(normalizeTask({ ...legacy, completed: true }).completedAt).toBe(1234)
  })

  it('完了日時が記録されていればそれを使う', () => {
    expect(normalizeTask({ ...legacy, completed: true, completedAt: 999 }).completedAt).toBe(999)
  })

  it('未完了なら完了日時は null', () => {
    expect(normalizeTask(legacy).completedAt).toBeNull()
  })

  it('補完が不要なタスクは同じオブジェクトをそのまま返す', () => {
    const full = makeTask({ category: 'research' })
    expect(normalizeTask(full)).toBe(full)
  })

  it('hasEstimatedCompletion: 完了済みで完了日時がないものだけ true', () => {
    expect(hasEstimatedCompletion({ ...legacy, completed: true })).toBe(true)
    expect(hasEstimatedCompletion({ ...legacy, completed: true, completedAt: 1 })).toBe(false)
    expect(hasEstimatedCompletion(legacy)).toBe(false)
  })
})

describe('端末のタスクの取り込み用の補完 (toImportableTask)', () => {
  const legacy: StoredTask = {
    id: 'old',
    title: '古いタスク',
    dueDate: '',
    priority: 'medium',
    completed: true,
    createdAt: 1234,
  }

  it('カテゴリ・サブタスク・メモを補完する', () => {
    expect(toImportableTask(legacy)).toMatchObject({ category: 'other', subtasks: [], memo: '' })
  })

  it('完了日時が未記録なら、追加日時で代用せず null のままにする(表示側が従来どおり代用する)', () => {
    expect(toImportableTask(legacy).completedAt).toBeNull()
    expect(hasEstimatedCompletion(toImportableTask(legacy))).toBe(true)
  })

  it('記録されていた完了日時はそのまま使う', () => {
    expect(toImportableTask({ ...legacy, completedAt: 999 }).completedAt).toBe(999)
  })
})

describe('絞り込み (filterTasks)', () => {
  const tasks = [
    makeTask({ title: '論文を読む', priority: 'high', category: 'research' }),
    makeTask({ title: 'ES を書く', priority: 'high', category: 'job' }),
    makeTask({ title: 'Reading 課題', priority: 'medium', category: 'class' }),
    makeTask({ title: '部屋の掃除', priority: 'low', category: 'other' }),
    makeTask({ title: '論文の英訳', priority: 'low', category: 'research' }),
  ]

  it('条件なし(すべて)なら全件返す', () => {
    expect(filterTasks(tasks, ALL)).toEqual(tasks)
  })

  it('優先度で絞り込める', () => {
    expect(titles(filterTasks(tasks, { ...ALL, priority: 'high' }))).toEqual(['論文を読む', 'ES を書く'])
    expect(titles(filterTasks(tasks, { ...ALL, priority: 'medium' }))).toEqual(['Reading 課題'])
  })

  it('カテゴリで絞り込める', () => {
    expect(titles(filterTasks(tasks, { ...ALL, category: 'research' }))).toEqual([
      '論文を読む',
      '論文の英訳',
    ])
    expect(titles(filterTasks(tasks, { ...ALL, category: 'job' }))).toEqual(['ES を書く'])
  })

  it('優先度とカテゴリを同時に指定すると両方を満たすものだけ残る', () => {
    const result = filterTasks(tasks, { ...ALL, priority: 'low', category: 'research' })
    expect(titles(result)).toEqual(['論文の英訳'])
  })

  it('タスク名の検索は部分一致で、大文字小文字を区別しない', () => {
    expect(titles(filterTasks(tasks, { ...ALL, search: '論文' }))).toEqual(['論文を読む', '論文の英訳'])
    expect(titles(filterTasks(tasks, { ...ALL, search: 'reading' }))).toEqual(['Reading 課題'])
    expect(titles(filterTasks(tasks, { ...ALL, search: 'es' }))).toEqual(['ES を書く'])
  })

  it('検索語の前後の空白は無視される。空白だけなら絞り込まない', () => {
    expect(titles(filterTasks(tasks, { ...ALL, search: '  掃除  ' }))).toEqual(['部屋の掃除'])
    expect(filterTasks(tasks, { ...ALL, search: '   ' })).toHaveLength(tasks.length)
  })

  it('検索・優先度・カテゴリを組み合わせられる', () => {
    const result = filterTasks(tasks, { search: '論文', priority: 'high', category: 'research' })
    expect(titles(result)).toEqual(['論文を読む'])
  })

  it('一致するものがなければ空配列', () => {
    expect(filterTasks(tasks, { ...ALL, search: '存在しない' })).toEqual([])
  })
})

describe('並び替え (sortTasks)', () => {
  const a = makeTask({ title: 'a', createdAt: 3, dueDate: '2026-10-05', priority: 'low' })
  const b = makeTask({ title: 'b', createdAt: 1, dueDate: '', priority: 'high' })
  const c = makeTask({ title: 'c', createdAt: 2, dueDate: '2026-10-01', priority: 'medium' })
  const d = makeTask({ title: 'd', createdAt: 4, dueDate: '2026-10-01', priority: 'high' })
  const input = [a, b, c, d]

  it('追加した順: createdAt の昇順', () => {
    expect(titles(sortTasks(input, 'created'))).toEqual(['b', 'c', 'a', 'd'])
  })

  it('期限日が近い順: 期限なしは最後、同じ期限日なら優先度が高い方が先', () => {
    expect(titles(sortTasks(input, 'due'))).toEqual(['d', 'c', 'a', 'b'])
  })

  it('優先度が高い順: 同じ優先度なら期限日が近い方が先(期限なしは後)', () => {
    const x = makeTask({ title: 'x', priority: 'high', dueDate: '2026-10-09', createdAt: 5 })
    expect(titles(sortTasks([...input, x], 'priority'))).toEqual(['d', 'x', 'b', 'c', 'a'])
  })

  it('期限も優先度も同じなら追加順で安定する', () => {
    const p = makeTask({ title: 'p', createdAt: 20, priority: 'low', dueDate: '2026-10-01' })
    const q = makeTask({ title: 'q', createdAt: 10, priority: 'low', dueDate: '2026-10-01' })
    expect(titles(sortTasks([p, q], 'due'))).toEqual(['q', 'p'])
    expect(titles(sortTasks([p, q], 'priority'))).toEqual(['q', 'p'])
  })

  it('元の配列は変更されない', () => {
    const original = [a, b, c, d]
    sortTasks(original, 'priority')
    expect(original).toEqual([a, b, c, d])
  })

  it('未知の並び順が渡されたら追加順にする', () => {
    // localStorage に古い/壊れた値が残っていた場合を想定
    expect(titles(sortTasks(input, 'weird' as never))).toEqual(['b', 'c', 'a', 'd'])
  })

  it('空配列でも動く', () => {
    expect(sortTasks([], 'due')).toEqual([])
  })
})

describe('期限切れ・今週期限の判定', () => {
  const due = (dueDate: string, completed = false) => ({ dueDate, completed })

  describe('isOverdue', () => {
    it('期限日が今日より前の未完了タスクは期限切れ', () => {
      expect(isOverdue(due('2026-09-25'), TODAY)).toBe(true)
      expect(isOverdue(due('2020-01-01'), TODAY)).toBe(true)
    })

    it('期限日が今日なら期限切れではない', () => {
      expect(isOverdue(due(TODAY), TODAY)).toBe(false)
    })

    it('期限日が未来なら期限切れではない', () => {
      expect(isOverdue(due('2026-09-27'), TODAY)).toBe(false)
    })

    it('完了済みは期限を過ぎていても期限切れではない', () => {
      expect(isOverdue(due('2026-09-01', true), TODAY)).toBe(false)
    })

    it('期限日なしは期限切れではない', () => {
      expect(isOverdue(due(''), TODAY)).toBe(false)
    })
  })

  describe('isDueThisWeek (今日〜6日後)', () => {
    it('今日と6日後は含まれる', () => {
      expect(isDueThisWeek(due('2026-09-26'), TODAY)).toBe(true)
      expect(isDueThisWeek(due('2026-10-02'), TODAY)).toBe(true)
    })

    it('7日後は含まれない', () => {
      expect(isDueThisWeek(due('2026-10-03'), TODAY)).toBe(false)
    })

    it('期限切れ(昨日以前)は含まれない', () => {
      expect(isDueThisWeek(due('2026-09-25'), TODAY)).toBe(false)
    })

    it('月またぎ・年またぎでも7日間で判定できる', () => {
      expect(isDueThisWeek(due('2027-01-05'), '2026-12-30')).toBe(true)
      expect(isDueThisWeek(due('2027-01-06'), '2026-12-30')).toBe(false)
      expect(isDueThisWeek(due('2026-03-01'), '2026-02-23')).toBe(true) // 2026 は閏年ではない
    })

    it('完了済みと期限なしは含まれない', () => {
      expect(isDueThisWeek(due('2026-09-28', true), TODAY)).toBe(false)
      expect(isDueThisWeek(due(''), TODAY)).toBe(false)
    })
  })

  describe('getDueStatus', () => {
    it('期限切れ → overdue', () => {
      expect(getDueStatus(due('2026-09-25'), TODAY)).toBe('overdue')
    })

    it('今日が期限 → today', () => {
      expect(getDueStatus(due(TODAY), TODAY)).toBe('today')
    })

    it('明日以降・期限なし → 空文字', () => {
      expect(getDueStatus(due('2026-09-27'), TODAY)).toBe('')
      expect(getDueStatus(due(''), TODAY)).toBe('')
    })

    it('完了済みは常に空文字(強調表示しない)', () => {
      expect(getDueStatus(due('2026-09-01', true), TODAY)).toBe('')
      expect(getDueStatus(due(TODAY, true), TODAY)).toBe('')
    })
  })
})

describe('統計 (computeStats / completionPercent)', () => {
  const tasks = [
    makeTask({ priority: 'high', category: 'research', dueDate: '2026-09-20' }), // 期限切れ
    makeTask({ priority: 'high', category: 'job', dueDate: TODAY }), // 今週
    makeTask({ priority: 'medium', category: 'class', dueDate: '2026-10-02' }), // 今週(境界)
    makeTask({ priority: 'medium', category: 'class', dueDate: '2026-10-03' }), // 来週
    makeTask({ priority: 'low', category: 'other', dueDate: '' }), // 期限なし
    makeTask({ priority: 'low', category: 'research', dueDate: '2026-09-01', completed: true }),
    makeTask({ priority: 'high', category: 'research', dueDate: '2026-09-27', completed: true }),
  ]

  it('全体件数と完了件数', () => {
    const stats = computeStats(tasks, TODAY)
    expect(stats.total).toBe(7)
    expect(stats.completed).toBe(2)
  })

  it('優先度別の件数(完了済みも含む)', () => {
    expect(computeStats(tasks, TODAY).priority).toEqual({ high: 3, medium: 2, low: 2 })
  })

  it('カテゴリ別の件数(完了済みも含む)', () => {
    expect(computeStats(tasks, TODAY).category).toEqual({ research: 3, job: 1, class: 2, other: 1 })
  })

  it('期限切れ件数は未完了のみ(完了済みで期限を過ぎたものは数えない)', () => {
    expect(computeStats(tasks, TODAY).overdue).toBe(1)
  })

  it('直近7日が期限の件数は未完了のみ・今日を含み期限切れは含まない', () => {
    expect(computeStats(tasks, TODAY).dueThisWeek).toBe(2)
  })

  it('タスクが 0 件なら、すべて 0', () => {
    expect(computeStats([], TODAY)).toEqual({
      total: 0,
      completed: 0,
      priority: { high: 0, medium: 0, low: 0 },
      category: { research: 0, job: 0, class: 0, other: 0 },
      overdue: 0,
      dueThisWeek: 0,
    })
  })

  describe('completionPercent', () => {
    it('完了率を整数のパーセントで返す', () => {
      expect(completionPercent({ total: 4, completed: 1 })).toBe(25)
      expect(completionPercent({ total: 4, completed: 4 })).toBe(100)
      expect(completionPercent({ total: 5, completed: 0 })).toBe(0)
    })

    it('小数は四捨五入する', () => {
      expect(completionPercent({ total: 3, completed: 1 })).toBe(33)
      expect(completionPercent({ total: 3, completed: 2 })).toBe(67)
    })

    it('タスクが 0 件なら 0(0 で割らない)', () => {
      expect(completionPercent({ total: 0, completed: 0 })).toBe(0)
    })

    it('computeStats の結果をそのまま渡せる', () => {
      expect(completionPercent(computeStats(tasks, TODAY))).toBe(29) // 2 / 7
    })
  })
})

describe('サブタスクの進捗 (subtaskProgress)', () => {
  it('5個中2個完了なら 2/5・40%', () => {
    const task = makeTask({
      subtasks: [sub('1', true), sub('2', true), sub('3', false), sub('4', false), sub('5', false)],
    })
    expect(subtaskProgress(task)).toEqual({ done: 2, total: 5, percent: 40 })
  })

  it('すべて完了なら 100%', () => {
    const task = makeTask({ subtasks: [sub('1', true), sub('2', true)] })
    expect(subtaskProgress(task)).toEqual({ done: 2, total: 2, percent: 100 })
  })

  it('1つも完了していなければ 0%', () => {
    const task = makeTask({ subtasks: [sub('1', false)] })
    expect(subtaskProgress(task)).toEqual({ done: 0, total: 1, percent: 0 })
  })

  it('サブタスクがなければ 0/0・0%(0 で割らない)', () => {
    expect(subtaskProgress(makeTask())).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('割り切れない場合は小数のまま返す(表示側で幅に使う)', () => {
    const task = makeTask({ subtasks: [sub('1', true), sub('2', false), sub('3', false)] })
    expect(subtaskProgress(task).percent).toBeCloseTo(33.333, 2)
  })
})

describe('振り返りグラフの集計 (computeCompletionHistory)', () => {
  // ローカル時刻の日時からミリ秒を作る(月は 0 始まり)
  const at = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour).getTime()
  const done = (completedAt: number | null, completed = true) => makeTask({ completed, completedAt })

  it('日別は「今日から6日前 → 今日」の7日分が古い順に並ぶ', () => {
    const { days } = computeCompletionHistory([], TODAY)
    expect(days.map((d) => d.date)).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
    ])
    expect(days.every((d) => d.count === 0)).toBe(true)
  })

  it('完了した日ごとに件数を数える', () => {
    const tasks = [done(at(9, 26, 0)), done(at(9, 26, 23)), done(at(9, 24)), done(at(9, 20))]
    const { days } = computeCompletionHistory(tasks, TODAY)
    const byDate = Object.fromEntries(days.map((d) => [d.date, d.count]))
    expect(byDate).toMatchObject({ '2026-09-26': 2, '2026-09-24': 1, '2026-09-20': 1, '2026-09-25': 0 })
  })

  it('未完了に戻したタスクや、完了日時がないタスクは数えない', () => {
    const tasks = [done(at(9, 26), false), done(null, true)]
    const { days, weeks } = computeCompletionHistory(tasks, TODAY)
    expect(days.reduce((s, d) => s + d.count, 0)).toBe(0)
    expect(weeks.reduce((s, w) => s + w.count, 0)).toBe(0)
  })

  it('週別は7日ずつ4区間で、最後の区間が直近7日', () => {
    const { weeks } = computeCompletionHistory([], TODAY)
    expect(weeks).toHaveLength(4)
    expect(weeks[3]).toMatchObject({ start: '2026-09-20', end: '2026-09-26' })
    expect(weeks[2]).toMatchObject({ start: '2026-09-13', end: '2026-09-19' })
    expect(weeks[0]).toMatchObject({ start: '2026-08-30', end: '2026-09-05' })
  })

  it('週ごとの件数を数える。28日より前の完了は含まれない', () => {
    const tasks = [
      done(at(9, 26)), // 直近7日
      done(at(9, 20)), // 直近7日(区間の先頭)
      done(at(9, 19)), // 1週前(区間の末尾)
      done(at(9, 5)), // 3週前(区間の末尾)
      done(at(8, 29)), // 28日より前
    ]
    const { weeks } = computeCompletionHistory(tasks, TODAY)
    expect(weeks.map((w) => w.count)).toEqual([1, 0, 1, 2])
  })

  it('日別の合計と、直近7日の週別の件数が一致する', () => {
    const tasks = [done(at(9, 26)), done(at(9, 23)), done(at(9, 20)), done(at(9, 19))]
    const { days, weeks } = computeCompletionHistory(tasks, TODAY)
    expect(days.reduce((s, d) => s + d.count, 0)).toBe(weeks[3].count)
  })
})
