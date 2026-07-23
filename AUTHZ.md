# 認可（Authorization）仕様

このドキュメントは実装コードを読んで作成した現状の認可仕様であり、想像やあるべき論では書いていない。
実装を変更した場合は本ドキュメントも追随して更新すること。

## 1. 認証の仕組み（前提）

- 認証は `@auth/core`（Google OAuth） + `@convex-dev/auth` で行う。
  - プロバイダ設定: `convex/auth.ts:1-17`
  - ログイン/ユーザー作成時のフック `afterUserCreatedOrUpdated`（`convex/auth.ts:18-34`）で、
    Google のメールアドレスから役割(`role`)を自動算出して `users` テーブルに書き込む。
- 役割の算出元は環境変数 `ADMIN_EMAILS`（カンマ区切り、Convex 環境変数のみ・コードに埋め込まない）。
  - `convex/lib/adminEmails.ts:5-20` の `resolveRoleForEmail()`。
  - **`ADMIN_EMAILS` に載っているメールアドレスだけが実質的な admin 判定の正本**。
- サーバ側で認証済みユーザー ID を取得する共通関数は `getAuthUserId(ctx)`（`@convex-dev/auth/server`）。
  未認証なら `null` を返す。

## 2. ロール一覧

実装上存在するロールは次の 2 つのみ（`convex/schema.ts:5`, `:40`）。

| ロール | 値 | 判定方法 |
|---|---|---|
| 一般ユーザー | `users.role === "user"`（未設定時のデフォルト扱い） | `ADMIN_EMAILS` に載っていないメール |
| 管理者 | `users.role === "admin"` | `ADMIN_EMAILS` に載っているメール |
| （非ロール）未認証 | `getAuthUserId(ctx) === null` | Cookie/JWT なし |

### 注意: `event_members.member_role`（`"member" | "admin"`）は認可には使われていない

`convex/schema.ts:62` に `member_role` という別カラムがあるが、これは管理画面での表示ラベル用のメタデータに過ぎず
（`convex/bootstrap.ts:37,52,60` で `users.role` から機械的に複製されるだけ）、
**どの `query`/`mutation` の認可判定にも参照されていない**。認可の正本は常に `users.role` である。
実装を触る際、この2つの role を混同しないこと。

## 3. ロール × リソース × 操作 マトリクス

| リソース | 操作 | 未認証 | 一般ユーザー（本人） | 一般ユーザー（他人） | 管理者 | 実装箇所 |
|---|---|---|---|---|---|---|
| bring_items（持ち込み品） | 一覧閲覧（同一イベントの active 全件、他人の分も含む） | 拒否 | 許可 | 許可（※仕様上、全員分が見える共有リスト） | 許可 | `convex/bringItems.ts:57-89`（`requireUser` 呼び出し L60） |
| bring_items | 単体取得（編集用 `getForEdit`） | 拒否 | 許可（自分の item） | **拒否**（`null` を返す＝存在も伏せる） | 許可（任意の item） | `convex/bringItems.ts:91-100`（`canManageItem` L97） |
| bring_items | 作成（`create`） | 拒否 | 許可（常に自分名義で作成） | N/A（他人名義では作成不可） | 許可 | `convex/bringItems.ts:102-161`（`requireUser` L114） |
| bring_items | 更新（`update`） | 拒否 | 許可（自分の item） | **拒否**（`編集する権限がありません`） | 許可（任意の item） | `convex/bringItems.ts:163-213`（`canManageItem` L181-183） |
| bring_items | 取消（`cancel`） | 拒否 | 許可（自分の item） | **拒否**（`削除する権限がありません`） | 許可（任意の item） | `convex/bringItems.ts:215-232`（`canManageItem` L223-225） |
| bring_items | 全件閲覧（`admin.listBringItemsForEvent`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:76-87`（`requireAdmin` L79） |
| bring_items | 管理者経由の更新（`admin.updateBringItem`） | 拒否 | 拒否 | 拒否 | 許可（所有者チェックなし） | `convex/admin.ts:229-271`（`requireAdmin` L242） |
| bring_items | 管理者経由のステータス変更（`admin.setBringItemStatus`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:273-290`（`requireAdmin` L279） |
| events（イベント） | 一覧閲覧（`admin.listEvents`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:37-45`（`requireAdmin` L40） |
| events | 更新（`admin.updateEvent`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:89-158`（`requireAdmin` L100） |
| event_members（イベント参加者） | 一覧閲覧（`admin.listEventMembers`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:63-74`（`requireAdmin` L66） |
| event_members | 更新（`admin.updateEventMember`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:160-206`（`requireAdmin` L169） |
| event_members | 削除（`admin.deleteEventMember`） | 拒否 | 拒否 | 拒否 | 許可（ただし紐づく bring_items がある場合はビジネスルールで拒否） | `convex/admin.ts:208-227`（`requireAdmin` L211、紐付けチェック L216-223） |
| event_members | 自分の参加登録の作成/更新（`bootstrap.ensureEventMembership`） | 拒否 | 許可（**自分の行のみ** upsert、他人の行は触れない） | N/A | 許可（自分の行のみ、同関数） | `convex/bootstrap.ts:7-67`（`getAuthUserId` L10、`by_event_and_user` で自分の行のみ検索 L39-44） |
| users（ユーザー） | 自分の情報閲覧（`users.viewer`） | `null` を返す | 許可（自分の行のみ） | N/A | 許可（自分の行のみ、同関数） | `convex/users.ts:4-19` |
| users | 全ユーザー一覧閲覧（`admin.listUsers`） | 拒否 | 拒否 | 拒否 | 許可 | `convex/admin.ts:47-61`（`requireAdmin` L50） |
| users | 他ユーザーのプロフィール変更（role/is_active/name）（`admin.updateUserAppProfile`） | 拒否 | 拒否 | 拒否 | 許可（任意のユーザーに対して） | `convex/admin.ts:292-326`（`requireAdmin` L300） |

