# 持ち込み管理（MVP）

Next.js・Convex・Google 認証で、イベントの持ち込み品を登録・一覧・編集します。

## ローカル開発

### 初回だけ（Convex をまだ紐付けていない場合）

1. `npm install`
2. `npx convex dev` を一度実行し、表示に従って **Convex にログイン**し、プロジェクトをこのフォルダに紐付ける。
  成功すると `.env.local` に `NEXT_PUBLIC_CONVEX_URL` などが入る。
3. **単一イベントのシード**（DB にイベントが無いときだけ）:
  `npm run convex:seed`  
   うまくいかないときは `npx convex run --push seed:seedDefaultEvent`（Convex が起動中であること）。

### いつもの起動（1 本のコマンド）

```bash
npm run dev:local
```

Convex のウォッチと Next.js（[http://localhost:3000](http://localhost:3000)）が同時に立ち上がります。止めるときは `Ctrl+C` で両方止まります。

### 2 ターミナルで分ける場合

- ターミナル 1: `npm run convex:dev`（`convex dev`）
- ターミナル 2: `npm run dev`

### `404 ... /deployment/dev/.../team_and_project`（`npx convex dev` 時）

Convex CLI（`node_modules/convex/.../deploymentSelector.js`）は **`CONVEX_DEPLOYMENT` を `:` で分割**します。`jawsmt-logi:dev/yukihiro-shinoda` は **2分割**され、2番目が `dev/yukihiro-shinoda` のまま API パス `deployment/dev/yukihiro-shinoda/...` になり **404** になりがちです。

**確実なのは、ダッシュボードに出ているデプロイ名スラッグ**（例: `acrobatic-peacock-364`。`xxx-yyy-数字` の形式）をそのまま使うことです。

```env
CONVEX_DEPLOYMENT=acrobatic-peacock-364
```

値は **Settings → General のデプロイ名**（URL の `https://その名前.convex.cloud` のホスト名）と一致させます。迷ったら `npx convex deployment select` を対話で実行し、生成された `.env.local` の 1 行をそのまま使ってください。

### `auth:signIn` で `Error: fetch failed`（ログイン直後）

Next のミドルウェアが **Convex の URL へ `fetch` できていない**ときのエラーです。

1. **`npx convex dev` を動かしているターミナルが生きているか**（止めると、`.env.local` が `127.0.0.1:3210` のときは必ず失敗します）。
2. **`.env.local` の `NEXT_PUBLIC_CONVEX_URL` が、いまのデプロイと一致しているか**  
   `CONVEX_DEPLOYMENT=anonymous:anonymous-agent` のままだと、過去の匿名用の **127.0.0.1** が残りがちです。`npx convex login` 後にプロジェクトを紐付けたなら、[Convex ダッシュボード](https://dashboard.convex.dev/) の該当デプロイ → **Settings → Deployment URL** にある **`https://....convex.cloud`** を `NEXT_PUBLIC_CONVEX_URL` に設定し直してください（ターミナルに `npx convex dev` が表示した URL でも可）。
3. どちらにせよ **`.env.local` を直したら `npm run dev` と `npx convex dev` を両方再起動**する。
4. それでもダメなら、試しに `http://127.0.0.1:3210` を **`http://localhost:3210`** に変える（Windows で Edge ランタイムの挙動差の回避例）。

### Google ログインをローカルで試すには

上記だけでは **ログイン UI までは開けますが、Google ログインを通すには** Convex に `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` と `SITE_URL`（例: `http://localhost:3000`）の設定が必要です。手順は下記「Google OAuth（Convex）」を参照してください。

`.env.example` もあわせて参照してください。

### 「A local backend is still running on port 3210」

別ターミナルで **`convex dev` や `npm run dev:local` がまだ動いている**と出ます。まずそのターミナルで **`Ctrl+C`** で止めてから、もう一度 `npx convex dev` を実行してください。

止めたつもりでも残るときは、プロジェクト直下で次を実行すると **ローカル Convex が使う 3210 / 3211** のプロセスを終了しやすくなります（`kill-port` を devDependency で入れています）。

```bash
npm run convex:kill-local-backend
```

その後、再度 `npx convex dev` または `npm run dev:local` を実行してください。

うまくいかない場合のみ、手動でポートを確認します（**お使いの PC での操作**）。

**Windows（Git Bash から）** — PID を確認:

```bash
cmd //c "netstat -ano | findstr :3210"
```

行末の数字が PID です。終了:

```bash
cmd //c "taskkill /PID <PID> /F"
```

`<PID>` を実際の数値に置き換えてください。複数行出た場合は `LISTENING` している行の PID を優先します。

## Google OAuth（Convex）

### リポジトリ側（済）

`convex/auth.ts` で Google プロバイダは有効です。**このリポジトリに追加のコード修正は不要**です。

### あなたが Convex / Google で行うこと（代行不可）

#### A. HTTP Actions URL を確認

Convex → **jawsmt-logi** → **Development** → **Settings → General** の **HTTP Actions URL** を開く（例: `https://acrobatic-peacock-364.convex.site`）。  
※ホスト名はデプロイごとに違うので、**画面に表示された文字列**を使う。

#### B. Google Cloud Console

1. [認証情報](https://console.cloud.google.com/apis/credentials) → **OAuth 2.0 クライアント ID**（種類は **ウェブアプリケーション**）。
2. **承認済みのリダイレクト URI** に、次を **1 行そのまま**追加（A のホストに合わせる）:

   `https://acrobatic-peacock-364.convex.site/api/auth/callback/google`

3. **承認済みの JavaScript 生成元** に `http://localhost:3000`。
4. **保存**。

#### C. Convex の Environment Variables（同じ Development デプロイ）

**Settings → Environment Variables** に（[Convex Auth: Google](https://labs.convex.dev/auth/config/oauth/google)）:

| 名前 | 値 |
|------|-----|
| `AUTH_GOOGLE_ID` | Google のクライアント ID |
| `AUTH_GOOGLE_SECRET` | Google のクライアント シークレット |
| `SITE_URL` | `http://localhost:3000` |

**JWT（必須）:** Google だけではログインできません。Development に **`JWT_PRIVATE_KEY`** と **`JWKS`** が無いと、Convex ログに `Missing environment variable JWT_PRIVATE_KEY` と出ます。プロジェクト直下で対話セットアップを実行し、表示に従って **同じ Development デプロイ** に鍵を書き込んでください。

```bash
npm run convex:auth-jwt
```

（中身は `npx @convex-dev/auth`。`SITE_URL` の確認や `tsconfig` の案内が出る場合は、ローカルならそのまま進めて問題ありません。既に `JWT_PRIVATE_KEY` があると上書き確認が出ます。）

**重要:** `AUTH_GOOGLE_*` は **Next の `.env.local` ではなく Convex にだけ** 設定する。

確認（値が表示されるので人の見えない場所で）:

```bash
npm run convex:env
```

保存後 **`npx convex dev` と `npm run dev` を再起動**。

#### D. OAuth 同意画面が「テスト」のとき

ログイン後にブロックされる場合、[同意画面](https://console.cloud.google.com/apis/credentials/consent) の **テストユーザー**に使う Gmail を追加する。

### 「OAuth client was not found」/ 401 invalid_client

**Convex の `AUTH_GOOGLE_ID` と Google のウェブクライアントが一致していない**ときのエラーです。B の **リダイレクト URI のホスト**が A と同じか、C の **ID/シークレットがそのクライアントのものか**を確認。迷ったら **Google でウェブクライアントを新規作成 → B と C を入れ直す**のが早いです。

## 管理者

管理画面は **`/admin`**。未ログインで開くと **`/login?next=/admin`** へ誘導され、ログイン後に戻ります。ログイン URL 自体は **`/login`**（本番は `https://<サイト>/login`）。

管理者メールは **Convex の環境変数 `ADMIN_EMAILS` のみ**（カンマ区切り・小文字化して照合）で判定する。コードへの埋め込みはしない。`NEXT_PUBLIC_` には付けないこと。ローカルでも `npx convex env set ADMIN_EMAILS you@example.com` などで必ず設定する（未設定だと管理者ロールが付かない）。

## Vercel へのデプロイ

1. [Convex](https://www.convex.dev/) で本番デプロイを用意し、本番用の Google OAuth クライアントとコールバック URL（本番の `*.convex.site`）を設定する。
2. Convex 本番に `SITE_URL`（例: `https://your-app.vercel.app`）、`AUTH_GOOGLE_`*、`ADMIN_EMAILS`、`JWT_PRIVATE_KEY` / `JWKS`（`npx @convex-dev/auth` が設定済みなら流用）を入れる。
3. [Vercel](https://vercel.com/) でリポジトリをインポートし、環境変数 `NEXT_PUBLIC_CONVEX_URL`（本番 Convex の URL）を設定する。
4. 本番で一度 `npx convex run seed:seedDefaultEvent --prod`（またはダッシュボードから Functions）でイベントをシードする。

## 技術スタック

- Next.js 16（App Router）
- Convex + [Convex Auth](https://labs.convex.dev/auth)（Google）

