# maretol-base

個人サイト [maretol.xyz](https://www.maretol.xyz) のソースコード

## 概要

このプロジェクトは、Cloudflare Workers と Pages を活用した個人サイトのモノレポジトリです。複数の Edge Workers と Next.js ベースのフロントエンドを統合的に管理しています。

## アーキテクチャ

```
maretol-base/
├── pages/                  # Next.js フロントエンド (Cloudflare Pages)
├── cms-data-fetcher/       # CMS データ取得 Worker
├── ogp-data-fetcher/       # OGP データ取得 Worker
├── cms-cache-purger/       # CMS キャッシュ削除 Worker
├── sns-article-publisher/  # SNS 自動投稿 Worker
└── packages/               # 共有パッケージ（型定義など）
```

## 技術スタック

- **フロントエンド**: Next.js (App Router) + TypeScript + Tailwind CSS
- **インフラ**: Cloudflare Workers & Pages
- **パッケージ管理**: npm workspaces
- **CMS**: microCMS
- **デプロイ**: GitHub Actions

## セットアップ

### 前提条件

- Node.js 22 以上
- npm 10 以上
- Wrangler CLI

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

`dev.sh` スクリプトが全ての Workers と Next.js を起動します。

### 個別サービスの起動

```bash
# Next.js フロントエンド
npm run next-dev:page    # Next.js dev server
npm run dev:page         # Wrangler dev (本番環境に近い動作確認)

# Workers
npm run dev:cms         # CMS データ取得 Worker
npm run dev:ogp         # OGP データ取得 Worker
npm run dev:sns         # SNS 投稿 Worker
npm run dev:cms-webhook # キャッシュ削除 Worker
```

### ポート番号

各サービスは以下のポートで起動します：

- Pages: 3000 (Next.js) / 8788 (Wrangler)
- CMS Fetcher: 8787
- OGP Fetcher: 8789
- その他: 各 `wrangler.toml` を参照

## Workers の詳細

### CMS Data Fetcher

microCMS からコンテンツを取得する Worker。API キーによる認証が必要。

### OGP Data Fetcher

外部サイトの OGP 情報を取得し、Cloudflare KV に 72 時間キャッシュする Worker。

### CMS Cache Purger

CMS の更新時に呼び出される Webhook を受け取り、関連するキャッシュを削除する Worker。

### SNS Article Publisher

新規記事公開時に各種 SNS（Twitter/X、Bluesky、Nostr）に自動投稿する Worker。

## デプロイ

### GitHub Actions による自動デプロイ

- **本番環境**: `main` ブランチへのマージで自動デプロイ
- **ステージング環境**: `development` ブランチへのプッシュで自動デプロイ
  - Workers: `[worker-name]-stg` としてデプロイ
  - Pages: プレビュー URL が生成される

### 手動デプロイ

```bash
# 本番環境
npm run deploy:page
npm run deploy:cms
npm run deploy:ogp
npm run deploy:cms-webhook
npm run deploy:sns

# ステージング環境
npm run deploy-stg:page
```

## シークレット管理

### Workers のシークレット

```bash
wrangler secret put <KEY> --env <ENV>
```

- `ENV` は `production` または `staging`
- ローカルでは `.secrets` ファイルで管理（Git 管理外）

### Pages のシークレット

Cloudflare ダッシュボードから設定してください。

## テスト

```bash
npm run test:cms
npm run test:sns
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
