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

## M3. illust を縦に一本通す（最初の実データ移行） ✅（2026-07-11 完了）

最小サービスで D1 移行の全経路を検証する。移行全体の設計検証ポイント

- [x] cms-db ワークスペースの新設（migrations/ + scripts/、root workspaces へ追加）
- [x] illust スキーマのマイグレーション作成（0001_create_illust_tables.sql。ローカルD1で適用・検証済み）
- [x] microCMS エクスポート（scripts/export_microcms.ts）・SQL生成（scripts/generate_illust_sql.ts）スクリプト実装（ID・タイムスタンプ保持。tmp/ のサンプルデータでローカルD1へ投入検証済み）
- [x] cms-data-fetcher にサービス単位で参照先を切り替える仕組みを実装（vars の ATELIER_SOURCE: 'microcms' | 'd1'、src/d1.ts に D1 クエリ層。markdownレコードの配信時変換込み）
- [x] ローカル実機検証（wrangler dev + ローカルD1 で /cms/atelier の一覧・単体・ページネーション・ParsedContent 付与が microCMS 互換であることを確認）
- [x] D1 データベース作成（maretol-cms: 58e13952-…）と database_id の反映
- [x] リモートD1へマイグレーション適用と本番データのインポート（ateliers 4件 / tags 6件 / relations 8件を確認済み）
- [x] ステージング（-stg / dev-api.maretol.xyz）で表示検証（PR #1107 マージによるstgデプロイ後、動作確認済み 2026-07-11）
- [x] 本番切替（PR #1111 マージで本番デプロイ、動作確認済み 2026-07-11）

**成果物**: illust が microCMS 非依存で配信されている状態 → **達成**

## M4. 管理ページの雛形 + illust CRUD ✅（2026-07-11 完了）

- [x] admin-pages ワークスペースの新規立ち上げ（pages と同構成: Next.js 16 + OpenNext + Tailwind v4。D1バインディング済み、ダッシュボード+イラスト一覧（読み取りのみ）をローカルで動作確認済み 2026-07-11）
- [x] Cloudflare Access の設定（admin.maretol.xyz と workers.dev ドメインを対象に設定済み 2026-07-11。本番 routes 有効化、staging は Access 制御下の workers.dev で公開）
- [x] CIワークフロー（dryrun/stg/prd）への admin-pages ジョブ追加（npm ci + build:admin + wrangler deploy。path filter は admin-pages/** と packages/api-types/**）
- [x] illust の作成・編集・公開状態変更（status）画面（2026-07-11。一覧/新規/編集/タグ管理 + Server Actions。作成・DRAFT→PUBLISH遷移のタイムスタンプ運用・タグ関係の入れ替えをローカルで実機検証済み）
- [x] 保存時の CMS_CACHE パージを admin-pages に統合（atelier_ プレフィックス一括削除。M6のパージ統合のillust分を先行実施）
- [x] KV プレビュー機構（draftKey 互換）の初実装
  - [x] KV namespace CMS_DRAFT 新設（id: d472c0ea…）と admin-pages / cms-data-fetcher へのバインディング追加
  - [x] admin 側: プレビュー保存（D1に書かずKVへ、TTL 3日、キー draft_atelier_{id}）→ pages のプレビューURL発行
  - [x] cms-data-fetcher 側: draftKey 判定 → KV 参照 → D1 フォールバック（ユニットテスト + ローカル実機で有効/不正draftKey両経路を検証済み）
- [x] ステージング・本番へのデプロイと実環境での動作確認（PR #1117 マージ → 本番 admin.maretol.xyz で動作確認済み 2026-07-11）

**成果物**: illust の運用が完全に内製 CMS で回る状態 → **達成**

## M5. comic 移行（M3 + M4 の横展開） ✅（2026-07-11 完了）

- [x] comic スキーマのマイグレーション作成・リモートD1へ適用済み（0002_create_comic_tables.sql、2026-07-11）
- [x] SQL生成スクリプト（scripts/generate_comic_sql.ts。tmp/ サンプルでローカルD1へ投入検証済み）
- [x] 本番データのインポート（エクスポート → SQL生成 → リモートD1投入、2026-07-11）
- [x] cms-data-fetcher に COMIC_SOURCE 切替 + D1クエリ層（tag/series JOIN・JSON配列カラム展開・markdown配信時変換）+ draftKeyプレビュー対応（テスト76件パス、ローカル実機で一覧・単体・プレビュー・フォールバック検証済み）
- [x] 管理ページに comic の CRUD 画面を追加（一覧/新規/編集/タグ管理/シリーズ管理 + プレビュー保存 + 保存時の bande_dessinee_* キャッシュパージ。作成・プレビューをローカル実機検証済み。発行日はJST日付→UTC変換）
- [x] ステージング検証（PR #1120 マージ後、動作確認済み 2026-07-11）
- [x] 本番切替（PR #1122 → development → main マージで本番デプロイ、動作確認済み 2026-07-11）

**成果物**: comic が microCMS 非依存で運用されている状態 → **達成**

## M6. blog 移行 + 仕上げ

最大ボリューム。blog 本体に加え連携系の置き換えと microCMS の撤去まで行う

- [x] blog スキーマのマイグレーション作成・リモートD1へ適用済み（0003_create_blog_tables.sql、2026-07-11。blog_categories に表示順保持の sort_order を追加）
- [x] SQL生成スクリプト（scripts/generate_blog_sql.ts。contents/categories/info/static対応、staticは全キーをkey-value行に展開。tmp/ サンプルでローカルD1へ投入検証済み）
- [x] 本番データのインポート（2026-07-11 完了。リモートD1: contents 94件 / categories 26件 / info 4件 / static 15キー）
- [x] cms-data-fetcher の blog 参照先を D1 に切替（BLOG_SOURCE。staging=d1 / 本番=microcms 設定済み）
  - [x] offset / limit・totalCount、タグ AND 絞り込み（GROUP BY + HAVING）、is_secret の一覧除外・単体取得許可、secret_meta 取得、tags（sort_order順）、info、static（key-value集約）の再現。テスト82件パス + ローカル実機で全API検証済み 2026-07-11
  - [x] draftKey プレビュー（本文 + secret_meta のドラフト優先参照）
- [x] 管理ページに blog の CRUD 画面を追加（2026-07-11。記事: 一覧/新規/編集 + カテゴリ・OGP・sns_text・限定公開（is_secret/secret_code）+ Markdownプレビュー保存。カテゴリ管理（sort_order末尾追加）、固定ページ（info）の一覧/新規/編集、静的文言（static）のキー別編集）
- [x] キャッシュパージの CMS 側統合（blog: contents_プレフィックス+content_{id}、カテゴリ→tags、info→info、static→static。illust/comicは実施済み）
- [x] SNS 通知の実装（Service Binding + **RPC方式**（publishArticle）。バインディング自体が同一アカウント内認証のためAPIキー・HMAC署名を排除＝シークレット設定不要。新規公開・下書き→公開のみ、is_secret除外、SNS_NOTIFY_ENABLED=true の環境のみ送信＝staging誤投稿防止）
- [ ] ステージング検証 → 本番切替（BLOG_SOURCE を 'd1' へ）
- [ ] 撤去: microCMS SDK・API キー・cms-cache-purger の削除（**ユーザー指示により保留中**。切替後の安定確認まで残す）
- [ ] microCMS 契約解除（最終ゴール達成）

**成果物**: cms_goal.md の最終ゴールが達成された状態
