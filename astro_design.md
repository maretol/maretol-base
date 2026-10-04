# Astro 移行 設計

公開サイト（`pages`）を Next.js + OpenNext から Astro へ移行し、キャッシュを「長い TTL + 保存時のタグパージ」に置き換えるための設計。Epic は issue #1336、作業の区切りは astro_milestones.md

CMS 側（admin-pages / cms-data-fetcher / D1）の設計は cms_goal.md・cms_design.md が正本。本書はそれらのうち公開側のキャッシュとパージに関する記述を置き換える

## 1. ゴール

- ブログの更新が数秒以内に全エッジへ反映される
- 作品（イラスト・漫画）を快適に閲覧できる
- 運用コストを最小にする（構築の複雑さは許容する）
- URL と見た目・機能は現行と同等に保つ

対象外: CMS（admin-pages）のフレームワーク変更、D1 スキーマの変更、画像派生の事前生成（issue #1336 の Phase 5）

## 2. 決定事項

| # | 項目 | 決定 | 理由 |
|---|---|---|---|
| 1 | キャッシュ層 | Workers Cache のみ。Astro の `cacheCloudflare()` は使わず、ヘッダを自前で付ける | ヒット時に Worker が起動しない。ゾーン不要。`cacheCloudflare()` は experimental |
| 2 | 変換タイミング | 配信時変換を維持（cms_goal.md の決定どおり）。D1 に変換済みデータは持たない | HTML がキャッシュされるので変換はミス時だけ。DB 変更は移行を重くする |
| 3 | サニタイズ | 導入しない | 著者が信頼境界。コンテンツはすべて管理下にある |
| 4 | 画像寸法 | 現状維持（描画時に Images `.info()`、`IMAGE_CACHE` に 7 日） | ミス時にしか走らない |
| 5 | Island | React | Swiper / Radix / 既存コンポーネントを流用する |
| 6 | 並行運用 | 新ワークスペース `pages-astro/`・新 Worker `maretol-base-v4` を staging で作り込み、custom domain を付け替えて一括切替 | パス単位の段階切替はパージ経路が 2 系統になり、route の共存確認も要る |
| 7 | KV | `CMS_CACHE` のみ撤去。`IMAGE_CACHE` / `OGP_FETCHER_CACHE` / `CMS_DRAFT` は残す | 残す 3 つは結果整合性で困らない用途 |
| 8 | 限定公開記事 | キャッシュしない。unlock にレート制限を付ける。`secret_code` はハッシュ化しない | Workers Cache は Cookie でキーを分けられない。admin で既存コードを確認できる運用を優先 |
| 9 | prerender | `/.well-known/nostr.json`・robots など本当に静的なものだけ | about / contact / secret は D1 由来で CMS から更新される |
| 10 | アクセスログ | Axiom へのログは描画時（ミス時）のみになることを受容。アクセス解析は Cloudflare beacon / Clarity / Cloudflare Analytics で見る | ヒット時は Worker が起動しない。ログはエラーと異常アクセスの監視用に残す |
| 11 | エッジ TTL | 30 日 | パージで更新するので、長さはパージ漏れ時の上限としてしか効かない |
| 12 | 進め方 | development へ小分け PR。`pages-astro` は development への push で staging にデプロイする | 切替まで本番に影響しない |
| 13 | drawer・モーダル | イラスト drawer・記事画像モーダルとも Island + History API（10 章）。現行の URL と、直接開いた場合の挙動を維持する | 互換性のため、既存の仕組み（重ねて表示し URL も変える）を変えない |
| 14 | リンクカード | Server Island（`server:defer`）にし、記事の表示後に別のリクエストで取得して差し込む（5 章）。JS が動かない閲覧者やクローラには、同じ枠にホスト名と URL だけを出す | リンク先の応答が遅くても記事の表示を待たせず、記事のキャッシュをリンク先の状態から切り離す |

## 3. 全体構成

```
閲覧者 ──▶ Workers Cache ──(ミス時のみ)──▶ pages-astro (maretol-base-v4)
                                              ├─ CMS_RPC ──▶ cms-data-fetcher ──▶ D1 / CMS_DRAFT
                                              ├─ OGP_RPC ──▶ ogp-data-fetcher
                                              ├─ IMAGE_CACHE / OGP_FETCHER_CACHE（KV）
                                              └─ Images binding

admin-pages ──▶ D1 に保存
            └─▶ Service Binding（RPC）──▶ pages-astro の default entrypoint ──▶ cache.purge({ tags })
            └─▶ SNS_PUBLISHER
```

