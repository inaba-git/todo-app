# ToDoリスト

React + TypeScript で作成したシンプルな ToDo 管理 Web アプリです。タスクの追加・完了・削除に加え、期限日と優先度の設定ができ、メールアドレスだけでログイン(マジックリンク)でき、タスクはアカウントに紐づけて [Supabase](https://supabase.com/) に保存されるため、スマホでも PC でも同じ一覧が見られます。

## デモ

公開URL: https://coruscating-bombolone-43927f.netlify.app

GitHubリポジトリ: https://github.com/inaba-git/todo-app

## 主な機能

- **ログイン(マジックリンク方式)**: メールアドレスを入力すると、ログイン用のリンクがメールで届きます(パスワード不要)。ログインしていないときは、メールアドレス入力欄だけのログイン画面を表示。ヘッダー下の「ログアウト」で、この端末だけログアウトできます
- **アカウントごとのデータ同期**: タスクは Supabase のデータベースに保存され、同じアカウントなら別の端末でも同じ一覧が見られます(タブに戻ったときに最新の内容を読み直し)。Row Level Security(RLS)により、自分のタスクしか見えず・操作できません
- **端末内のタスクの取り込み**: ログイン機能の追加前にこの端末の localStorage に保存していたタスクがあれば、初回ログイン時に「アカウントに取り込むか」を確認します(端末のデータは削除しません)

- タスクの追加 / 完了(チェック) / 削除(空のタスク名は追加不可)
- 完了済みセクションの折りたたみと「完了済みをすべて削除」(確認ダイアログ付き)
- タスクごとの期限日の設定(期限切れは赤、今日が期限のものは橙で強調)
- タスクごとの優先度(高・中・低)の設定と色分け表示(赤・橙・緑)
- 未完了タスクと完了済みタスクを別セクションに分けて表示
- リスト表示 / カレンダー表示(月表示)のタブ切り替え
  - 期限日のマスにタスクを優先度の色で表示(件数バッジ付き)
  - 前月・翌月・今日への移動、日付クリックでその日のタスク一覧を表示(完了・削除も可能)
- タスクの編集(タスク名・期限日・優先度・カテゴリ・メモ・サブタスク。タスク名クリックまたは「編集」ボタンで開始、Esc キーでキャンセル)
- カテゴリ(研究 / 就活 / 授業 / その他)の設定とバッジ表示
- タスク名の検索、優先度・カテゴリでの絞り込み(リスト・カレンダー両方に反映、「条件をクリア」で一括解除)。「🔍 検索・絞り込み」をクリックして開閉し、初期状態は折りたたみ(条件が効いたまま折りたたむと「絞り込み中」と表示)
- リスト表示の並び替え(追加した順 / 期限日が近い順 / 優先度が高い順。同順位は追加順で安定、期限なしは最後)
- 統計・進捗表示(全体の完了率、優先度別・カテゴリ別の件数、期限切れ件数、直近7日の期限件数)。検索・絞り込みに関係なく常に全タスクを集計。「📊 統計」をクリックして開閉し、初期状態は折りたたみ(折りたたみ中は「完了 0%」などの要約を表示)
- 統計と検索・絞り込みの開閉状態は localStorage に保存され、次回も同じ状態で開く
- サブタスク(チェックリスト): 各タスクに小項目を追加・完了・名前変更・削除でき、親タスクに「2/5 完了」と進捗バーを表示
- メモ・詳細欄: 追加・編集フォームに複数行のメモ欄。メモがあるタスクには「📝 」と1行プレビューを表示し、クリックで全文を表示
- 振り返りグラフ(統計の「振り返り」タブ): 直近7日間の日別・直近4週間の週別の完了タスク数を棒グラフで表示。完了にした時刻を記録して集計
- ダークモード(ヘッダーの 🌙 / ☀️ ボタンで切り替え。選択は保存され、初回は OS の設定に合わせる)
- 自動保存: タスクは Supabase に、表示タブ・並び順・統計と検索・絞り込みの開閉・テーマは各端末の localStorage に保存

## 使用技術

- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 7(`strict` モード)
- [Vite](https://vite.dev/) 7
- プレーン CSS(ライブラリ不使用)
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)(テスト)
- [Supabase](https://supabase.com/)(認証: メールのマジックリンク / データベース: PostgreSQL + Row Level Security)
- localStorage(Web Storage API。表示設定の保存用)

## セットアップ(Supabase)

ログイン機能とデータ同期には Supabase のプロジェクトが必要です。

1. **テーブルと RLS を作成**: Supabase ダッシュボードの **SQL Editor** で、`supabase/schema.sql` の内容をすべて貼り付けて実行します(何度実行しても同じ結果になります)。
2. **ログイン後の戻り先を許可**: **Authentication → URL Configuration** で、次を設定します。
   - Site URL: 公開URL(例: `https://coruscating-bombolone-43927f.netlify.app`)
   - Redirect URLs: 公開URLと、ローカル開発用の `http://localhost:5173` を追加(例: `https://coruscating-bombolone-43927f.netlify.app/**`、`http://localhost:5173/**`)
3. **環境変数を設定**: `.env.example` を `.env` にコピーして、Project URL と **Publishable key**(`sb_publishable_...`)を入れます。`.env` は `.gitignore` に入っており、Git には含まれません。secret key / service_role key は入れないでください。

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

### Netlify で公開するとき

- **Site configuration → Environment variables** に、上と同じ `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を追加し、**再デプロイ**します(値はビルド時に埋め込まれるので、追加しただけでは反映されません)。
- Netlify の「シークレットのスキャン」が、ビルド成果物に含まれるキーの値を検出して失敗する場合は、環境変数 `SECRETS_SCAN_OMIT_KEYS` に `VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY` を設定してください(publishable key はブラウザに渡ることを前提とした公開用の値です)。

## 使い方

```bash
npm install
npm run dev
```

表示された URL(通常 http://localhost:5173)をブラウザで開いてください。

その他のコマンド:

```bash
npm run build     # 型チェック(tsc)+ 本番用ビルド
npm run typecheck # 型チェックのみ
npm run test      # テストを実行(変更を監視して再実行)
npm run test:run  # テストを 1 回だけ実行
npm run preview   # ビルド結果の確認
```

## テスト

Vitest でロジック部分(関数・フック)を中心にテストしています(画面全体のテストは対象外)。

| ファイル | テスト内容 |
| --- | --- |
| `src/taskUtils.test.ts` | タスクの追加・編集・完了切り替え・削除、古い保存データの補完、優先度・カテゴリ・検索での絞り込み、並び替え(追加順・期限順・優先度順)、期限切れ・直近7日の判定、統計と完了率、サブタスクの進捗(例: 2/5 完了)、振り返りグラフの集計 |
| `src/dateUtils.test.ts` | 日付の加算(月またぎ・年またぎ・閏年)、ローカル日付での「今日」の判定、表示用の書式 |
| `src/useLocalStorage.test.ts` | localStorage への保存・読み込み(壊れたデータ・保存失敗時の動作、再読み込み後の復元) |
| `src/useTheme.test.ts` | ダークモードの初期値(OS 設定・保存値)、切り替えと保存 |
| `src/TodoApp.test.tsx` | 統計・検索絞り込みが初期状態で折りたたまれていること、開閉と localStorage への保存・復元、折りたたみ中の「絞り込み中」表示 |
| `src/useTasks.test.ts` | タスクの読み込み・追加・編集・削除の同期(楽観的更新、編集のまとめ送信、順序、失敗時の復元、別端末の変更の反映) |
| `src/taskRows.test.ts` / `src/tasksApi.test.ts` | アプリのタスクと DB の行の変換、Supabase への各操作(user_id を送らないこと、取り込みで既存を上書きしないこと など) |
| `src/App.test.tsx` | ログイン画面(メールアドレス欄のみ)、マジックリンクの送信、リンク期限切れ・送信エラーの表示、ログイン後の画面切り替え、ログアウト、端末のタスクの取り込み |
| `src/localTasks.test.ts` | 端末に保存されていたタスクの読み出し(壊れたデータの除外)と、取り込み確認の記録 |

- 追加・編集・削除や期限判定のロジックは、テストしやすいよう画面から切り離した純粋関数(`createTask` / `updateTaskById` / `toggleTaskById` / `deleteTaskById` / `isOverdue` / `isDueThisWeek` など)として `taskUtils.ts` に置いています。
- 「今日」の日付は引数で受け取る作りにして、テストが実行した日に左右されないようにしています。
- localStorage は jsdom 上で実際に読み書きし、保存の失敗などは `Storage.prototype` をモックして再現しています。
- Supabase へは実際に通信せず、メモリ上の偽物(`src/test/memoryApi.ts`、`src/test/fakeSupabase.ts`)に差し替えてテストしています。RLS はテスト用の偽物では検証できないため、`supabase/schema.sql` を実行した実環境で、2つの異なるアカウントでログインし、互いのタスクが見えないことを確認済みです。

## 工夫した点

- **RLS で「自分のタスクだけ」を DB 側で保証**: `tasks` テーブルの `user_id` は挿入時に DB が `auth.uid()` で自動設定します(アプリからは送らない)。参照・追加・更新・削除のすべてに「自分の `user_id` の行だけ」というポリシーを付け、未ログイン(anon)には権限を与えていません(`supabase/schema.sql`)。アプリ側の絞り込みに頼らず、DB が他人の行を返さない作りです。
- **楽観的更新 + 順序を守った保存**(`useTasks`): 操作はまず画面に反映し、保存は1件ずつ順番に行います(追加 → 編集 → 削除の順序が入れ替わらない)。サブタスク名の入力など細かい編集は 0.4 秒ぶんまとめて1回で送り、タブを隠す・ログアウトするときは送信待ちを先に保存します。保存に失敗したらエラーを表示して保存先の内容に戻し、未送信の編集があるときの読み直しは自分の編集を上書きしません。
- **ログアウトはこの端末だけ**(`signOut({ scope: 'local' })`): スマホで使っているセッションを、PC のログアウトで巻き込んで切らないようにしています。
- **localStorage 用のカスタムフック**(`useLocalStorage`)を作成し、状態の変更を自動で保存。保存データが壊れていたり、ストレージが使えない環境でもアプリが落ちないようにしています。
- **並び替えは比較関数の組み合わせ**(`taskUtils.ts` の `sortTasks`): 「期限日が近い順」は期限 → 優先度 → 追加順、「優先度が高い順」は優先度 → 期限 → 追加順の順で比較し、同順位でも並びが安定します。未完了・完了済みの両セクションに同じ並び順が適用されます。
- **期限の強調表示**: 期限切れは赤、今日が期限のものは橙で表示。日付判定はタイムゾーンのずれを避けるためローカル日付で行っています。
- **型定義は `types.ts` に集約**: `Task` / `Subtask` / `Priority` / `Category` などをここで定義し、コンポーネントの props や関数の引数・戻り値にも型を付けています。localStorage の古い保存データ(カテゴリ・サブタスク・メモ・完了日時が未設定)は `StoredTask` として別の型で表し、`normalizeTask` で `Task` に補完してから使うので、画面側のコードは常に完全な `Task` だけを扱えます。
- **コンポーネント分割**(`TaskForm` / `TaskList` / `TaskItem`)で役割を明確にし、読みやすく保守しやすい構成にしています。
- **カレンダーは外部ライブラリを使わず自前実装**(`Calendar.tsx`)。期限日ごとにタスクを集約して描画し、日付処理は `dateUtils.ts` に共通化しています。狭い画面ではタスク名の代わりに色付きの点で表示します。
- **優先度とカテゴリの見た目を分離**: 優先度は「左の帯+赤・橙・緑のバッジ」、カテゴリは「青・紫・水色・灰色の枠付きバッジ」にして、色が混ざらないようにしています。カレンダーでは小さな頭文字マーク(研・就・授・他)で示します。
- **既存データとの互換性**: カテゴリ・サブタスク・メモ・完了日時が未設定の古い保存データは、それぞれ「その他」・空のリスト・空文字・追加日時(完了済みの場合)として読み込みます。
- 追加フォームと編集フォームで入力欄(`TaskFields`)を共通化し、検索・絞り込み・並び替えのロジックは `taskUtils.ts` に分離しました。
- **開閉状態の保存**: 統計と検索・絞り込みの開閉は `useLocalStorage` で保存します(`todo-app.statsOpen.v2` / `todo-app.filtersOpen`)。統計は以前の版で初期値(開いている)が保存済みだったため、新しい初期値(折りたたみ)が既存の訪問者にも効くようキーを `.v2` に変えています。
- **統計は CSS だけの横棒で表示**(グラフライブラリ不使用)。集計ロジックは `computeStats` に切り出し、絞り込み前の全タスクを対象にすることで、検索中でも全体の進捗が分かります。折りたたむと「完了率・期限切れ件数」の一行サマリーだけになります。
- **サブタスクは1つのコンポーネント(`SubtaskEditor`)を2か所で再利用**: タスクの「☑ 2/5 完了」ボタンで開く詳細パネルでは変更が即保存され、編集モードの中では「保存」を押すまで下書きとして扱われます。サブタスク名は普通のテキストのように見え、クリックするとその場で編集できます。
- **振り返りグラフも CSS だけの棒グラフ**(`BarChart.tsx`、ライブラリ不使用)。タスクを完了にした瞬間に `completedAt` を保存し、未完了に戻すと消します。「週」は曜日始まりではなく、今日から数えた7日ごと4区間にして、日別グラフの合計と直近7日の週別グラフが必ず一致するようにしています。完了日時のない過去のタスクは追加日に完了したものとして数え、その旨を画面に注記します。
- **ダークモードは CSS 変数だけで切り替え**: 色はすべて `App.css` 先頭のテーマ変数(`<html data-theme="light|dark">` ごとに定義)に集約し、各コンポーネントの CSS は変数を参照するだけにしています。優先度・カテゴリの色はダーク用に明るくし、統計・カレンダー・フィルターなど全画面が同じ仕組みで切り替わります。`index.html` の小さなスクリプトで描画前にテーマを反映し、読み込み時のちらつきを防いでいます。
- チェックボックスや削除ボタンに `aria-label` を付け、スクリーンリーダーにも配慮しています。

## ディレクトリ構成

```
├── index.html
├── package.json
├── .env.example             # 必要な環境変数の例(.env は Git に含まれない)
├── supabase
│   └── schema.sql           # tasks テーブルと RLS(SQL Editor で実行)
├── vite.config.ts           # Vite と Vitest の設定
├── tsconfig.json          # tsconfig.app.json(アプリ用)と tsconfig.node.json(Vite 設定用)を参照
├── tsconfig.app.json
├── tsconfig.node.json
├── README.md
└── src
    ├── main.tsx
    ├── App.tsx           # ログインの有無で画面を切り替える(設定案内 / ログイン / ToDo)
    ├── TodoApp.tsx       # ログイン後のメイン画面
    ├── App.css
    ├── types.ts          # Task / Subtask / Priority / Category などの型定義
    ├── constants.ts
    ├── dateUtils.ts
    ├── taskUtils.ts
    ├── supabaseClient.ts # Supabase クライアント(接続情報は環境変数から)
    ├── useSession.ts     # ログイン中のセッション
    ├── useTasks.ts       # タスクの読み込み・楽観的更新・保存
    ├── tasksApi.ts       # Supabase の tasks テーブルへの操作
    ├── taskRows.ts       # タスク ⇔ DB の行 の変換
    ├── localTasks.ts     # 端末内(localStorage)のタスクの取り込み用
    ├── useLocalStorage.ts
    ├── useTheme.ts
    ├── vite-env.d.ts
    ├── *.test.ts(x)      # テスト
    ├── test
    │   ├── factories.ts      # テスト用のタスク作成ヘルパー
    │   ├── memoryApi.ts      # メモリ上の保存先(通信なし)
    │   └── fakeSupabase.ts   # Supabase クライアントの偽物
    └── components
        ├── BarChart.tsx
        ├── LoginScreen.tsx
        ├── LocalImportBanner.tsx
        ├── Calendar.tsx
        ├── FilterBar.tsx
        ├── MemoField.tsx
        ├── Stats.tsx
        ├── SubtaskEditor.tsx
        ├── TaskFields.tsx
        ├── TaskForm.tsx
        ├── TaskList.tsx
        └── TaskItem.tsx
```
