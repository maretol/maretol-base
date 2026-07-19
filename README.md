# maretol-base

個人サイト [maretol.xyz](https://www.maretol.xyz) のソースコード

## 概要

このプロジェクトは、Cloudflare Workers を活用した個人サイトのモノレポジトリです。Next.js ベースの公開サイト・管理ページと、複数の Edge Workers を npm workspaces で統合的に管理しています。

現在、外部 CMS（microCMS）から Cloudflare D1 ベースの内製 CMS への移行を進めています。

## アーキテクチャ

```
maretol-base/
├── pages/                  # 公開サイト (Next.js + OpenNext → Cloudflare Workers)
├── admin-pages/            # 内製CMSの管理ページ (Next.js + OpenNext → Cloudflare Workers)
├── cms-data-fetcher/       # CMS データ取得 Worker
├── ogp-data-fetcher/       # OGP データ取得 Worker
├── cms-cache-purger/       # CMS キャッシュ削除 Worker
├── sns-article-publisher/  # SNS 自動投稿 Worker
├── cms-db/                 # 内製CMSの D1 スキーマ管理・microCMS データインポート
├── e2e/                    # staging 環境に対する E2E テスト (Playwright)
└── packages/               # 共有パッケージ
    ├── api-types/          # API の型定義
    ├── cms-cache-key-gen/  # CMS キャッシュキー生成処理
    └── md-converter/       # Markdown → 現行CMS互換HTML 変換処理
```

## 技術スタック

- **フロントエンド**: Next.js (App Router) + React + TypeScript + Tailwind CSS
- **インフラ**: Cloudflare Workers / D1 / KV / R2
- **デプロイアダプタ**: OpenNext (`@opennextjs/cloudflare`)
- **パッケージ管理**: npm workspaces
- **CMS**: microCMS（内製 CMS への移行作業中）
- **CI/CD**: GitHub Actions
- **テスト**: Vitest（Workers）/ Playwright（E2E）

## セットアップ

### 前提条件

- Node.js 22 以上
- npm 10 以上
- Wrangler CLI (v4)

### インストール

```bash
git clone https://github.com/maretol/maretol-base.git
cd maretol-base
npm install
```

### 環境変数

各ワークスペースの `.dev.vars` ファイルに環境変数を設定してください：

```bash
# pages/.dev.vars
CMS_API_KEY=your_microcms_api_key

# その他必要な環境変数
```

## 開発

### 全サービスの起動

```bash
npm run dev
```

`dev.sh` スクリプトが CMS Worker・OGP Worker を起動した後、公開サイトの Next.js dev server を起動します。Worker のログは `dev_cms.log` / `dev_ogp.log` に出力されます。

### 個別サービスの起動

```bash
# 公開サイト
npm run next-dev:page    # Next.js dev server
npm run dev:page         # OpenNext ビルド + Wrangler dev (本番環境に近い動作確認)

# 管理ページ
npm run next-dev:admin   # Next.js dev server
npm run dev:admin        # OpenNext ビルド + Wrangler dev

# Workers
npm run dev:cms          # CMS データ取得 Worker
npm run dev:ogp          # OGP データ取得 Worker
npm run dev:sns          # SNS 投稿 Worker
npm run dev:cms-webhook  # キャッシュ削除 Worker
```

### ポート番号

| サービス | Next.js dev | Wrangler dev |
| --- | --- | --- |
| pages | 3000 | 9593 |
| admin-pages | 3001 | 9601 |
| cms-data-fetcher | - | 8787 |
| ogp-data-fetcher | - | 45678 |
| cms-cache-purger | - | 30223 |
| sns-article-publisher | - | 30254 |

## 各ワークスペースの詳細

### pages

公開サイト本体。Next.js (App Router) を OpenNext でビルドし、Cloudflare Workers にデプロイします（Worker 名: `maretol-base-v3`）。

### admin-pages

内製 CMS の管理ページ。記事の作成・編集・公開を行います。pages と同様に Next.js + OpenNext 構成で、D1（`maretol-cms`）・KV・Service Binding（sns-article-publisher）を利用します。ログインは Cloudflare Access で保護するため、アプリ側に認証機能は持ちません。

### cms-data-fetcher

microCMS からコンテンツを取得する Worker。API キーによる認証が必要。

### ogp-data-fetcher

外部サイトの OGP 情報を取得し、Cloudflare KV にキャッシュする Worker。

### cms-cache-purger

CMS の更新時に呼び出される Webhook を受け取り、関連するキャッシュを削除する Worker。

### sns-article-publisher

新規記事公開時に各種 SNS（Twitter/X、Bluesky、Nostr）に自動投稿する Worker。

### cms-db

内製 CMS の D1 データベース（`maretol-cms`）のマイグレーション管理と、microCMS からのデータインポートスクリプト群。

```bash
# マイグレーション
npm run --workspace=cms-db migrate:local   # ローカル D1 に適用
npm run --workspace=cms-db migrate:remote  # リモート D1 に適用

# microCMS からのデータ移行
npm run --workspace=cms-db export               # microCMS データのエクスポート
npm run --workspace=cms-db generate-sql:blog    # ブログ記事の SQL 生成
npm run --workspace=cms-db generate-sql:illust  # イラストの SQL 生成
npm run --workspace=cms-db generate-sql:comic   # マンガの SQL 生成
```

## デプロイ

### GitHub Actions による自動デプロイ

- **本番環境**: `main` ブランチへのプッシュ（マージ）で自動デプロイ
- **ステージング環境**: `main` への Pull Request 作成時に自動デプロイ
  - Workers: `[worker-name]-stg` としてデプロイ
- **ドライラン**: `development` への Pull Request 作成時にビルド確認を実行

### 手動デプロイ

```bash
# 本番環境
npm run deploy:page
npm run deploy:admin
npm run deploy:cms
npm run deploy:ogp
npm run deploy:cms-webhook
npm run deploy:sns

# ステージング環境
npm run deploy-stg:page
npm run deploy-stg:admin
```

## シークレット管理

### Workers のシークレット

```bash
wrangler secret put <KEY> --env <ENV>
```

- `ENV` は `production` または `staging`
- ローカルでは `.secrets` ファイルで管理（Git 管理外）

## テスト

```bash
npm run test:cms   # cms-data-fetcher (Vitest)
npm run test:sns   # sns-article-publisher (Vitest)
npm run test:md    # md-converter (Vitest)
npm run test:e2e   # staging 環境に対する E2E テスト (Playwright)
```

## リント

```bash
npm run lint:page
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## 作者

maretol

## 関連リンク

- [個人サイト](https://www.maretol.xyz)