- cms-data-fetcher と RPC インターフェース（`packages/api-types`）は変更しない
- D1 への書き込みは従来どおり admin-pages の Server Action が行う。保存 → パージ → SNS 通知の順も変えない

## 4. キャッシュ

### 4.1 ヘッダ

`pages-astro` の wrangler で `[cache] enabled = true` とし、レスポンスに次を付ける

| 対象 | `Cloudflare-CDN-Cache-Control` | `Cache-Control` | `Cache-Tag` |
|---|---|---|---|
| キャッシュするページ | `max-age=2592000`（30 日） | `public, max-age=0, must-revalidate` | 4.2 のタグ |
| キャッシュしないページ | 付けない | `private, no-store` | 付けない |

ヘッダを付けるのは各ページの frontmatter で、`src/lib/cache.ts` の `cachePage(Astro.response, tags)` を呼ぶ（レイアウトやコンポーネントの中からはヘッダを変えられない）。
`src/mw/cache.ts` のミドルウェアは安全側の既定値を担う。`cachePage()` を呼んでいないレスポンス、`draftKey` 付きのリクエスト、GET / HEAD 以外、500 番台はすべて `private, no-store` にする。Workers Cache は `Cache-Control` の無い 200 を既定で 2 時間キャッシュするため、明示したページだけがキャッシュされる形にしている

- エッジは `Cloudflare-CDN-Cache-Control` を優先するので、ブラウザには保持させずエッジだけ長く持たせられる
- キャッシュしないもの: 限定公開記事の本体、`draftKey` 付きリクエスト、POST、500 番台
- 404 はエッジに 60 秒だけキャッシュする（存在しない URL への連続アクセスで毎回 D1 まで届くのを防ぐ）。記事詳細の 404 には `post:{id}` を付け、その記事が公開されたときのパージで一緒に消えるようにする
- データ取得の失敗（D1 の一時的な障害など）は 404 にせず 500 で返す。404 にするとエッジにキャッシュされてしまうため。fetcher が返す「存在しない」は例外メッセージ（`... not found: {id}`）で見分ける
- 取得に失敗した部品を含む不完全なページは 10 分だけキャッシュする（一時的な失敗による表示が 30 日残らないようにする）。対象は、前後記事、画像の寸法、引用画像の一時的な失敗（タイムアウト、引用元の 5xx など）。引用画像でも、引用元の 4xx、未対応の形式、3MB を超える画像は、取り直しても直らないので対象にしない（代わりの表示のまま通常どおりキャッシュする）。部品は失敗を `Astro.locals.degraded` に記録し（`src/lib/degraded.ts`）、ミドルウェアが保持期間を縮める。リンクカードは記事とは別のリクエスト（Server Island）で描画するので、リンク先の状態は記事のキャッシュに影響しない（5 章）。自サイトのコンテンツへのカード（ブログ・イラスト・漫画・制作物）が取得できない場合も対象にしない。コンテンツはすべて自分で管理していて、存在しないものを指すことは基本的にないので、取得できないものは公開後に非公開・削除されたとみなし、代わりの表示（「公開後に非公開になった可能性があります」）のまま通常どおりキャッシュする。再び公開されたときは、ページに付けた参照先のタグ（4.3）のパージで消える
- HTML は本文を最後まで描画してから返す（ストリーミングしない）。キャッシュのヘッダはページの frontmatter で決まるが、部品の描画は本文のストリームを読み進めるまで終わらない。ストリームのまま返すと、途中で例外が起きて切れた 200 や、取得に失敗した部品を含むページがそのままキャッシュされる。描画の途中で例外が起きた場合は 500 ページを返す
- `Set-Cookie` を返すレスポンスは保存されない。キャッシュするページでは Cookie を発行しない（Astro のセッション機能は使わない）
- デプロイするとキャッシュは Worker バージョン単位で切り替わるため、デプロイ時の全パージは不要

### 4.2 タグ

ページには細かいタグと粗いタグの両方を付ける。パージは現行の KV パージと同じ粗さから始め、必要になったら絞る

| タグ | 付与するページ |
|---|---|
| `layout` | 全ページ |
| `blog` | ブログ系の全ページ（トップ・一覧・タグ一覧・記事詳細・RSS・sitemap） |
| `list:blog` | 記事の一覧を含むページ（トップ・一覧・タグ一覧・RSS・sitemap）と、前後記事を表示する記事詳細 |
| `post:{id}` | 記事詳細 |
| `tag:{tag_id}` | タグ一覧（複数タグの組み合わせは構成タグをすべて付ける） |
| `info` | about / contact / secret |
| `list:comics` | 漫画の一覧と、シリーズ案内を表示する漫画詳細 |
| `comic:{id}` / `series:{id}` | 漫画詳細 |
| `list:illust` | イラストの一覧 |
| `illust:{id}` | イラスト詳細 |

