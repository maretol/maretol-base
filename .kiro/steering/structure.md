# Project Structure

## Organization Philosophy

モノレポ構成で、npm workspaces を使用。フロントエンド（pages）と複数の Edge Workers、共有パッケージを統合管理。

## Directory Patterns

### Frontend (Next.js)
**Location**: `/pages/`
**Purpose**: App Router ベースの Next.js フロントエンド
**構成**:
- `app/`: ページとルーティング（App Router 規約に準拠）
- `components/`: 再利用可能なコンポーネント
- `lib/`: ユーティリティ関数、API クライアント

### Workers
**Location**: `/{worker-name}/`
**Purpose**: Cloudflare Workers として動作する個別サービス
**例**:
- `cms-data-fetcher/`: microCMS データ取得
- `ogp-data-fetcher/`: OGP 情報取得・キャッシュ
- `cms-cache-purger/`: CMS Webhook 処理
- `sns-article-publisher/`: SNS 自動投稿

### Shared Packages
**Location**: `/packages/`
**Purpose**: ワークスペース間で共有する型定義・ユーティリティ
**例**:
- `api-types/`: API の型定義
- `cms-cache-key-gen/`: キャッシュキー生成ロジック

## Naming Conventions

- **Files (Components)**: PascalCase または snake_case（既存コードに従う）
- **Files (Utilities)**: snake_case（例: `searchParams.ts`）
- **Components**: PascalCase（例: `BlogCard`, `LoadingArticle`）
- **Functions**: camelCase

## Component Organization

### サイズベースの分類
```
components/
├── large/      # ページレベルのレイアウトコンポーネント
├── middle/     # セクションレベルのコンポーネント
├── small/      # 最小単位のコンポーネント
├── ui/         # shadcn/ui ベースの汎用 UI コンポーネント
└── drawers/    # Drawer 専用コンポーネント
```

## Import Organization

```typescript
// Path alias（pages/ 内）
import { Something } from '@/lib/api'
import { Button } from '@/components/ui/button'

// Relative imports for local modules
import { LocalUtil } from './utils'
```

**Path Aliases**:
- `@/`: pages/ ディレクトリルートにマッピング

## Code Organization Principles

- **App Router 規約**: Next.js App Router の規約（page.tsx, layout.tsx, loading.tsx 等）に準拠
- **Colocation**: 関連するファイル（page, layout, error, loading）は同一ディレクトリに配置
- **Workers 独立性**: 各 Worker は独自の `src/index.ts` をエントリポイントとして持つ

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
