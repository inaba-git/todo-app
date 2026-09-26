import { describe, expect, it } from 'vitest'
import { createSupabaseTasksApi } from './tasksApi.ts'
import { createFakeSupabase, USER_ID } from './test/fakeSupabase.ts'
import { makeTask } from './test/factories.ts'

const ID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function setup(tasks = [makeTask({ id: ID_A, createdAt: 1000 }), makeTask({ id: ID_B, createdAt: 2000 })]) {
  const fake = createFakeSupabase({ tasks })
  return { ...fake, api: createSupabaseTasksApi(fake.client) }
}

describe('createSupabaseTasksApi', () => {
  it('list: tasks テーブルの行を、追加順の Task として返す', async () => {
    const { api, client } = setup([
      makeTask({ id: ID_B, title: '後', createdAt: 2000, dueDate: '2026-10-01' }),
      makeTask({ id: ID_A, title: '先', createdAt: 1000 }),
    ])
    const tasks = await api.list()
    expect(client.from).toHaveBeenCalledWith('tasks')
    expect(tasks.map((t) => t.title)).toEqual(['先', '後'])
    expect(tasks[1].dueDate).toBe('2026-10-01')
  })

  it('insert: 行を追加する。user_id は送らない(DB が自動で入れる)', async () => {
    const { api, table, rows } = setup([])
    await api.insert(makeTask({ id: ID_A, title: '新規' }))
    const sent = table.insert.mock.calls[0][0]
    expect('user_id' in sent).toBe(false)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: ID_A, title: '新規', user_id: USER_ID })
  })

  it('update: 指定した id の行を、変更した列だけ更新する', async () => {
    const { api, rows } = setup()
    await api.update(ID_A, { title: '更新後', dueDate: '', completed: true, completedAt: 5000 })
    expect(rows.find((r) => r.id === ID_A)).toMatchObject({
      title: '更新後',
      due_date: null,
      completed: true,
      completed_at: new Date(5000).toISOString(),
    })
    expect(rows.find((r) => r.id === ID_B)?.completed).toBe(false)
  })

  it('update: 変更がなければ通信しない', async () => {
    const { api, table } = setup()
    await api.update(ID_A, {})
    expect(table.update).not.toHaveBeenCalled()
  })

  it('remove / removeMany: 指定した行だけを削除する', async () => {
    const { api, rows } = setup()
    await api.remove(ID_A)
    expect(rows.map((r) => r.id)).toEqual([ID_B])
    await api.removeMany([ID_B])
    expect(rows).toHaveLength(0)
  })

  it('removeMany: 空配列なら通信しない', async () => {
    const { api, table } = setup()
    await api.removeMany([])
    expect(table.delete).not.toHaveBeenCalled()
  })

  it('importMany: 既にある id は上書きせず、無いものだけ追加する', async () => {
    const { api, table, rows } = setup([makeTask({ id: ID_A, title: '既存' })])
    await api.importMany([makeTask({ id: ID_A, title: '上書きされない' }), makeTask({ id: ID_B, title: '追加' })])
    expect(table.upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: 'id',
      ignoreDuplicates: true,
    })
    expect(rows.map((r) => r.title)).toEqual(['既存', '追加'])
  })

  it('importMany: 空配列なら通信しない', async () => {
    const { api, table } = setup()
    await api.importMany([])
    expect(table.upsert).not.toHaveBeenCalled()
  })

  it('Supabase がエラーを返したら例外にする(呼び出し側で失敗として扱える)', async () => {
    const { api, table } = setup()
    table.insert.mockResolvedValueOnce({ error: { message: 'boom' } } as never)
    await expect(api.insert(makeTask({ id: ID_A }))).rejects.toThrow('boom')
  })
})