本文にカードを埋め込んだ記事詳細には、参照先のタグも付ける（`src/lib/content_tags.ts`）。イラストカードは `illust:{id}`、漫画カードは `comic:{id}`、制作物カードは `info`。ブログカードは記事詳細が持つ `list:blog` で足りる

### 4.3 保存操作とパージするタグ

| admin の操作 | 現行の KV パージ | パージするタグ |
|---|---|---|
| ブログ記事の保存・削除 | `purgeBlogContentCache(id)` | `post:{id}`, `list:blog` |
| タグ（カテゴリ）の編集 | `purgeBlogMetaCache('tags')` | `blog` |
| info の編集 | `purgeBlogMetaCache('info')` | `info` |
| static（固定文言）の編集 | `purgeBlogMetaCache('static')` | `layout` |
| 漫画の保存・削除 | `purgeBandeDessineeCache()` | `comic:{id}`, `list:comics` |
| イラストの保存・削除 | `purgeAtelierCache()` | `illust:{id}`, `list:illust` |
| 手動パージ（admin の `/cache` ページ相当） | グループ単位・全件 | `blog` / `list:comics` / `list:illust` / `layout` |

- 記事詳細は前後記事を表示するため `list:blog` を持つ。記事を保存するとブログ系はほぼ全ページがパージされる。現行の KV パージと同じ粒度であり、前後記事のパージ漏れ（#1310）はこれで解消する
- 絞る余地: 公開状態・公開日・タイトルが変わらない保存では `post:{id}` だけにする

### 4.4 パージ経路

Workers Cache のパージには次の制約がある

- 他の Worker のキャッシュはパージできない
- パージの対象は `purge()` を呼んだ entrypoint のキャッシュに限られる

そのため admin-pages から `pages-astro` へ Service Binding を張り、`pages-astro` の default entrypoint（閲覧者のリクエストを処理するのと同じ entrypoint）にパージ処理を持たせる。M1 でこの経路が成立することを確認した（9 章）

入口の形は **default entrypoint の RPC メソッド**とする（M2 で確定）

- `pages-astro` の default export を `WorkerEntrypoint` のクラスにし、`fetch()` と並べて `purgeTags(tags)` を持たせる（`src/worker.ts`）
- admin-pages は `env.ASTRO_PAGES.purgeTags(tags)` を呼ぶ（`admin-pages/lib/edge_cache.ts`）。メソッドの型は `packages/cache-tags` の `PurgeRPC`
- RPC メソッドは Service Binding を持つ Worker からしか呼べない。公開側から到達する経路が無いので、認可の仕組みを持たなくてよい

M1 の時点では「内部ルート + `ctx.props` による認可」を第一候補にしていたが、採用しなかった。静的アセットを持つ Worker に対しては、Service Binding に付けた props がローカル実行（`wrangler dev` の複数 Worker 構成）で空になった。M1 の検証用 Worker はアセットを持たなかったため見えていなかった。本番で同じ挙動になるかは確認していないが、RPC メソッドなら props に依存しない

タグの文字列と、保存操作ごとにパージするタグの組は `packages/cache-tags` に置き、付ける側（pages-astro）とパージする側（admin-pages）の両方がそこを参照する

運用上の決まり

- Service Binding は環境ごとに分ける（`admin-pages-stg` → `maretol-base-v4-stg`、`admin-pages` → `maretol-base-v4`）
- 切替（M6）までは admin が KV パージと Workers Cache パージの両方を呼ぶ。Service Binding が無い環境では Workers Cache パージを飛ばす
- **保存 1 回につきパージ呼び出しは 1 回**にし、必要なタグをまとめて渡す。パージにはレート制限がある（連続で約 25 回、以後は毎分 5 回程度。9 章）
- `purge()` は制限に達しても例外を投げず `success: false` を返す。戻り値を必ず確認する
- パージの失敗は保存の失敗にしない（現行の KV パージと同じ扱い）。失敗時は admin に表示し、手動パージで回復できるようにする

### 4.5 クエリの扱い

キャッシュのキーはパスとクエリ文字列で、ホスト名は含まれない。任意のクエリで別エントリになり、`?a=1&b=2` と `?b=2&a=1` のような順序違いも別エントリになる。`src/worker.ts` のミドルウェアでルートごとに許可するクエリ（`p`、`tag_id`、`draftKey`、`illust_id` など）と並び順を決め、それ以外が付いていたり順序が違ったりしたら正規化した URL へリダイレクトする

