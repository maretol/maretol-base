# Copilot Instructions

## プロジェクト概要

個人サイト [maretol.xyz](https://www.maretol.xyz) のモノレポジトリ。Cloudflare Workers/Pages を活用したエッジコンピューティングアーキテクチャ。

## リポジトリ構成

```
pages/              # Next.js フロントエンド（App Router）
cms-data-fetcher/   # microCMS データ取得 Worker
ogp-data-fetcher/   # OGP 情報取得・キャッシュ Worker
cms-cache-purger/   # CMS Webhook 処理 Worker
sns-article-publisher/ # SNS 自動投稿 Worker
packages/           # 共有パッケージ（型定義、ユーティリティ）
```

## 前提条件

- Node.js 22+、npm 10+
- Cloudflare Workers 環境（Wrangler CLI）
- Workers 間は Service Bindings で通信
- 環境分離: staging/production を wrangler.toml の env で管理

## レビュー方針

レビューでは以下のセキュリティ観点を重視してください。問題を発見した場合は具体的なリスクと修正案を日本語で指摘してください。

### 入力値の検証

- クエリパラメータやリクエストボディの値を外部 API やデータベースに渡す前に、適切なバリデーションがあるか確認する
- URL を受け取るパラメータ（例: OGP 取得の `target`）に対して、プロトコルやドメインの検証が行われているか確認する。未検証の URL を `fetch()` に渡す処理は **SSRF（Server-Side Request Forgery）** のリスクがある
- ページネーションパラメータ（`offset`, `limit`）に上限値が設定されているか確認する。上限なしの場合、大量データ取得によるリソース枯渇を引き起こす
- パスパラメータや ID 値が想定外の形式（パストラバーサル等）を含まないか確認する

### 認証・認可

- API キーの比較には **タイミングセーフな比較**（`crypto.timingSafeEqual` 等）を使用しているか確認する。単純な `===` 比較はタイミング攻撃のリスクがある
- Webhook の署名検証には HMAC + `timingSafeEqual` を使用する（本プロジェクトの `cms-cache-purger` と `sns-article-publisher` の実装を参考にする）
- 下書きコンテンツ（`draftKey`）へのアクセスに適切なアクセス制御があるか確認する

### 秘密情報の管理

- API キー、トークン、シークレットがソースコードにハードコードされていないか確認する
- 環境変数や Cloudflare Secrets Store を通じて管理されているか確認する
- ログ出力にシークレットやトークンが含まれていないか確認する

### 外部通信

- 外部 API 呼び出し時にタイムアウトが設定されているか確認する
- 外部から取得したデータ（OGP 情報、CMS レスポンス等）をそのまま HTML に埋め込む場合、XSS のリスクがないか確認する
- `fetch()` のレスポンスに対してステータスコードの確認やエラーハンドリングが適切か確認する

### レスポンスとヘッダー

- エラーレスポンスが内部実装の詳細（スタックトレース、内部パス等）を漏洩していないか確認する
- 認証エラーと権限エラーで適切な HTTP ステータスコード（401 / 403）を使い分けているか確認する

### Cloudflare Workers 固有

- `wrangler.toml` に不要な権限やバインディングが追加されていないか確認する
- KV や Cache API の操作でキーインジェクションのリスクがないか確認する
- Service Bindings 経由の通信でも、呼び出し元の検証が適切か確認する

## 使用言語

レビューコメントやコード提案の説明は日本語にしてください。
