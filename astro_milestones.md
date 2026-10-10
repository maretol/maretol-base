# Astro 移行 マイルストーン

astro_design.md の決定事項を前提とした作業の区切り。各マイルストーンは独立して完結し、次に着手しなくても中途半端な状態が残らない単位とする

進捗は各項目のチェックボックスで管理する。PR はすべて development 宛て。新ワークスペース `pages-astro/` は切替（M6）まで本番に影響しない

## M0. 文書と issue の整備

コードには触れない

- [x] astro_design.md の起草
- [x] astro_milestones.md（本書）の作成
- [x] cms_goal.md に「公開側のキャッシュとパージは astro_design.md を参照」の注記
- [x] M1〜M7 の sub-issue を作り、#1336 に紐付ける（#1341〜#1347）
- [x] 既存 issue（#1273 #1291 #1297 #1299 #1300 #1301 #1303 #1305 #1306 #1310 #1069 #1284 #1251）の振り分け issue を作る（#1348）

**成果物**: 設計文書、sub-issue 一式

## M1. Workers Cache のパージ経路の検証（#1341） ✅（2026-10-04 完了）

設計全体が依存する前提を、最小の Worker 2 本で先に確かめる。Astro の学習コストと切り離すため、ここでは Astro を使わない。検証用 Worker は終わったら削除する

- [x] 検証用 Worker A（`[cache] enabled = true`、`Cache-Tag` 付きの HTML を返す、パージ用の入口を持つ）と Worker B（Service Binding で A を呼ぶ）を workers.dev に置く
- [x] ヒット時に A が起動しないこと（ログが出ない、`Cf-Cache-Status: HIT`）
- [x] B から A を呼んで `cache.purge({ tags })` が効くこと。default entrypoint で受けた場合と named entrypoint で受けた場合の差
- [x] パージから反映までの時間（要件は数秒以内）
- [x] `Cloudflare-CDN-Cache-Control` と `Cache-Control` の 2 本立て
- [x] `Set-Cookie` 付きレスポンス・`Cookie` 付きリクエスト・クエリ違いの扱い
- [x] 1 回のパージに載せられるタグ数とレート制限
- [x] デプロイでキャッシュが切り替わること

**成果物**: 検証結果を astro_design.md に追記。パージ入口の形（RPC メソッド / 内部ルート）の確定

通らなかった場合は astro_design.md の決定 1 を見直し、M2 に進む前に判断する

## M2. pages-astro の雛形 + 記事詳細を 1 ページ通す（#1342） ✅（2026-10-04 完了）

最小の縦切り。Astro 側の未確定事項をここで潰す

- [x] `pages-astro/` ワークスペース新設（Astro 7、`@astrojs/cloudflare`、React、Tailwind）。root の workspaces とスクリプトへ追加
- [x] wrangler 設定（`maretol-base-v4` / `maretol-base-v4-stg`、各バインディング、`[cache]`、`compatibility_flags`）
- [x] Worker のエントリ（`src/worker.ts`）: `cf()` → キャッシュヘッダ → ページ描画。パージ入口は default entrypoint の RPC メソッド（`src/fetch.ts` は `ExecutionContext` を受け取れないため使わない）
- [x] `/blog/[article_id]` の描画（記事 1 本が正しく出る範囲のブロックコンポーネント）
- [x] admin-pages（staging）に Service Binding を追加し、保存時に KV パージに加えて Workers Cache パージを呼ぶ（バインディングが無い環境では何もしない）
- [x] CI: `pages-astro` の型チェック、development への push で staging にデプロイするジョブ
- [x] 確認: `astro dev` でバインディングが動くこと / パージ入口を default entrypoint に置けること / Live Content Collections の採否 / React Island のバンドルサイズ（astro_design.md 10 章）
- [x] drawer・モーダルの実現方式の調査（astro_design.md 10 章）
- [x] drawer・モーダルの実現方式の決定（どちらも Island + History API。astro_design.md 決定 13）
- [x] staging での確認（キャッシュヒット、admin からのパージが約 1 秒で反映。astro_design.md 10 章）

**成果物**: staging で記事 1 本が表示され、2 回目以降はキャッシュヒットし、admin で保存すると数秒で反映される状態

## M3. ブログ系の移植（#1343）