リクエストの `Cookie` はキーに含まれない。Cookie の有無で内容が変わるページ（限定公開記事）は、未解錠の表示も含めて必ず `private, no-store` にする

## 5. `pages-astro` の構成

```
pages-astro/
├─ astro.config.ts          # output: 'server'、Cloudflare アダプタ、React、Tailwind
├─ wrangler.toml            # maretol-base-v4 / env.staging: maretol-base-v4-stg
├─ tailwind.config.ts       # 現行 pages の設定を引き継ぐ（global.css の @config から読む）
└─ src/
   ├─ worker.ts             # Worker のエントリ（wrangler の main）。Hono + RPC メソッド
   ├─ mw/                   # cache / purge（M3 以降: log / secret / query）
   ├─ lib/                  # RPC 呼び出し、キャッシュヘッダ、画像 URL、OGP
   ├─ pages/
   │  ├─ index.astro
   │  ├─ blog/index.astro, blog/[article_id].astro
   │  ├─ blog/[article_id]/image/[src].astro   # 画像モーダルの URL を直接開いたときのリダイレクト
   │  ├─ tag.astro
   │  ├─ comics/index.astro, comics/[id].astro
   │  ├─ illust/index.astro, illust/detail/[id].astro
   │  ├─ about.astro, contact.astro, secret.astro
   │  ├─ rss/feed.rdf.ts, sitemap.xml.ts
   │  ├─ 404.astro, 500.astro
   │  └─ .well-known/nostr.json.ts        # prerender
   ├─ components/
   │  ├─ blocks/            # ParsedContent のブロック → Astro コンポーネント
   │  ├─ article/ shell/ ui/
   │  └─ islands/           # React: 漫画ビューワ・drawer・モーダル・設定 UI
   ├─ layouts/
   └─ styles/global.css
packages/cache-tags/        # Cache-Tag の文字列と、保存操作ごとのパージ対象
```

いま存在するのは記事詳細（`blog/[article_id].astro` と画像モーダルの URL）、`404.astro`、`500.astro` で、残りは M3 以降で足す

### Worker のエントリ（src/worker.ts）

Astro 7 の `src/fetch.ts`（Advanced Routing）は使わず、wrangler の `main` に自前のエントリを指定する。`src/fetch.ts` はアダプタの既定エントリ経由だと `fetch(request)` の引数 1 つで呼ばれ、`ExecutionContext` を受け取れないため。Cloudflare 用のハンドラ `cf()`（`@astrojs/cloudflare/hono`）も自前のエントリで使う前提になっている

エントリは Hono のアプリを `WorkerEntrypoint` のクラスで包む。クラスにするのは、パージ用の RPC メソッドを default entrypoint に置くため（4.4）

ミドルウェアの順序

1. `cf()`（静的アセットの配信、`locals.cfContext` などの設定。Astro の他のハンドラより前に置く）
2. アクセスログ（Axiom。bot 判定・geo・prefetch 除外は現行 `pages/middleware.ts` を移植。M5）
3. クエリの正規化（M3）
4. 限定公開記事のゲート（署名 Cookie の検証。該当レスポンスを `private, no-store` にする。M3）
5. キャッシュヘッダの確定（`src/mw/cache.ts`。HTML の本文を最後まで描画し、既定値の適用・不完全なページの保持期間の短縮・描画中の例外の 500 化を行う）
6. Astro の `middleware()` / `pages()`

ログはレスポンスを待たせない（`waitUntil`）。Secrets Store の取得をリクエストごとに await しない（#1303 と同じ問題を持ち込まない）

アクセスログとは別に、5 で検出した不完全なページ（どの部品の取得に失敗したか）と描画中の例外も Axiom へ送る。キャッシュを短くしたことに気づけるようにするため。送信の仕組みはアクセスログと共用する（M5）

### データ取得

`cloudflare:workers` の `env` から `CMS_RPC` を呼ぶ薄い関数を `src/lib/api/` に置く。`pages/lib/api/workers.ts` の `createCachedAPIFunction`（KV キャッシュ）と一覧総件数キャッシュは移植しない。info の一覧だけは、取得中の Promise を `Astro.locals` に置き、1 回の描画の中で共有する（制作物カードが複数あると、カードごとに全件の取得とパースが走るため。リクエストをまたぐキャッシュは持たない）。Live Content Collections は使わない（RPC を包むだけなので素の関数で足り、エラーの扱いも自前で決められる）

