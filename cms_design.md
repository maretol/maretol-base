# CMS移行 設計ドキュメント（M1成果物）

cms_goal.md の決定事項を前提とした詳細設計。cms_milestones.md の M1 の成果物

## 1. D1 テーブル定義（DDL）

### 設計方針

- テーブルはサービスごとに分離し、プレフィックスで区別する（blog_ / bande_dessinee_ / atelier_）
- ID は TEXT 主キー。microCMS の既存 ID（URL に使用されているため）をそのまま格納する。新規作成時は管理ページがランダム文字列を生成する（microCMS 同様に任意のスラッグ指定も可能とする）
- タイムスタンプは microCMS 互換の ISO8601 文字列（TEXT）で `created_at` / `updated_at` / `published_at` / `revised_at` の4つを持つ。`published_at`（初公開日時）と `revised_at`（公開内容の最終更新日時）は未公開時 NULL
- 公開状態は `status` カラム（`PUBLISH` / `DRAFT` / `CLOSED`）
- 本文は `content` + `content_format`（`html` / `markdown`）。移行データは html、新規は markdown
- 要素数が少なく検索対象にならない配列（format, first_left_right）は JSON 文字列の TEXT で持つ
- 下書きプレビューは KV に分離するため、バージョン管理系のテーブルは持たない

### blog（maretol-blog 相当）

