# CMS移行作業

現在外部CMS（microCMS）を利用しているが、これを Cloudflare D1 のデータベースと Worker のサービスで内製した CMS に移行する

## 最終ゴール

microCMS への依存（SDK・APIキー・Webhook）を完全に排除し、以下の構成で運用できている状態

- コンテンツデータはすべて Cloudflare D1 に保存されている
- 記事の作成・編集・公開は新規の管理ページ（Worker として別途デプロイ）で行う
- 公開サイト（pages）は一切変更されておらず、閲覧者から見た表示・URL は移行前後で完全に同一
- microCMS の契約を解除できる

## 決定事項

### 全体構成

- DB は Cloudflare D1 を利用する
- 管理ページは別途新規にサイトを作成し、pages のように Worker にリリースする（pages 内部には設けない）
- 管理ページは Next.js でなくても良い（他の選択肢を優先する事項がなければ pages と同じ Next.js + OpenNext とする）
- 管理ページへのログインは Cloudflare Access を利用するため認証機能は設置しない
- 画像データやマンガデータなどは R2 に置いているが、これの管理機能は追加しない（別途内製管理ツールが存在し、テキスト本文で URL に対して反応する処理のままで済ませる）

### ディレクトリ構成（決定済み）

既存の「Worker ごとにルート直下のワークスペース + 共有ライブラリは packages/*」の慣習に従い、以下を新設する

```
maretol-base/
├── pages/                  # 公開サイト（変更しない）
├── admin-pages/            # ★新規: 管理ページ Worker（Next.js + OpenNext 想定、Cloudflare Access）
├── cms-db/                 # ★新規: D1 の DDL・マイグレーション + microCMS インポートスクリプト
│   ├── migrations/         #   wrangler d1 migrations で管理
│   └── scripts/            #   インポートスクリプト等
├── cms-data-fetcher/       # D1・KV(draft) バインディング追加、md-converter の呼び出し元
├── cms-cache-purger/       # 移行完了後に廃止
├── ogp-data-fetcher/       # 変更なし
├── sns-article-publisher/  # 通知の受け口（変更は最小限）
├── packages/
│   ├── api-types/
│   ├── cms-cache-key-gen/  # キャッシュパージ統合時に admin-pages からも利用
│   └── md-converter/       # ★新規: Markdown → 互換 HTML 変換器
└── e2e/
```

- `admin-pages` / `cms-db` / `packages/md-converter` をルート package.json の workspaces に追加する
- D1 スキーマの持ち主は cms-db とする（fetcher・管理ページのどちらにも属さない中立の置き場。管理ページより先に D1 切替（M3）が来る着手順にも合う）
- md-converter は共有パッケージとして単体テストを独立させ、実行時は cms-data-fetcher が import する（将来、管理ページのエディタ内プレビューでも利用可能）
- CMS 移行関連ドキュメント（cms_goal.md / cms_doc.md / cms_milestones.md）は既存慣習どおりルート直下に置く

### 本文データの形式（HTML → Markdown 移行）

- 既存記事の HTML はそのまま D1 に保存し、無変換で扱う（一括変換はリスクが高いため行わない）
- 今後の新規記事は Markdown（+ 現行の独自記法。cms_doc.md 参照）で管理する
- 管理ページで HTML のリッチテキストエディタは自作しない（リスク回避のため）
- したがってコンテンツは `html` / `markdown` の2形式が併存する。DB に形式カラム（format）を持たせ、配信時には pages が受け取る `ParsedContent` 構造に両形式とも正しく変換されること
- **変換タイミングは配信時（決定済み）**: 現行の cms-data-fetcher が HTML を ParsedContent に変換しているのと同様に、cms-data-fetcher が D1 から取得した Markdown を pages に返すタイミングで ParsedContent に変換する
  - 実装は「Markdown → 互換 HTML → 既存 parse()」のパイプラインとし、ParsedContent 生成を HTML 記事と完全に共有する
  - 変換器のバグ修正・記法拡張は再コンパイル不要で全記事に即時反映される。変換コストは pages 側の KV キャッシュ（CMS_CACHE）で吸収する

#### Markdown 記法（決定済み）

Markdown から現行互換 HTML への変換器を用意する。独自拡張は以下の3つ

- **見出しの目次対象指定**: `# 見出しテキスト@@index_target` → `<h1 id="..."><span class="index">見出しテキスト</span></h1>` に変換。`@@index_target` がない見出しは span.index なしで出力。見出し `id` は再コンパイルしても変わらない決定的な生成方式（テキストハッシュ+重複サフィックス等）とする
- **ルビ・注釈**: 新記法は作らず、GFM のインライン HTML として `<span class="inline-markup">親文字@@ruby::ルビ</span>` 等を Markdown 中に直接記載し、変換器は素通しする（既存 parse.ts の transformInlineMarkup がそのまま処理する）
- **コードブロックのファイル名**: ` ```js:filename ` 形式を解析し `<div data-filename="filename"><pre><code>...</code></pre></div>` に変換

変換器の全体要件

- URL 自動リンク（autolink）は無効化し、単行 URL・コマンド行（`/gmaps` 等）はプレーンテキストの `<p>` として出力する（p_option 判定の互換性のため）
- インラインの生 HTML は装飾系タグ（span / br / u / s / sub / sup / ruby / rt / rp）のみ素通しし、それ以外（iframe 等）はエスケープしてテキストとして保持する（コマンド行のパラメータを parse() が text() から抽出するため。microCMS エディタの挙動と同じ）
- `cite::` で始まる行は Markdown のリンク記法として解釈せずリテラルのまま出力する（pages が生テキストを正規表現で解釈するため）
- コードブロックは常に `<div>` で包む（pages のトップレベル要素レンダラが裸の `<pre>` に非対応のため）

### 配信経路（cms-data-fetcher）

- pages のデータフェッチは既存のまま cms-data-fetcher が扱うため、pages には変更を入れない
- cms-data-fetcher と pages 間の RPC インターフェース（メソッド名・引数・返却型 `api-types`）は維持する
- cms-data-fetcher に D1 を直接バインドし、micro_cms.ts の microCMS SDK 呼び出しを D1 クエリ実装に差し替える
- 現行 microCMS API の以下の機能を D1 クエリで再現する
  - offset / limit ページネーションと totalCount
  - タグ絞り込み（`categories[contains]` 相当・AND 条件）
  - `is_secret` 記事の一覧除外
  - ID 指定取得、secret_meta（is_secret / secret_code のみ）取得
  - draftKey による下書きプレビュー（pages が `draftKey` パラメータを渡す現行実装と互換の仕組み）

#### draftKey 互換プレビュー（決定済み: KV 併用方式）

プレビュー配信チャネルと下書きの永続保存を分離する。KV はプレビュー専用の一時チャネルであり、書きかけ記事の正本は管理 CMS 側（D1）に持つ

- 管理ページの「プレビュー」操作時に、編集中の内容（Markdown 原文または HTML）を **D1 レコードと同一形状の JSON** で KV に書き込む（キー: `draft_{articleID}` 想定、値に draftKey と本体を含める）。変換は配信時に cms-data-fetcher が行うため、管理ページ側にコンパイラは不要
- cms-data-fetcher は draftKey 付きリクエストのとき KV を参照し、保存された draftKey と一致すればそのデータを返す。不一致・不存在なら D1 の通常データにフォールバック
- draftKey はランダム生成の推測不能な値とし、KV には TTL を設定してプレビュー URL を自然失効させる
- KV namespace は既存の CMS_CACHE と分離し専用のもの（CMS_DRAFT 等）を新設する。cms-data-fetcher に KV バインディングを追加する（現状バインディングなし）

### D1 スキーマ（大枠決定済み）

- **タグ関係はサービスごとに別テーブル**とし、共通のタグ機構への統一はしない
  - blog: 記事⇔カテゴリの多対多、comic: 単一 tag + 単一 series、illust: タグ多対多（type 属性付き）をそれぞれ素直にモデリングする
- **公開状態は status カラム**で持つ（microCMS の PUBLISH / DRAFT / CLOSED 相当）
- **本文は単一の content カラム + format カラム**で持つ
  - 過去の移行データは HTML、新規データは Markdown 原文を格納し、format（`html` / `markdown`）で判別する
  - 変換は配信時に行うため、コンパイル済み HTML の別カラムは持たない
- カラムレベルの具体的なテーブル定義（DDL）は設計フェーズで作成する

### キャッシュパージ・SNS連携

- キャッシュパージは内製CMS側に統合する。記事の公開・更新時に CMS 自身が KV（CMS_CACHE）をパージし、cms-cache-purger は移行完了後に廃止する
  - パージ対象キーの生成は既存の `packages/cms-cache-key-gen` を再利用する
- SNS 自動投稿（sns-article-publisher）は維持する。新規記事公開時に CMS から通知を送る
  - 通知形式（現行の WebhookPayload 互換で送るか、簡素化するか）は設計フェーズで決定する

### 移行戦略（サービス単位の段階移行）

microCMS の3サービスを単位に、規模の小さいものから段階的に切り替える。cms-data-fetcher はサービスごとに参照先（microCMS / D1）を切り替えられる構造にする

1. **illust**（atelier / tag：データ量最小）
2. **comic**（bande-dessinee / tag / series）
3. **blog**（contents / categories / info / static：データ量最大・機能最多）

各段階で以下を行う

- D1 スキーマ作成と microCMS からのデータインポート（**コンテンツIDは URL に使われているため必ず保持する**）
- 管理ページに該当コンテンツの CRUD 画面を追加
- cms-data-fetcher の該当サービスの参照先を D1 に切り替え
- ステージング（-stg / dev-api.maretol.xyz）で検証後に本番切り替え

全サービス移行完了後、microCMS SDK・APIキー・cms-cache-purger を撤去する

## 移行対象データ（現行 microCMS の構造）

`tmp/**` に CMS から持ってきたデータのサンプルを置いているため適宜読み取ってデータ構造の設計で利用する

| microCMSサービス | API | 内容 | 主な固有フィールド |
| --- | --- | --- | --- |
| maretol-blog | contents | ブログ記事 | title, content(HTML), ogp_image, categories[], sns_text, is_secret, secret_code |
| maretol-blog | categories | ブログタグ | name |
| maretol-blog | info | 固定ページ | page_pathname, title, main_text(HTML) |
| maretol-blog | static | サイドバー等の静的文言 | sidebar_about, sidebar_profile, toppage_* |
| maretol-comic | bande-dessinee | マンガメタデータ | title_name, publish_date, publish_event, contents_url, next_id/previous_id, series, tag, cover, back_cover, format[], filename, first_page, last_page, first_left_right[], description(HTML) |
| maretol-comic | tag / series | マンガのタグ・シリーズ | tag_name / series_name |
| maretol-illust | atelier | イラストメタデータ | title, src, object_position, description(HTML), tag_or_category[] |
| maretol-illust | tag | イラストタグ | tag, type[]（作品/キャラクター） |

共通フィールド: id, createdAt, updatedAt, publishedAt, revisedAt（新CMSでも同等のタイムスタンプ管理が必要）

## スコープ外（やらないこと）

- pages（公開サイト）への変更
- R2 上の画像・マンガデータの管理機能
- 管理ページの独自認証（Cloudflare Access に委譲）
- 既存 HTML 記事の Markdown への一括変換
- ogp-data-fetcher への変更

## 設計フェーズへの持ち越し事項

**すべて確定済み（2026-07-10、M1 完了）。詳細設計は cms_design.md を参照**

- D1 のテーブル定義（DDL）→ cms_design.md に全文
- Markdown 変換ライブラリ → markdown-it
- 管理ページのエディタ → 素の textarea で開始（エディタ内プレビューなし）
- SNS 通知 → 現行 WebhookPayload 完全互換
- インポート → JSON エクスポート → SQL 生成 → wrangler d1 execute の2段階方式

### 決定済み（上記「決定事項」へ反映済み）

- Markdown 独自記法3点（見出し index_target / ルビ・注釈はインライン HTML 直書き / コードブロック `lang:filename`）と変換器の全体要件
- Markdown の変換タイミングは配信時（cms-data-fetcher 内で Markdown → 互換 HTML → 既存 parse()）
- D1 スキーマの大枠（サービスごと別テーブル / status カラム / content + format カラム）
- draftKey 互換プレビューの KV 併用方式