RPC メソッドの型は `src/env.d.ts` で付ける。`cms-data-fetcher/types.d.ts` と `ogp-data-fetcher/types.d.ts` を参照し、`Cloudflare.Env` とグローバルの `Env` の `CMS_RPC` / `OGP_RPC` を `Service<…>` として宣言する（`wrangler types` は Service Binding を `Fetcher` としか出力しない。pages / admin-pages の `env.d.ts` と同じやり方で、キャストは使わない）

絶対 URL（OGP・canonical・RSS など）は環境ごとの `HOST`（wrangler.toml の vars）から作る（`src/lib/site.ts`）。astro.config.ts の `site` は設定しない。ビルド時に決まる値なので、本番の URL を書くと staging でも `Astro.site` が本番を指す

### 画像

- next/image は使わない。`/cdn-cgi/image/` の URL と srcset は `src/lib/image.ts` と `src/components/ui/CdnImage.astro` で作る
- 派生の幅は固定の候補から選び、1x と 2x の 2 つだけを要求する。表示幅の上限（本文は 1280px、写真は 576px）と原本の幅で頭打ちにするので、現行より小さい派生で済む（例: 幅 576px の枠に入る写真は、現行の `w=1920` / `w=3840` に対して `w=640` / `w=1200`）
- 2x の候補が 1x と同じ URL になっても srcset からは省かない。省くと画面の密度ごとの表示サイズが現行と変わる
- 漫画ビューワは固定幅 2〜3 種の srcset、1〜2 本ずつの順次先読み、`onerror` でのリトライ（最後は原本 URL）を持つ（M4）
- 記事本文画像の寸法と blur は現行どおり R2 + Images binding で作り、`IMAGE_CACHE` に 7 日保持する。KV の読み書きに失敗しても描画は続ける（#1300）
- 引用画像（外部サイトの画像）は現行どおりサーバー側で取得し、data URL で HTML に埋め込む（`src/lib/api/cite_image.ts`）。待ち時間は 5 秒、成功は `IMAGE_CACHE` に 7 日、失敗は 10 分保持する。キャッシュの形式は現行と同じ。取得する画像は 3MB までにし、超えるものは失敗として扱う（HTML にそのまま埋め込まれ、描画中のメモリにも全量が載るため）。失敗の記録には、取り直しても直らない失敗かどうかの印を含める（`error:permanent:`。現行サイトは `error:` で始まる値を失敗として読むので、そのまま共有できる）
- リンクカードは Server Island（`server:defer`）にする（`src/components/blocks/LinkCard.astro`、決定 14）。記事の HTML には、同じ枠にホスト名と URL だけを入れた表示（`LinkCardFallback.astro`）を出し、ブラウザが `/_server-islands/LinkCard` から取得したカードに差し替える。枠（`LinkCardFrame.astro`）を共有するので、差し替えで大きさは変わらない。JS が動かない閲覧者やクローラには、差し替え前の表示（リンクは機能する）のまま残る
- island のレスポンスは記事とは別にエッジへキャッシュする（`cacheLinkCard()`）。リンク先の情報を取得できたときは 3 日（OGP データを KV に持つ期間と同じ）、取得できなかったときは 10 分
- island の props（リンク先の URL）は、ビルドごとに生成される鍵で暗号化して URL に入る。デプロイをまたぐと古い URL は復号できない（差し替えられず、差し替え前の表示のまま残る）が、Workers Cache はデプロイで切り替わる（9 章）ので、キャッシュ済みの記事が古い鍵の URL を持ち続けることはない。鍵を固定する場合は、ビルド時に `ASTRO_KEY` を渡す
- OGP の取得（`src/lib/api/ogp.ts`）は、待ち時間を 5 秒にし、失敗を `OGP_FETCHER_CACHE` に 10 分保持する。待ち時間を超えても取得と KV への保存は `waitUntil` で続け、遅れて返った結果を次回の描画で使う（応答が遅いだけのリンク先でも、2 回目にはカードが出る）。KV への書き込みは描画では待たない。現行サイトも同じ KV を読むので、失敗の記録は `OGPResult` として読める形（`success: false`）にしている

### スタイルと UI 部品

