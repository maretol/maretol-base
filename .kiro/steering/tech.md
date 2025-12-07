# Technology Stack

## Architecture

モノレポ構成でフロントエンド（Next.js on Cloudflare Pages）と複数の Edge Workers を統合管理。npm workspaces でパッケージ間の依存関係を管理。

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Frontend Framework**: Next.js 15 (App Router) + React 19
- **Runtime**: Cloudflare Workers / Pages
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui パターン

## Key Libraries

- **Next.js 連携**: @opennextjs/cloudflare（Cloudflare Pages 向けアダプタ）
- **CMS**: microcms-js-sdk（microCMS 公式 SDK）
- **UI**: Radix UI primitives, Lucide React icons, Swiper
- **Utility**: clsx, tailwind-merge, class-variance-authority

## Development Standards

### Type Safety
- TypeScript strict mode 有効
- Cloudflare Workers types による型定義

### Code Quality
- ESLint（Next.js 設定ベース）
- Prettier によるフォーマット

### Testing
- Vitest + @cloudflare/vitest-pool-workers（Workers テスト用）

## Development Environment

### Required Tools
- Node.js 22+
- npm 10+
- Wrangler CLI

### Common Commands
```bash
# Dev (全サービス): npm run dev
# Dev (Pages): npm run next-dev:page
# Build: npm run build:page
# Test: npm run test:cms / npm run test:sns
# Lint: npm run lint:page
```

## Key Technical Decisions

- **OpenNext.js**: Next.js を Cloudflare Pages 上で動作させるためのアダプタを採用
- **Service Bindings**: Workers 間は Cloudflare Service Bindings で通信
- **環境分離**: staging/production 環境を wrangler.toml の env で管理

---
_Document standards and patterns, not every dependency_
