-- ToDo アプリ用のテーブルと Row Level Security (RLS)
--
-- 使い方: Supabase ダッシュボード → SQL Editor → New query に、このファイルの内容を
-- すべて貼り付けて Run してください。何度実行しても同じ結果になります(再実行OK)。
--
-- 方針:
--   * 各タスクは user_id(= ログインしたユーザーの id)を持つ。user_id は挿入時に
--     DB 側で auth.uid() が自動で入るので、アプリから他人の id を指定することはできない。
--   * RLS を有効にし、「自分の user_id の行」だけを 参照・追加・更新・削除 できるようにする。
--     未ログイン(anon)には何も許可しない。

create table if not exists public.tasks (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  due_date     date,                                   -- 期限なしは NULL
  priority     text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  category     text not null default 'other'  check (category in ('research', 'job', 'class', 'other')),
  memo         text not null default '',
  subtasks     jsonb not null default '[]'::jsonb,     -- [{ "id": "...", "title": "...", "completed": false }]
  completed    boolean not null default false,
  completed_at timestamptz,                            -- 完了にした時刻(未完了・不明は NULL)
  created_at   timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);

-- ---- Row Level Security ----
alter table public.tasks enable row level security;

-- 未ログイン(anon)には、そもそもテーブルへの権限を与えない(RLS と二重で守る)
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- update: 自分の行だけを対象にでき、user_id を他人に書き換えることもできない
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