## 4. ルーティング層（Next.js middleware）の位置づけ

`src/proxy.ts` は **認証ゲートのみ**を行い、**ロール（admin かどうか）は見ていない**。

- 未認証で `/admin` にアクセス → `/login?next=/admin` へリダイレクト（`src/proxy.ts:27-35`）。
- 未認証以外はそのまま通す。**一般ユーザーが認証済みのまま `/admin` にアクセスした場合、
  ミドルウェアはブロックしない。**

`/admin` ページの実際の保護は二重構成になっている。

1. クライアント側 UI 制御: `src/app/(app)/admin/page.tsx:93-108` で `viewer.isAdmin` が false なら
   「管理者権限がありません」という文言のみを表示し、管理画面のフォーム自体をレンダリングしない
   （UX 上の防御であり、これ単体はセキュリティ境界にならない）。
2. サーバ側の実強制: 上記マトリクスの通り、`convex/admin.ts` の全関数が `requireAdmin()` を
   呼び出しており、これが実質的な認可境界。クライアントの JS を無視して直接 Convex の
   `admin.*` 関数を呼んでも、一般ユーザーは必ず `Error: 管理者権限が必要です` で拒否される。

## 5. 既知の問題（実装バグ・要フォローアップ）

### 5.1 `is_active = false`（アカウント無効化）が一切強制されていない [重要]

管理画面には「有効」チェックボックスがあり、`admin.updateUserAppProfile`
（`convex/admin.ts:292-326`）経由で任意のユーザーの `is_active` を `false` にできる。
しかし:

- `requireUser()`（`convex/bringItems.ts:20-30`）も `requireAdmin()`（`convex/admin.ts:17-27`）も
  `is_active` を一切参照していない。ユーザー行が存在しさえすれば通過する。
- さらに、ログイン時 (`convex/auth.ts:27-32` の `afterUserCreatedOrUpdated`) と
  `bootstrap.ensureEventMembership`（`convex/bootstrap.ts:21-25`）の両方で、
  呼び出しのたびに `is_active: true` へ**強制的に上書き**される。

結果として、管理画面の「無効化」機能は事実上のノーオペレーションであり、
無効化したはずのユーザーが引き続き持ち込み品の作成・編集・取消を行える。
これは認可上の期待（無効化されたユーザーはアクセスを拒否されるべき）に反する実バグと判断した。

再現・検証は `convex/bringItems.test.ts` の
`describe("[既知の懸念] is_active=false（無効化済み）ユーザーの扱い")` 内のテストで行っており、
**意図的に red のまま残してある**（本タスクのスコープでは実装を修正しない）。

### 5.2 `bring_items` の一覧閲覧は「全員分」が見える設計（バグではなく仕様と判断）

`listActiveForDefaultEvent`（`convex/bringItems.ts:57-89`）は認証済みであれば誰でも、
同一イベントの active な持ち込み品を **他人の分も含めて全件** 閲覧できる。
これは「持ち寄りイベントの共有リスト」というアプリの性質上、意図された挙動と判断した
（各行の `canEdit` はあくまで UI 用のヒントであり、実際の書き込み可否は
`update`/`cancel` 側の `canManageItem` チェックで別途強制されている）。
ただし、閲覧単位を「他人には見せたくない」という要件に将来変わった場合は、
このクエリ自体にもユーザー単位のフィルタが必要になる点は留意する。

## 6. Contract test（deny-by-default の検証）

- `convex/bringItems.test.ts` — 持ち込み品の所有者チェック・`getForEdit` の deny-by-default・
  未認証拒否・admin 例外・`is_active` バグの再現。
- `convex/admin.test.ts` — `convex/admin.ts` の全公開関数について、一般ユーザー/未認証からの
  呼び出しが `管理者権限が必要です`／`認証が必要です` で拒否されることを検証。

テストランナー: `vitest` + `convex-test`（Convex 公式が案内する mock バックエンド）。
`npm test`（= `vitest run`）で実行する。