- Tailwind v4（`@tailwindcss/vite`）。`global.css` と `tailwind.config.ts` は現行 pages から引き継ぐ
- フォントは `@fontsource-variable/m-plus-1` と `@fontsource-variable/suse`（next/font の置き換え）。Astro の Fonts API は使っていない（内部で使う `undici` が Node 22.19 以上を要求しており、CI とローカルの 22.17 で動く確証が無い。未検証）
- shadcn 由来の Button / Card は React コンポーネントにせず、class の定義（`src/components/ui/button.ts`、`card.ts`）を `.astro` と Island の両方から使う。`.astro` から React の `asChild` は使えないため
- アイコンは `.astro` では `@lucide/astro`、Island では `lucide-react`
- Island には class をサーバー側で組み立てて props で渡す（tailwind-merge などをクライアントへ持ち込まない）

### ビルド・デプロイ・ローカル開発

- 環境はビルド時に決まる。staging は `CLOUDFLARE_ENV=staging astro build` のあと `wrangler deploy`（`-e staging` は効かない）。`npm run deploy-stg:astro`
- `astro check` は TypeScript 7 に未対応のため、このワークスペースだけ TypeScript 6 を使う
- ローカル開発は `npm run dev:cms` と `npm run dev:ogp` を起動した状態で `npm run dev:astro`。Service Binding はローカルの fetcher につながる。R2 と Images binding は `remote = true` で実物を読む（cms-data-fetcher の D1 と同じ扱い）
- Workers Cache はローカルでは働かない。キャッシュとパージの確認は staging で行う

## 6. 限定公開記事

- 現行の `pages/lib/secret_unlock.ts`（HMAC-SHA256 署名 Cookie `secret_unlock_{id}`、HttpOnly / Secure / path 限定 / 30 日、定数時間比較）をそのまま移植する
- unlock は POST エンドポイントにし、Workers の Rate Limiting バインディングで IP ごとに制限する（colo 単位の近似である点は許容）
- 記事本体のレスポンスは `private, no-store`。一覧には従来どおり出さない
- 受容リスク: `secret_code` は D1 に平文で保存し、admin の編集フォームにも表示する

## 7. 切替と撤去

1. `maretol-base-v4` を本番にデプロイし、workers.dev で確認する
2. admin-pages 本番に Service Binding を追加し、KV と Workers Cache の両方をパージする状態にする
3. custom domain `www.maretol.xyz` を `maretol-base-v3` から外し、`maretol-base-v4` に付ける
4. 戻すときは custom domain を v3 に付け直す。v3 と KV パージは撤去（M7）まで残す
5. 撤去: `pages/`、Worker `maretol-base-v3` / `-stg`、KV `CMS_CACHE`、`admin-pages/lib/cache.ts` と `/cache` ページの KV 部分、`packages/cms-cache-key-gen`、`cms-cache-purger`

## 8. 検証で確定させること

| 項目 | 時期 |
|---|---|
| Service Binding 経由のパージが届くか。default / named entrypoint の差。反映までの時間。タグ数とレート制限 | M1（確認済み。9 章） |
| ヘッダ 2 本立て、`Set-Cookie`・Cookie・クエリの扱い | M1（確認済み。9 章） |
| パージ入口を default entrypoint に置けるか | M2（RPC メソッドで確定。4.4） |
| `astro dev` でのバインディング | M2（RPC・KV・R2・Images は確認済み。Secrets Store は M3 以降で使うときに確認） |
| Live Content Collections の採否 | M2（使わない。5 章） |
| React Island のバンドルサイズ | M2（確認済み。10 章） |
| drawer・モーダルの実現方式 | M2（Island + History API で確定。決定 13、10 章） |
| staging で、保存から反映までが数秒で済むか。静的アセットを持つ Worker でもヒット・パージが M1 と同じに働くか | M2（確認済み。10 章） |

M1 でパージが成立したため、決定 1（Workers Cache のみ）はそのまま進める

## 9. M1 の検証結果（2026-10-04）

検証用 Worker 2 本（キャッシュされる側 A、Service Binding で A を呼ぶ B）を workers.dev に置いて確認した。wrangler 4.124.0、`compatibility_date = 2026-10-02`。計測は日本国内の 1 拠点からのみ

