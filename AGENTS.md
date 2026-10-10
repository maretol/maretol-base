# リポジトリガイドライン

## プロジェクト概要（Overview）

個人サイト [maretol.xyz](https://www.maretol.xyz) のモノレポジトリ。Cloudflare Workers/Pages を活用したエッジコンピューティングアーキテクチャで、ブログ、イラスト、マンガなどのコンテンツを配信する。

### 構成
- `/pages-astro/` - 公開サイト（Astro + React の Island、Workers Cache。設計は `astro_design.md`）
- `/admin-pages/` - 内製 CMS の管理ページ（Next.js + OpenNext、Cloudflare Access）
- `/cms-data-fetcher/` - CMS データ取得 Worker
- `/ogp-data-fetcher/` - OGP 情報取得・キャッシュ Worker
- `/sns-article-publisher/` - SNS 自動投稿 Worker（Twitter/X, Bluesky, Misskey, Nostr）
- `/packages/` - 共有パッケージ（api-types, cache-tags, md-converter）

## コーディング規約（Coding Style Guidelines）

- **言語**: TypeScript (strict mode)
- **Formatter**: Prettier（`.prettierrc.json` 参照）
- **型チェック**: `npm run check:astro`（pages-astro の `astro check`）、各 Worker は `tsc`
- **命名規則**:
  - コンポーネント: PascalCase（例: `BlogCard`）
  - ファイル（ユーティリティ）: snake_case（例: `searchParams.ts`）
  - 関数: camelCase
- **Path Alias**: `@/` は pages-astro では `src/`、admin-pages ではワークスペース直下にマッピング

## セキュリティ（Security considerations）

- API キー・認証情報は `.secrets` および環境変数で管理（`.gitignore` 済み）
- SNS 投稿用の認証情報（Twitter, Bluesky, Misskey, Nostr）は Workers の secrets で管理

## ビルド＆テスト手順（Build & Test）

### 必要環境
- Node.js 22+
- npm 10+
- Wrangler CLI

### コマンド
```bash
npm install            # 依存関係インストール
npm run dev            # 全サービス起動（プロジェクトルートで実行）
npm run dev:astro      # 公開サイトのみ起動（CMS / OGP Worker を別に起動しておく）
npm run build:astro    # 公開サイトのビルド
npm run check:astro    # 公開サイトの型チェック
npm run test:cms       # CMS Worker テスト
npm run test:sns       # SNS Worker テスト
```

### 開発環境の起動
- **実行場所**: プロジェクトルート (`/home/.../maretol-base/`) で実行。`/pages-astro/` ディレクトリではない
- **`npm run dev`**: `dev.sh` を実行し、以下の3サービスを起動
  1. `cms-data-fetcher` - CMS データ取得 Worker（必須）
  2. `ogp-data-fetcher` - OGP 情報取得 Worker
  3. `astro dev` - 公開サイトの開発サーバー（`localhost:4321`）
- **注意**: `npm run dev:astro` は公開サイトのみ起動するため、CMS / OGP Worker が無いとデータ取得ができない
- **テストページ**: `localhost:4321/blog/test` - レイアウト確認用ページ

## Git ワークフロー（Git workflow）

- **PR の向き先**: PR を作成する際のマージ先ブランチは、基本的に `development` にする
- `main` はリリース用ブランチのため、直接 PR を向けない

## 知識＆ライブラリ（Knowledge & Library）

### MCP Server
- **Playwright MCP**: E2E テストやブラウザ操作の検証時に利用する
  - テスト用ページ: `/blog/test` - ほぼすべての CMS 記法が使用されている検証用ページ

### 主要ライブラリ
- **公開サイト**: Astro + @astrojs/cloudflare（Hono で Worker を組む。`pages-astro/src/worker.ts`）
- **管理ページ**: Next.js + @opennextjs/cloudflare
- **CMS**: 内製（D1 + admin-pages）
- **UI**: Radix UI, shadcn/ui, Tailwind CSS 4, Lucide React icons
- **テスト**: Vitest + @cloudflare/vitest-pool-workers

### 独自仕様
- CMS 記事内の独自文法あり
  - `/cms_doc.md` - 人間向けドキュメント
  - `.kiro/steering/cms_doc.md` - AI 向け steering ドキュメント
  - 画像: `URL@@key::value` 形式
  - 引用元: `cite::` 記法
  - コマンド: `/table_of_contents`, `/nofetch_url`, `/gmaps`

### ブログ記事レイアウト設計
- **コンテナベース管理**: 左右の余白は親コンテナ（`pages-astro/src/components/article/ArticleContent.astro`）の `px-2 lg:px-6` で統一管理
- **各要素のマージン**: 個別要素に `mx-*` を設定せず、コンテナのパディングに依存
- **見出し装飾**: 装飾（下線、左ボーダー、ドット）は負のマージン (`-ml-*`) でコンテンツ領域の外に突き出す
- **縦スペーシング**:
  - 見出し下: `pb-3` で統一
  - 段落: `my-2`
  - リスト: `py-4`
  - リンクカード/画像: `py-4`
  - 引用: `py-3`
  - 水平線: `my-8`

## メンテナンス\_ポリシー（Maintenance policy）

- 会話の中で繰り返し指示されたことがある場合は反映を検討すること
- 冗長だったり、圧縮の余地がある箇所を検討すること
- 簡潔でありながら密度の濃い文書にすること