```sql
CREATE TABLE blog_contents (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('html', 'markdown')),
  ogp_image      TEXT,
  sns_text       TEXT,
  is_secret      INTEGER NOT NULL DEFAULT 0,
  secret_code    TEXT,
  status         TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  published_at   TEXT,
  revised_at     TEXT
);

-- 一覧クエリ（status='PUBLISH' AND is_secret=0 ORDER BY published_at DESC）用
CREATE INDEX idx_blog_contents_list ON blog_contents (status, is_secret, published_at DESC);

CREATE TABLE blog_categories (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

-- 記事⇔カテゴリの多対多。position は記事内での表示順
CREATE TABLE blog_content_categories (
  content_id  TEXT NOT NULL REFERENCES blog_contents(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_id, category_id)
);

CREATE INDEX idx_bcc_category ON blog_content_categories (category_id);

CREATE TABLE blog_info (
  id               TEXT PRIMARY KEY,
  page_pathname    TEXT NOT NULL UNIQUE,
  title            TEXT,
  main_text        TEXT NOT NULL,
  main_text_format TEXT NOT NULL DEFAULT 'markdown' CHECK (main_text_format IN ('html', 'markdown')),
  status           TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  published_at     TEXT,
  revised_at       TEXT
);

-- サイドバー等の静的文言。項目追加をマイグレーションなしにするため key-value で持つ
-- staticAPIResult へは cms-data-fetcher が組み立てる（timestamps は updated_at の最大値を使用）
CREATE TABLE blog_static (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### comic（maretol-comic 相当）

```sql
CREATE TABLE bande_dessinee_tags (
  id           TEXT PRIMARY KEY,
  tag_name     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE bande_dessinee_series (
  id           TEXT PRIMARY KEY,
  series_name  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE bande_dessinees (
  id                 TEXT PRIMARY KEY,
  title_name         TEXT NOT NULL,
  publish_date       TEXT,
  publish_event      TEXT,
  contents_url       TEXT NOT NULL,
  -- 前後の巻への参照。未作成のIDを先に入れられるよう FK 制約は付けない
  next_id            TEXT,
  previous_id        TEXT,
  tag_id             TEXT NOT NULL REFERENCES bande_dessinee_tags(id),
  series_id          TEXT REFERENCES bande_dessinee_series(id),
  cover              TEXT,
  back_cover         TEXT,
  format             TEXT NOT NULL,  -- JSON配列 例: '["png"]'
  filename           TEXT NOT NULL,
  first_page         INTEGER NOT NULL,
  last_page          INTEGER NOT NULL,
  first_left_right   TEXT NOT NULL,  -- JSON配列 例: '["left"]'
  description        TEXT NOT NULL DEFAULT '',
  description_format TEXT NOT NULL DEFAULT 'markdown' CHECK (description_format IN ('html', 'markdown')),
  status             TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  published_at       TEXT,
  revised_at         TEXT
);

CREATE INDEX idx_bande_dessinees_list ON bande_dessinees (status, published_at DESC);
```

### illust（maretol-illust 相当）

```sql
CREATE TABLE atelier_tags (
  id           TEXT PRIMARY KEY,
  tag          TEXT NOT NULL,
  -- '作品' | 'キャラクター' 等。API上は string[] だが運用上単一値のため TEXT で持ち、配信時に配列に包む
  type         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE ateliers (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  src                TEXT NOT NULL,
  object_position    TEXT NOT NULL DEFAULT 'center',
  description        TEXT,
  description_format TEXT NOT NULL DEFAULT 'markdown' CHECK (description_format IN ('html', 'markdown')),
  status             TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  published_at       TEXT,
  revised_at         TEXT
);

CREATE INDEX idx_ateliers_list ON ateliers (status, published_at DESC);

CREATE TABLE atelier_tag_relations (
  atelier_id TEXT NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES atelier_tags(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (atelier_id, tag_id)
);
```

### 主要クエリの対応表（microCMS API → SQL）

| 現行 microCMS クエリ | D1 での実現 |
| --- | --- |
| offset / limit + totalCount | `LIMIT ? OFFSET ?` + 同条件の `COUNT(*)` |
| `is_secret[not_equals]true` | `WHERE is_secret = 0` |
| `categories[contains]A[and]categories[contains]B` | relation テーブルを JOIN し `GROUP BY content_id HAVING COUNT(DISTINCT category_id) = 2` |
| `ids` 指定 | `WHERE id = ?` |
| `fields=id,is_secret,secret_code`（secret_meta） | `SELECT id, is_secret, secret_code` |
| `draftKey` | D1 ではなく KV（CMS_DRAFT）参照（cms_goal.md 参照） |
| デフォルトの並び順 | `ORDER BY published_at DESC` |

公開サイト向けクエリは常に `status = 'PUBLISH'` を条件に含める（DRAFT / CLOSED は管理ページのみが参照する）

## 2. Markdown 変換ライブラリ: markdown-it

`packages/md-converter` の実装には **markdown-it** を採用する

選定理由（cms_goal.md の変換器要件との対応）

- **URL自動リンク**: `linkify: false` がデフォルト。単行URLがプレーンな `<p>` のまま出る
- **生HTML保持**: `html: true` オプションでインライン・ブロックの生HTML（span.inline-markup、iframe等）を素通しできる
- **テーブル**: GFMテーブルがコア機能に含まれる
- **独自拡張**: renderer ルールの上書きで対応できる
  - `heading_open` / `heading_close`: `@@index_target` の検出 → `<hN id="...">` + `<span class="index">` の出力。id はテキストの同期ハッシュ（FNV-1a等）から `h` + 16進で決定的に生成し、同一記事内の重複にはサフィックスを付ける
  - `fence`: info文字列 `lang:filename` の解析 → `<div data-filename="filename"><pre><code>` の出力
- 同期実行・依存が単一パッケージ・Workers 上で動作実績が多い

対抗の remark/rehype はプラグイン合成の自由度が高いが、GFM プラグインが autolink-literal を同梱しており無効化に個別パッケージの合成が必要になるなど、本件の要件ではむしろ手数が増えるため見送り

テスト方針（M2）: tmp/blog_contents.json の test 記事の HTML を正として、同等の Markdown を入力した際に `parse()` の出力（ParsedContent / table_of_contents / annotations）が一致することをスナップショットで担保する

### M2 実装時に確定した仕様（packages/md-converter 実装済み）

- **インライン生 HTML は装飾系タグのホワイトリスト方式**（span / br / u / s / sub / sup / ruby / rt / rp のみ素通し）。iframe 等はエスケープしてテキスト保持する。理由: `/gmaps@@iframe::<iframe ...>` のようなコマンド行パラメータは parse() が要素の text() から抽出するため、タグが実要素化するとパラメータが失われる。microCMS エディタも同様にテキスト入力をエスケープしていた
- **`cite::` で始まる行はリンク記法の解釈を抑止**しリテラル出力する。pages の blockquote コンポーネントが生テキストの `cite::[タイトル](URL)` を正規表現で解釈するため、`<a>` 化すると URL が失われる
- **コードフェンスはファイル名の有無に関わらず常に `<div>` で包む**。pages の renderContent はトップレベル要素として h1-h5 / hr / table / div / ul / ol / blockquote / p のみ対応しており、裸の `<pre>` は renderUnknown に落ちるため
- 見出し id は `h` + FNV-1a 32bit の16進8桁。同一テキストは常に同じ id、同一記事内の重複時のみサフィックス付きで再ハッシュ
- 改行は `breaks: true`（単一改行 → `<br>`、空行 → 段落分割。microCMS の shift+enter / enter に相当）

## 3. 管理ページの Markdown エディタ: 素の textarea で開始（エディタ内プレビューなし）

- 初期実装は**素の textarea** とし、最小工数で始める。シンタックスハイライトが欲しくなった段階で CodeMirror 6 等に差し替える（コンポーネント境界を切っておき差し替え可能にする）
- **エディタ内プレビューは設けない**。プレビューは KV + draftKey 経由で pages 本体を表示する「実プレビュー」で行う（描画結果が本番と完全一致するため、簡易プレビューより信頼できる）
- 将来エディタ内プレビューが欲しくなった場合は packages/md-converter を管理ページから import して実装できる（構成上の選択肢として保持）

## 4. SNS 通知: 現行 WebhookPayload 完全互換（sns-article-publisher 無改修）

sns-article-publisher の受け口実装を確認した結果、以下を送れば無改修で動作する

- ヘッダ: `x-mcms-api-key`（SNS_PUB_CMS_KEY と一致）、`x-microcms-signature`（ボディの HMAC-SHA256、鍵は SNS_PUB_CMS_SECRET）
- ボディ: `WebhookPayload` 形式。受け側が実際に参照するフィールドは以下のみ
  - `service`: `maretol-blog` / `maretol-comic` / `maretol-illust`（この名前を新CMSでも維持する）
  - `api`: `'contents'` 固定（それ以外は投稿スキップされる）
  - `type`: `'new'`（新規公開）または `'edit'`
  - `contents.old.status` / `contents.new.status`: edit 時の DRAFT→PUBLISH 判定に使用
  - `contents.new.publishValue`: id, title, title_name, src, sns_text, ogp_image, cover, filename, first_page, format, is_secret
- 送信タイミング: 管理ページでの「公開」操作時（新規公開・下書き→公開）。is_secret 記事は受け側でも除外されるが、送信側でも公開操作の対象外とする

## 5. microCMS からのデータインポート

`cms-db/scripts/` に Node スクリプトを用意し、2段階で行う

1. **エクスポート**: microCMS Content API を offset ページネーションで全件取得し、サービスごとに JSON ファイルへ保存する（tmp/** と同形式。draftKey が必要な下書き記事は件数が少ないため対象外とし、必要なら手動で移す）
2. **変換・投入**: JSON → INSERT 文の SQL ファイルを生成し、`wrangler d1 execute <DB> --file` で投入する
   - ID・全タイムスタンプを microCMS の値のまま保持する
   - content_format は一律 `html`、status は一律 `PUBLISH`（Content API で取れるのは公開データのみのため）
   - blog_static は static.json のフィールドを key-value に展開する

SQL ファイル生成方式とするのは、投入前に差分を目視でき、ステージング→本番で同一ファイルを再利用できるため

## 確定状況

本ドキュメントの内容はすべて確定済み（2026-07-10）。以降の変更はこのファイルを更新して管理する

- DDL（static は key-value 方式を含め確定）
- 変換ライブラリ: markdown-it
- エディタ: 素の textarea で開始・エディタ内プレビューなし
- SNS 通知: WebhookPayload 完全互換（sns-article-publisher 無改修）
- インポート: JSON エクスポート → SQL 生成 → wrangler d1 execute の2段階方式
