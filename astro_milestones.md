# Astro 移行 マイルストーン

astro_design.md の決定事項を前提とした作業の区切り。各マイルストーンは独立して完結し、次に着手しなくても中途半端な状態が残らない単位とする

進捗は各項目のチェックボックスで管理する。PR はすべて development 宛て。新ワークスペース `pages-astro/` は切替（M6）まで本番に影響しない

## M0. 文書と issue の整備

コードには触れない

- [ ] astro_design.md の起草
- [ ] astro_milestones.md（本書）の作成
- [ ] cms_goal.md に「公開側のキャッシュとパージは astro_design.md を参照」の注記
- [ ] M1〜M7 の sub-issue を作り、#1336 に紐付ける
- [ ] 既存 issue（#1273 #1291 #1297 #1299 #1300 #1301 #1303 #1305 #1306 #1310 #1069 #1284 #1251）の振り分け issue を作る

**成果物**: 設計文書、sub-issue 一式

## M1. Workers Cache のパージ経路の検証

設計全体が依存する前提を、最小の Worker 2 本で先に確かめる。Astro の学習コストと切り離すため、ここでは Astro を使わない。検証用 Worker は終わったら削除する

- [ ] 検証用 Worker A（`[cache] enabled = true`、`Cache-Tag` 付きの HTML を返す、パージ用の入口を持つ）と Worker B（Service Binding で A を呼ぶ）を workers.dev に置く
- [ ] ヒット時に A が起動しないこと（ログが出ない、`Cf-Cache-Status: HIT`）
- [ ] B から A を呼んで `cache.purge({ tags })` が効くこと。default entrypoint で受けた場合と named entrypoint で受けた場合の差
- [ ] パージから反映までの時間（要件は数秒以内）
- [ ] `Cloudflare-CDN-Cache-Control` と `Cache-Control` の 2 本立て
- [ ] `Set-Cookie` 付きレスポンス・`Cookie` 付きリクエスト・クエリ違いの扱い
- [ ] 1 回のパージに載せられるタグ数とレート制限
- [ ] デプロイでキャッシュが切り替わること

**成果物**: 検証結果を astro_design.md に追記。パージ入口の形（RPC メソッド / 内部ルート）の確定

通らなかった場合は astro_design.md の決定 1 を見直し、M2 に進む前に判断する

## M2. pages-astro の雛形 + 記事詳細を 1 ページ通す

最小の縦切り。Astro 側の未確定事項をここで潰す

- [ ] `pages-astro/` ワークスペース新設（Astro 7、`@astrojs/cloudflare`、React、Tailwind）。root の workspaces とスクリプトへ追加
- [ ] wrangler 設定（`maretol-base-v4` / `maretol-base-v4-stg`、各バインディング、`[cache]`、`compatibility_flags`）
- [ ] `src/fetch.ts`: `cf()` → キャッシュヘッダ付与 → ページ描画。M1 で決めた形のパージ入口
- [ ] `/blog/[article_id]` の描画（記事 1 本が正しく出る範囲のブロックコンポーネント）
- [ ] admin-pages（staging）に Service Binding を追加し、保存時に KV パージに加えて Workers Cache パージを呼ぶ（バインディングが無い環境では何もしない）
- [ ] CI: `pages-astro` の型チェック、development への push で staging にデプロイするジョブ
- [ ] 確認: `astro dev` でバインディングが動くこと / パージ入口を default entrypoint に置けること / Live Content Collections の採否 / React Island のバンドルサイズ
- [ ] drawer・モーダルの実現方式の調査と決定（Island + history API / ClientRouter / 通常遷移）

**成果物**: staging で記事 1 本が表示され、2 回目以降はキャッシュヒットし、admin で保存すると数秒で反映される状態

## M3. ブログ系の移植

- [ ] ブロックコンポーネントを全種類そろえる（画像・photo・引用・コード・目次・注釈・埋め込み・リンクカード）
- [ ] 画像寸法と blur（`IMAGE_CACHE`。KV 障害時も描画を続ける）、画像 URL ユーティリティ
- [ ] リンクカード（`OGP_RPC`）、引用画像プロキシ。外部取得のタイムアウトと負キャッシュ
- [ ] トップ、ブログ一覧（`p` の検証・リダイレクト・範囲外 404、ページネーション）、タグ一覧（複数タグ）
- [ ] 前後記事、記事画像モーダル
- [ ] about / contact / secret、404
- [ ] RSS、sitemap、robots、`/.well-known/nostr.json`、`/artifacts/post-for-nostter`
- [ ] 限定公開記事（ゲート、unlock の POST、Rate Limiting、unlock 後の遷移）
- [ ] `draftKey` プレビュー
- [ ] クエリの正規化
- [ ] `Cache-Tag` の付与と、admin のブログ・タグ・info・static 保存からのパージ

**成果物**: staging でブログ系が現行と同等に動く

## M4. 作品系の移植

- [ ] イラスト一覧・詳細、drawer、`/illust?illust_id=` 互換リダイレクト
- [ ] 漫画一覧・詳細
- [ ] 漫画ビューワの Island（見開き・右綴じ・キーボード・スワイプ・マウスゾーン・シリーズ案内・設定保存、固定幅 srcset・順次先読み・`onerror` リトライ）
- [ ] admin の漫画・イラスト保存からのパージ

**成果物**: staging で作品系が現行と同等に動く

## M5. 横断機能と検証

- [ ] Axiom アクセスログの移植、Clarity / Cloudflare beacon
- [ ] head（OGP メタ・canonical・favicon）、セキュリティヘッダ
- [ ] e2e（Playwright）を `maretol-base-v4-stg` 向けに移植
- [ ] 現行サイトとの突き合わせ（全ルートのステータス・リダイレクト、主要ページの見た目）
- [ ] 本番デプロイの workflow に `pages-astro` を追加（custom domain はまだ付けない）

**成果物**: 切替可能と判断できる状態

## M6. 切替

- [ ] `maretol-base-v4` を本番にデプロイし workers.dev で確認
- [ ] admin-pages 本番に Service Binding を追加（KV と Workers Cache の両方をパージ）。`PAGES_HOST` の確認
- [ ] custom domain `www.maretol.xyz` を v3 から v4 へ付け替え
- [ ] 切替後の確認（キャッシュヒット、保存から反映まで、限定公開、RSS、ログ）

戻すときは custom domain を v3 に付け直す。v3 と KV パージは M7 まで残す

**成果物**: 本番が Astro で動いている状態

## M7. 撤去

- [ ] `pages/` と Worker `maretol-base-v3` / `maretol-base-v3-stg` の削除
- [ ] KV `CMS_CACHE`、admin の KV パージ、`packages/cms-cache-key-gen`、`cms-cache-purger` の削除
- [ ] CI・e2e・root スクリプトから pages を外す
- [ ] 移行で解消した issue の close、AGENTS.md・設計文書の更新

**成果物**: 公開側から Next.js が消えた状態
