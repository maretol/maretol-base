# maretol-base

個人サイト [maretol.xyz](https://www.maretol.xyz) のソースコード

## 概要

このプロジェクトは、Cloudflare Workers を活用した個人サイトのモノレポジトリです。Astro の公開サイト、Next.js の管理ページと、複数の Edge Workers を npm workspaces で統合的に管理しています。

コンテンツは Cloudflare D1 ベースの内製 CMS で管理しています（microCMS から移行済み）。

## アーキテクチャ

```
maretol-base/
├── pages-astro/            # 公開サイト (Astro → Cloudflare Workers)
├── admin-pages/            # 内製CMSの管理ページ (Next.js + OpenNext → Cloudflare Workers)
├── cms-data-fetcher/       # CMS データ取得 Worker
├── ogp-data-fetcher/       # OGP データ取得 Worker
├── sns-article-publisher/  # SNS 自動投稿 Worker
├── cms-db/                 # 内製CMSの D1 スキーマ管理
├── e2e/                    # staging 環境に対する E2E テスト (Playwright)
└── packages/               # 共有パッケージ
    ├── api-types/          # API の型定義
    ├── cache-tags/         # 公開サイトのキャッシュタグ（付ける側の pages-astro とパージする側の admin-pages で共有）
    └── md-converter/       # Markdown → 現行CMS互換HTML 変換処理
```

## 技術スタック

- **公開サイト**: Astro + React（Island）+ TypeScript + Tailwind CSS（`@astrojs/cloudflare`）
- **管理ページ**: Next.js (App Router) + React + TypeScript + Tailwind CSS（OpenNext `@opennextjs/cloudflare`）
- **インフラ**: Cloudflare Workers / Workers Cache / D1 / KV / R2 / Secrets Store
- **パッケージ管理**: npm workspaces
- **CMS**: 内製（D1 + admin-pages）
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

各ワークスペースの `.dev.vars` ファイルに環境変数を設定してください。公開サイト（pages-astro）が Secrets Store から読む値は、ローカルの Secrets Store に作ります（`--remote` を付けなければローカルに作られます）。

```bash
cd pages-astro
npx wrangler secrets-store secret create <store_id> --name <NAME> --value <VALUE> --scopes workers
```

## 開発

### 全サービスの起動

```bash
npm run dev
```

`dev.sh` スクリプトが CMS Worker・OGP Worker を起動した後、公開サイトの Astro dev server（`astro dev`）を起動します。Worker のログは `dev_cms.log` / `dev_ogp.log` に出力されます。

### 個別サービスの起動

```bash
# 公開サイト
npm run dev:astro        # Astro dev server（CMS Worker・OGP Worker を先に起動しておく）

# 管理ページ
npm run next-dev:admin   # Next.js dev server
npm run dev:admin        # OpenNext ビルド + Wrangler dev

# Workers
npm run dev:cms          # CMS データ取得 Worker
npm run dev:ogp          # OGP データ取得 Worker
npm run dev:sns          # SNS 投稿 Worker
```

### ポート番号

| サービス | dev server | Wrangler dev |
| --- | --- | --- |
| pages-astro | 4321 | - |
| admin-pages | 3001 | 9601 |
| cms-data-fetcher | - | 8787 |
| ogp-data-fetcher | - | 45678 |
| sns-article-publisher | - | 30254 |

## 各ワークスペースの詳細

### pages-astro

公開サイト本体。Astro でビルドし、Cloudflare Workers にデプロイします（Worker 名: `maretol-base-v4`、custom domain `www.maretol.xyz`）。ページは Workers Cache に保存し、admin-pages での保存時にタグ単位でパージします。設計は `astro_design.md`。

### admin-pages

内製 CMS の管理ページ。記事の作成・編集・公開を行います。Next.js + OpenNext 構成で、D1（`maretol-cms`）・KV・Service Binding（sns-article-publisher）を利用します。ログインは Cloudflare Access で保護するため、アプリ側に認証機能は持ちません。

### cms-data-fetcher

内製 CMS の D1（`maretol-cms`）からコンテンツを取得する Worker。pages-astro からは Service Binding の RPC で呼びます。HTTP の入口（`api.maretol.xyz`）は呼び出し元がなく、#1305 で閉じる予定です。

### ogp-data-fetcher

外部サイトの OGP 情報を取得し、Cloudflare KV にキャッシュする Worker。

### sns-article-publisher

新規記事公開時に各種 SNS（Twitter/X、Bluesky、Misskey、Nostr）に自動投稿する Worker。admin-pages から Service Binding の RPC で呼ぶため、HTTP の入口は持ちません。

### cms-db

内製 CMS の D1 データベース（`maretol-cms`）のマイグレーション管理。

```bash
# マイグレーション
npm run --workspace=cms-db migrate:local   # ローカル D1 に適用
npm run --workspace=cms-db migrate:remote  # リモート D1 に適用
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
npm run deploy:astro
npm run deploy:admin
npm run deploy:cms
npm run deploy:ogp
npm run deploy:sns

# ステージング環境
npm run deploy-stg:astro
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

## 型チェック

```bash
npm run check:astro   # pages-astro (astro check)
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## 作者

maretol

## 関連リンク

- [個人サイト](https://www.maretol.xyz)
