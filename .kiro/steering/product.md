# Product Overview

個人サイト [maretol.xyz](https://www.maretol.xyz) のモノレポジトリ。Cloudflare Workers/Pages を活用したエッジコンピューティングアーキテクチャで、ブログ、イラスト、マンガなどのコンテンツを配信する。

## Core Capabilities

- **コンテンツ配信**: ブログ記事、イラスト、マンガの閲覧機能
- **CMS 連携**: microCMS からのデータ取得とキャッシュ管理
- **OGP 取得**: 外部サイトの OGP 情報を取得・キャッシュ
- **SNS 自動投稿**: 新規記事公開時に Twitter/X、Bluesky、Nostr へ自動投稿
- **Webhook 処理**: CMS 更新時のキャッシュパージ

## Target Use Cases

- 個人ブログとして記事の執筆・公開
- イラスト・マンガのポートフォリオ公開
- 各種 SNS への記事の自動共有

## Value Proposition

- **エッジファースト**: Cloudflare のエッジネットワークを活用した高速配信
- **モノレポ統合管理**: フロントエンドと複数 Workers を一元管理
- **ヘッドレス CMS 連携**: microCMS による柔軟なコンテンツ管理

---
_Focus on patterns and purpose, not exhaustive feature lists_
