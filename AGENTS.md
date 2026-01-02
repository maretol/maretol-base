# リポジトリガイドライン

## プロジェクト概要（Overview）

個人サイト [maretol.xyz](https://www.maretol.xyz) のモノレポジトリ。Cloudflare Workers/Pages を活用したエッジコンピューティングアーキテクチャで、ブログ、イラスト、マンガなどのコンテンツを配信する。

### 構成
- `/pages/` - Next.js 15 (App Router) + React 19 フロントエンド
- `/cms-data-fetcher/` - microCMS データ取得 Worker
- `/ogp-data-fetcher/` - OGP 情報取得・キャッシュ Worker
- `/cms-cache-purger/` - CMS Webhook 処理 Worker
- `/sns-article-publisher/` - SNS 自動投稿 Worker（Twitter/X, Bluesky, Nostr）
- `/packages/` - 共有パッケージ（api-types, cms-cache-key-gen）

## コーディング規約（Coding Style Guidelines）

- **言語**: TypeScript (strict mode)
- **Formatter**: Prettier（`.prettierrc.json` 参照）
- **Linter**: ESLint（Next.js 設定ベース）
- **命名規則**:
  - コンポーネント: PascalCase（例: `BlogCard`）
  - ファイル（ユーティリティ）: snake_case（例: `searchParams.ts`）
  - 関数: camelCase
- **Path Alias**: `@/` は `/pages/` ディレクトリにマッピング

## セキュリティ（Security considerations）

- API キー・認証情報は `.secrets` および環境変数で管理（`.gitignore` 済み）
- microCMS API キーは Cloudflare Workers の環境変数として設定
- SNS 投稿用の認証情報（Twitter, Bluesky, Nostr）は Workers の secrets で管理

## ビルド＆テスト手順（Build & Test）

### 必要環境
- Node.js 22+
- npm 10+
- Wrangler CLI

### コマンド
```bash
npm install            # 依存関係インストール
npm run dev            # 全サービス起動（プロジェクトルートで実行）
npm run next-dev:page  # Pages のみ起動（CMSデータ取得不可）
npm run build:page     # ビルド
npm run test:cms       # CMS Worker テスト
npm run test:sns       # SNS Worker テスト
npm run lint:page      # Lint 実行
```

### 開発環境の起動
- **実行場所**: プロジェクトルート (`/home/.../maretol-base/`) で実行。`/pages/` ディレクトリではない
- **`npm run dev`**: `dev.sh` を実行し、以下の3サービスを起動
  1. `cms-data-fetcher` - CMS データ取得 Worker（必須）
  2. `ogp-data-fetcher` - OGP 情報取得 Worker
  3. `next dev` - Next.js 開発サーバー（`localhost:3000`）
- **注意**: `npm run next-dev:page` は Next.js のみ起動するため、CMS からのデータ取得ができない
- **テストページ**: `localhost:3000/blog/test` - レイアウト確認用ページ

## 知識＆ライブラリ（Knowledge & Library）

### MCP Server
- **Playwright MCP**: E2E テストやブラウザ操作の検証時に利用する
  - テスト用ページ: `/blog/test` - ほぼすべての CMS 記法が使用されている検証用ページ

### 主要ライブラリ
- **Next.js 連携**: @opennextjs/cloudflare（Cloudflare Pages 向けアダプタ）
- **CMS**: microcms-js-sdk
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
- **コンテナベース管理**: 左マージンは親コンテナ (`article_content/index.tsx`) の `pl-3` で統一管理
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