- [x] ブロックコンポーネントの残り（ブログカード・イラストカード・漫画カード・artifact・my_site・引用画像・nofetch_url・YouTube・Tweet・Google Maps・Amazon）
- [x] 引用画像の取得（現行どおり data URL で埋め込む）。外部取得（リンクカードを含む）のタイムアウトと負キャッシュ
- [x] 描画時の取得（前後記事・画像の寸法・引用画像の一時的な失敗）に失敗したページを長くキャッシュしない（10 分）。自サイトのコンテンツへのカードが取得できない場合は対象外。描画中の例外は 500 にする
- [x] 500 ページ
- [x] リンクカードを Server Island にする（記事の表示後に取得して差し込む。記事のキャッシュをリンク先の状態から切り離す）
- [x] サイドバー
- [x] トップ、ブログ一覧（`p` の検証・リダイレクト・範囲外 404、ページネーション）、タグ一覧（現行と同じく、タグは `tag_id` で 1 つ指定する）
- [x] 記事画像モーダル（Island + History API。`/blog/{id}/image/{base64url}` と、直接開いた場合の `/blog/{id}#{base64url}` への移動を維持）
- [x] about / contact / secret
- [x] RSS、sitemap、robots、`/.well-known/nostr.json`、`/artifacts/post-for-nostter`
- [x] 限定公開記事（ゲート、unlock の POST、Rate Limiting、unlock 後の遷移）
- [x] `draftKey` プレビュー（ブログ記事。未公開の記事は正しい `draftKey` のときだけ表示し、キャッシュしない）
- [x] クエリの正規化（受け付けるクエリと並び順をルートごとに決め、それ以外は 308 で正規化した URL へ。UTM パラメータはキーだけで判定して残す。ページ番号の形式もここで揃える）
- [x] `Cache-Tag` の付与と、admin のタグ・info・static 保存からのパージ（ブログ記事の保存は M2 で対応済み）。手動パージ（`/cache`）からもパージする。パージに失敗したときは admin の画面に出す
  - info の保存で、固定ページ（about / contact / secret / `artifacts/post-for-nostter`）と制作物カードを含む記事がパージされる（`info` のタグ）
  - sitemap のタグは変えない。`lastmod` は記事の保存でだけ新しくなり、漫画・イラスト・タグ・info の保存には追従させない

**成果物**: staging でブログ系が現行と同等に動く

## M4. 作品系の移植（#1344）

- [x] イラスト一覧・詳細、drawer（Island + History API。`/illust/detail/{id}` を維持。直接開いたときは、現行と同じく一覧の上に drawer が開いた状態を描画する）。`/illust?illust_id=` 互換リダイレクトは作らない（Next.js のパラレルルートの都合で内部的に使っていた URL のため。#1344 のコメント）
- [x] 漫画一覧・詳細（一覧は `series` での絞り込みを含む）
- [x] 漫画ビューワの Island（見開き・右綴じ・キーボード・スワイプ・マウスゾーン・シリーズ案内・設定保存、固定幅 srcset・順次先読み・`onerror` リトライ）
- [x] admin の漫画・イラスト保存からのパージ（編集画面のキャッシュ削除ボタンからも。失敗は画面に出す）

**成果物**: staging で作品系が現行と同等に動く

## M5. 横断機能と検証（#1345） ✅（2026-10-10 完了）

- [x] Axiom アクセスログの移植、Clarity / Cloudflare beacon（タグは本番だけに出す。staging では出さない）
- [x] 不完全なページ（`locals.degraded`）と描画中の例外（500）のログを Axiom へ送る（アクセスログと同じ仕組み。設計 5 章「ログと解析」）
- [x] head（OGP メタ・canonical・favicon）、セキュリティヘッダ（head は M3・M4 で実装済み。セキュリティヘッダは `nosniff` と `frame-ancestors` だけ。設計 5 章「セキュリティヘッダ」）
- [x] e2e（Playwright）を `maretol-base-v4-stg` 向けに移植（`deploy_stg.yaml` の e2e ジョブの対象を v4-stg に変更。URL の正規化のテストを追加。development への push では走らせない）
- [x] 現行サイトとの突き合わせ（全ルートのステータス・リダイレクト、主要ページの見た目。ステータスとリダイレクト先は 26 ルートで v3 本番と比較し、差分は末尾スラッシュの 301、`/favicon.ico` と `/icon.ico`、存在しない漫画・イラストの 404（v3 は 500 / 200）の意図したものだけ。結果は #1345 のコメント）
- [x] 本番デプロイの workflow に `pages-astro` を追加（custom domain はまだ付けない。`deploy_prd.yaml` の `deploy-pages-astro`）

**成果物**: 切替可能と判断できる状態

## M6. 切替（#1346） ✅（2026-10-10 完了）

- [x] `maretol-base-v4` を本番にデプロイし workers.dev で確認（2026-10-10、#1365）
- [x] admin-pages 本番に Service Binding を追加（KV と Workers Cache の両方をパージ）。`PAGES_HOST` の確認（#1375。`PAGES_HOST` は www のままでよい）
- [x] custom domain `www.maretol.xyz` を v3 から v4 へ付け替え（ダッシュボードで実施し、wrangler.toml を追従させた）
- [x] 切替後の確認（キャッシュヒット、保存から反映まで、限定公開、RSS、ログ。2026-10-10）

戻すときは custom domain を v3 に付け直す。v3 と KV パージは M7 まで残す

**成果物**: 本番が Astro で動いている状態

## M7. 撤去（#1347） ✅（2026-10-10 完了）

- [x] `pages/` と Worker `maretol-base-v3` / `maretol-base-v3-stg` の削除（リポジトリは #1381、Worker はダッシュボードで削除）
- [x] KV `CMS_CACHE`、admin の KV パージ、`packages/cms-cache-key-gen`、`cms-cache-purger` の削除（admin は #1380、ほかは #1381。Worker と KV namespace `cms-cache` はダッシュボードで削除）
- [x] CI・e2e・root スクリプトから pages を外す（`cms-cache-purger` のジョブと `deploy_stg_astro.yaml` も外した。e2e は M5 で Astro 版に移してある）
- [x] 移行で解消した issue の close、AGENTS.md・設計文書の更新（AGENTS.md・README・設計文書は #1381。issue は #1348 の振り分けで 15 件を close し、Astro 版にも残る 7 件には対象をコメントした）

**成果物**: 公開側から Next.js が消えた状態