| 項目 | 結果 |
|---|---|
| ヒット時の Worker 起動 | 起動しない。1 回目 `MISS`、2 回目以降 `HIT` で、描画ごとに変わる id が同じ値のまま返る。HEAD も同じエントリを使う |
| ヘッダ 2 本立て | 想定どおり。エッジは `Cloudflare-CDN-Cache-Control` に従って保持し、クライアントには `Cache-Control: public, max-age=0, must-revalidate` だけが届く。`Cloudflare-CDN-Cache-Control` と `Cache-Tag` はクライアントに出ない |
| エッジ用ヘッダなしで `max-age=0` のみ | 毎回 `EXPIRED` になり再描画される。キャッシュしたいページには必ずエッジ用ヘッダを付ける |
| `Set-Cookie` 付きレスポンス | `BYPASS`。保存されない |
| `private, no-store` | `BYPASS`。保存されない |
| `Cookie` 付きリクエスト | Cookie なしと同じエントリが返る（キーに含まれない） |
| クエリ | クエリ違いは別エントリ。順序違い（`?a=1&b=2` と `?b=2&a=1`）も別エントリ |
| default entrypoint の RPC メソッドからのパージ | 効く。反映まで 0.1〜0.4 秒 |
| default entrypoint の内部ルートからのパージ | 効く。反映まで 0.3〜2 秒 |
| props 付き binding からのパージ | 効く。props なしの公開リクエストのキャッシュも消える（パージは `ctx.props` をまたぐ） |
| named entrypoint からのパージ | `success: true` が返るが、default entrypoint のキャッシュは消えない |
| 無関係なタグのページ | 残る |
| 粗いタグ（`list:blog`） | 同じタグを持つ複数ページがまとめて消える |
| 1 回のパージのタグ数 | 100 個まで成功を確認 |
| レート制限 | 短時間に 27 回前後で `success: false`（code 1134）。バケット約 25・毎分 5 回程度の補充と整合する。上限の単位（Worker ごとかアカウントごとか）は未確認 |
| Service Binding 越しの GET | props なしの binding は公開側と同じエントリを共有する。props 付き binding と named entrypoint は別エントリになる |
| 内部ルートの認可 | 公開側から `POST /__purge` を叩くと 403。props 付き binding からは通る |
| デプロイでの切り替わり | 再デプロイ後の初回は `MISS` で新しい id になり、以降 `HIT`。デプロイ時の全パージは不要 |

## 10. M2 の確認結果（2026-10-04）

`pages-astro` の雛形と記事詳細 1 ページを作り、ローカル（`astro dev`、`astro preview`、`wrangler dev`）と staging で確認した

### ローカル

| 項目 | 結果 |
|---|---|
| 記事詳細の表示 | 現行サイトと同じ記事を並べて比較し、ヘッダー・本文・画像の表示サイズ・リンクカード・注釈・共有ボタン・前後記事・フッターが一致した（サイドバーと、未移植のブロックを除く） |
| バインディング | `astro dev` から、ローカルで動かした cms-data-fetcher / ogp-data-fetcher への RPC、KV、R2（remote）、Images（remote）が動く |
| レスポンスヘッダ | 記事は 30 日 + タグ、`draftKey` 付きは `no-store`、存在しない記事と未定義のルートは 404 を 60 秒、fetcher 停止時は 500 で `no-store` |
| パージ入口 | ビルド済みの Worker に対し、別の Worker から Service Binding 経由で `purgeTags()` を呼べる。不正な引数は `success: false` で返る |
| 内部ルート + props | 不採用。静的アセットを持つ Worker では、ローカル実行時に props が空になった（4.4） |
| React Island | 共有ボタンのコピーだけを Island にした。React 本体が約 69KB、Island 自体が約 2KB（いずれも gzip 後）。`client:visible` なので、ボタンが画面に入るまで読み込まれない |
| 開発サーバー | 起動直後の最初のリクエストで依存の最適化が走ると React が二重に読み込まれ、Island の描画に失敗した。`vite.ssr.optimizeDeps.include` に `@lucide/astro` と `lucide-react` を入れて解消 |
| 画像の派生 | 記事 1 本の写真 2 枚で、表示サイズは現行と同じ 560px 幅のまま、要求する派生が `w=1920` から `w=640` になった |

M2 で移植したブロックは、見出し・段落・リスト・表・コード・引用・区切り線・画像・写真・リンクカード・空行・目次・注釈。それ以外の `p_option`（ブログカード、イラスト・漫画カード、YouTube、Tweet など）は通常の段落として出る（M3）。限定公開記事は 404（`no-store`）にしている（M3 でゲートを移植）

### staging

`maretol-base-v4-stg`（workers.dev）と `admin-pages-stg` で確認した。静的アセットを持つ Worker でも、ヒットとパージは M1 と同じに働く

