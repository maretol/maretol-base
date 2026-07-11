# CMS移行 マイルストーン

cms_goal.md のゴール・決定事項を前提とした作業の区切り。各マイルストーンは独立して完結し、次に着手しなくても中途半端な状態が残らない単位とする

進捗は各項目のチェックボックスで管理する

## M1. 設計の確定 ✅（2026-07-10 完了）

残っている設計項目を確定し、設計完了状態にする。コードには触れない

- [x] D1 のテーブル定義（DDL）の確定（static は key-value 方式）
- [x] Markdown 変換ライブラリの選定 → **markdown-it**
- [x] 管理ページの Markdown エディタ方針の確定 → **素の textarea で開始・エディタ内プレビューなし（実プレビューは draftKey 経由）**
- [x] SNS 通知のペイロード形式の確定 → **現行 WebhookPayload 完全互換（sns-article-publisher 無改修）**
- [x] microCMS からのデータインポート手段の確定 → **JSON エクスポート → SQL 生成 → wrangler d1 execute の2段階方式**

**成果物**: cms_design.md（DDL 全文・選定理由・microCMS クエリ対応表を含む）

## M2. Markdown 変換器の実装 ✅（2026-07-10 完了）

`packages/md-converter` に Markdown → 互換 HTML 変換器を実装する（配信時に cms-data-fetcher が import して「Markdown → 互換 HTML → 既存 parse()」と繋ぐ）。どこからも呼ばれない状態でマージ可能な独立した単位

- [x] packages/md-converter ワークスペースの新設（workspaces は packages/* で自動包含のため root への追加は test:md スクリプトのみ）
- [x] Markdown → 互換 HTML 変換の実装（markdown-it）
  - [x] 見出しの `@@index_target` 記法（span.index 付与・FNV-1a による決定的な id 生成、全見出しに id 付与）
  - [x] インライン HTML の素通し（装飾系タグのホワイトリスト方式。iframe 等はエスケープしてテキスト保持 ※理由は cms_design.md）
  - [x] コードブロック ` ```lang:filename ` → `<div data-filename="...">` 変換（ファイル名なしでも div で包む）
  - [x] URL 自動リンク無効化（単行 URL・コマンド行をプレーンな `<p>` で出力）
  - [x] `cite::` 行のリンク記法解釈の抑止（実装中に発見した pages 互換要件）
- [x] テスト: ユニット23件（packages/md-converter/test/）+ parse() との統合10件（cms-data-fetcher/test/md_converter_integration.spec.ts）で HTML 入力と同等の ParsedContent（目次・注釈・p_option・sub_texts）になることを検証。全62件パス

**成果物**: テスト済みの変換モジュール packages/md-converter

## M3. illust を縦に一本通す（最初の実データ移行）

最小サービスで D1 移行の全経路を検証する。移行全体の設計検証ポイント

- [x] cms-db ワークスペースの新設（migrations/ + scripts/、root workspaces へ追加）
- [x] illust スキーマのマイグレーション作成（0001_create_illust_tables.sql。ローカルD1で適用・検証済み）
- [x] microCMS エクスポート（scripts/export_microcms.ts）・SQL生成（scripts/generate_illust_sql.ts）スクリプト実装（ID・タイムスタンプ保持。tmp/ のサンプルデータでローカルD1へ投入検証済み）
- [x] cms-data-fetcher にサービス単位で参照先を切り替える仕組みを実装（vars の ATELIER_SOURCE: 'microcms' | 'd1'、src/d1.ts に D1 クエリ層。markdownレコードの配信時変換込み）
- [x] ローカル実機検証（wrangler dev + ローカルD1 で /cms/atelier の一覧・単体・ページネーション・ParsedContent 付与が microCMS 互換であることを確認）
- [ ] 【要リモート作業】D1 データベース作成（`wrangler d1 create maretol-cms` → database_id を cms-db/wrangler.toml と cms-data-fetcher/wrangler.toml の2箇所に反映）
- [ ] 【要リモート作業】リモートD1へマイグレーション適用（cms-db で `npm run migrate:remote`）と本番データのインポート
- [ ] ステージング（-stg / dev-api.maretol.xyz）で表示検証（staging は ATELIER_SOURCE=d1 設定済み）
- [ ] 本番切替（cms-data-fetcher/wrangler.toml のトップレベル ATELIER_SOURCE を 'd1' に変更してデプロイ）

**成果物**: illust が microCMS 非依存で配信されている状態

## M4. 管理ページの雛形 + illust CRUD

- [ ] admin-pages ワークスペースの新規立ち上げ（pages と同構成: Next.js + OpenNext 想定）
- [ ] Cloudflare Access の設定（独自認証は作らない）
- [ ] illust の作成・編集・公開状態変更（status）画面
- [ ] KV プレビュー機構（draftKey 互換）の初実装
  - [ ] 専用 KV namespace（CMS_DRAFT 等）の新設と cms-data-fetcher へのバインディング追加
  - [ ] cms-data-fetcher 側の draftKey 判定 → KV 参照 → D1 フォールバック

**成果物**: illust の運用が完全に内製 CMS で回る状態

## M5. comic 移行（M3 + M4 の横展開）

- [ ] comic スキーマ適用・データインポート（ID 保持）
- [ ] cms-data-fetcher の comic 参照先を D1 に切替（ステージング検証 → 本番）
- [ ] 管理ページに comic の CRUD 画面を追加（tag / series 含む）

**成果物**: comic が microCMS 非依存で運用されている状態

## M6. blog 移行 + 仕上げ

最大ボリューム。blog 本体に加え連携系の置き換えと microCMS の撤去まで行う

- [ ] blog スキーマ適用・データインポート（contents / categories / info / static、ID 保持）
- [ ] cms-data-fetcher の blog 参照先を D1 に切替
  - [ ] offset / limit・totalCount、タグ AND 絞り込み、is_secret 除外、secret_meta 取得の再現
- [ ] 管理ページに blog の CRUD 画面を追加（新規記事は Markdown）
- [ ] キャッシュパージの CMS 側統合（cms-cache-key-gen 再利用、公開・更新時に KV パージ）
- [ ] SNS 通知の実装（新規記事公開時に sns-article-publisher へ通知）
- [ ] ステージング検証 → 本番切替
- [ ] 撤去: microCMS SDK・API キー・cms-cache-purger の削除
- [ ] microCMS 契約解除（最終ゴール達成）

**成果物**: cms_goal.md の最終ゴールが達成された状態