| 項目 | 結果 |
|---|---|
| 記事詳細 | 1 回目 `MISS`、2 回目以降 `HIT`。ヒット時の応答は約 50ms、キャッシュを通らないとき（`draftKey` 付き）は約 120〜160ms |
| 404 | 存在しない記事・未定義のルートとも `HIT` になり、60 秒後に `EXPIRED` で取り直す |
| キャッシュしないもの | `draftKey` 付きは `BYPASS`（`private, no-store`） |
| Cookie | Cookie 付きのリクエストでも `HIT`（キーに入らない） |
| 静的アセット | `robots.txt`・`favicon.ico` は `REVALIDATED`（アセット配信側が処理し、Worker のキャッシュヘッダは関係しない） |
| admin からのパージ | 記事編集画面の「キャッシュ削除」（`ASTRO_PAGES.purgeTags()`）で、`HIT` が続いていた記事が約 1 秒後に `MISS` になり、`age` が数え直しになった。admin 側の結果も成功 |
| パージなしの場合 | 1 秒間隔で 35 回続けて `HIT`（自然に `MISS` になることはなかった） |

確認の方法: 記事の URL を 1 秒間隔で取得して `cf-cache-status` と `age` を記録し、その間に admin で操作する。staging の admin は本番と同じ D1・KV を使うので、内容を変えずに済む「キャッシュ削除」（D1 に書き込まない）で発火させる。保存操作も同じ `purgeBlogContentCache()` を通る

`admin-pages-stg` は development への push ではデプロイされない（`deploy_stg.yaml` は main 宛ての PR で動く）。admin 側の変更を staging で確認するときは `npm run deploy-stg:admin` を実行する

### drawer・モーダルの調査

現行は Next.js の intercepting route で、次の 2 つを「一覧や記事の上に重ねて表示し、URL も変える」形にしている

- 記事画像モーダル: `/blog/{id}/image/{base64url}`。直接開いた場合は `/blog/{id}#{base64url}` へ移動するだけで、画像単独のページは無い
- イラスト drawer: `/illust/detail/{id}`。直接開いた場合は単独の詳細ページになる

Astro には intercepting route / parallel route に相当する仕組みが無い。`<ClientRouter />`（View Transitions）はページ遷移を滑らかにするもので、重ね表示は提供しない。方式の候補は次のとおり

| 方式 | 内容 | 長所 | 短所 |
|---|---|---|---|
| A. Island + History API | リンクのクリックを横取りして dialog / drawer を開き、`history.pushState` で URL を変える。戻るで閉じる。直接開いた場合は通常のページ | 現行の体験を保てる。JS が無効でも通常の遷移として動く | 中身の取得（詳細ページの HTML 断片を fetch するか、一覧にデータを持たせるか）を自前で組む |
| B. 重ねるが URL は変えない | Island の中で完結させる | 実装が小さい | 開いた状態を URL で共有できない。戻るボタンで閉じられない |
| C. 通常のページ遷移 | drawer / モーダルをやめる | 実装が最小 | 一覧に戻ると位置が失われるなど、閲覧体験が変わる |

決定（決定 13）: イラスト drawer・記事画像モーダルとも A。互換性のため、既存の仕組み（重ねて表示し URL も変える）を変えない

- 記事画像モーダル（M3）: リンク先は現行と同じ `/blog/{id}/image/{base64url}`。Island がクリックを横取りしてモーダルを開き、`pushState` で URL を変える。直接開いた場合（JS が無効の場合を含む）は、現行と同じく `/blog/{id}#{base64url}` へ移動する
- イラスト drawer（M4）: リンク先は現行と同じ `/illust/detail/{id}`。Island がクリックを横取りして drawer を開く。直接開いた場合は単独の詳細ページ
- 戻るで閉じる。閉じる操作は `history.back()` に揃え、履歴に余分なエントリを残さない

記事画像モーダルは M3 で実装した（`src/components/islands/ImageModal.tsx`、Radix Dialog）

- 画像のリンク（`a.x-blog-image`）のクリックを document で受け、`pushState` で URL を変えて開く。履歴の state には画像のアンカー id を入れ、進むボタンで開き直せるようにする
- 閉じる操作（閉じるボタン・Esc・画像の外側のクリック）は `history.back()` を呼び、`popstate` で実際に閉じる。`popstate` が届くまでの間の閉じる操作は無視する（Esc の連打などで履歴を 2 つ戻らないようにする）
- Island は画像のある記事にだけ載せ、`client:idle` で読み込む。読み込み前のクリックや直接開いた場合は、`blog/[article_id]/image/[src].astro` が `/blog/{id}#{base64url}` へ 302 で戻す（`draftKey` は引き継ぐ）
- 自サイトの画像は幅 1920px（2x は 3840px、原本の幅まで）の派生を表示する。引用画像は記事に埋め込まれている data URL をそのまま表示する
- 現行サイトと同じ記事で、モーダル内の画像と閉じるボタンの位置・大きさが一致することを確認した

