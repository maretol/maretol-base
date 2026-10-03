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

未決定: イラスト drawer・記事画像モーダル（現行は intercepting route）の実現方式。M2 で調査して決める

## 3. 全体構成

```
閲覧者 ──▶ Workers Cache ──(ミス時のみ)──▶ pages-astro (maretol-base-v4)
                                              ├─ CMS_RPC ──▶ cms-data-fetcher ──▶ D1 / CMS_DRAFT
                                              ├─ OGP_RPC ──▶ ogp-data-fetcher
                                              ├─ IMAGE_CACHE / OGP_FETCHER_CACHE（KV）
                                              └─ Images binding

admin-pages ──▶ D1 に保存
            └─▶ Service Binding ──▶ pages-astro の default entrypoint ──▶ cache.purge({ tags })
            └─▶ SNS_PUBLISHER
```

- cms-data-fetcher と RPC インターフェース（`packages/api-types`）は変更しない
- D1 への書き込みは従来どおり admin-pages の Server Action が行う。保存 → パージ → SNS 通知の順も変えない

## 4. キャッシュ

### 4.1 ヘッダ

`pages-astro` の wrangler で `[cache] enabled = true` とし、fetch.ts のミドルウェアでレスポンスに次を付ける

| 対象 | `Cloudflare-CDN-Cache-Control` | `Cache-Control` | `Cache-Tag` |
|---|---|---|---|
| キャッシュするページ | `max-age=2592000`（30 日） | `public, max-age=0, must-revalidate` | 4.2 のタグ |
| キャッシュしないページ | 付けない | `private, no-store` | 付けない |

- エッジは `Cloudflare-CDN-Cache-Control` を優先するので、ブラウザには保持させずエッジだけ長く持たせられる
- キャッシュしないもの: 限定公開記事の本体、`draftKey` 付きリクエスト、POST、`/blog/test`、エラー応答（404 は短い TTL でキャッシュしてよい。値は M2 で決める）
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

入口の形は**内部ルート + `ctx.props` による認可**を第一候補とする

- `pages-astro` の fetch.ts に `POST /__purge`（仮）を置き、`ctx.props.role === 'purger'` のときだけ `cache.purge({ tags })` を実行する。それ以外は 403
- admin-pages 側の Service Binding に `props = { role = "purger" }` を付ける。公開リクエストの `ctx.props` は空なので、共有シークレットなしで区別できる
- default export を素の fetch ハンドラ（Hono アプリ）のままにできる。RPC メソッド方式も M1 で成立しているので、Astro のビルド成果物の都合で内部ルートが置けない場合の代替にする（M2 で確認）

運用上の決まり

- Service Binding は環境ごとに分ける（`admin-pages-stg` → `maretol-base-v4-stg`、`admin-pages` → `maretol-base-v4`）
- 切替（M6）までは admin が KV パージと Workers Cache パージの両方を呼ぶ。Service Binding が無い環境では Workers Cache パージを飛ばす
- **保存 1 回につきパージ呼び出しは 1 回**にし、必要なタグをまとめて渡す。パージにはレート制限がある（連続で約 25 回、以後は毎分 5 回程度。9 章）
- `purge()` は制限に達しても例外を投げず `success: false` を返す。戻り値を必ず確認する
- パージの失敗は保存の失敗にしない（現行の KV パージと同じ扱い）。失敗時は admin に表示し、手動パージで回復できるようにする

### 4.5 クエリの扱い

キャッシュのキーはパスとクエリ文字列で、ホスト名は含まれない。任意のクエリで別エントリになり、`?a=1&b=2` と `?b=2&a=1` のような順序違いも別エントリになる。fetch.ts でルートごとに許可するクエリ（`p`、`tag_id`、`draftKey`、`illust_id` など）と並び順を決め、それ以外が付いていたり順序が違ったりしたら正規化した URL へリダイレクトする

リクエストの `Cookie` はキーに含まれない。Cookie の有無で内容が変わるページ（限定公開記事）は、未解錠の表示も含めて必ず `private, no-store` にする

## 5. `pages-astro` の構成

```
pages-astro/
├─ astro.config.ts
├─ wrangler.toml            # maretol-base-v4 / env.staging: maretol-base-v4-stg
└─ src/
   ├─ fetch.ts              # Advanced Routing（Hono）
   ├─ mw/                   # log / secret / cache / query
   ├─ lib/                  # RPC 呼び出し、画像 URL、secret_unlock、OGP
   ├─ pages/
   │  ├─ index.astro
   │  ├─ blog/index.astro, blog/[article_id].astro
   │  ├─ tag.astro
   │  ├─ comics/index.astro, comics/[id].astro
   │  ├─ illust/index.astro, illust/detail/[id].astro
   │  ├─ about.astro, contact.astro, secret.astro
   │  ├─ rss/feed.rdf.ts, sitemap.xml.ts
   │  └─ .well-known/nostr.json.ts        # prerender
   ├─ components/
   │  ├─ blocks/            # ParsedContent のブロック → Astro コンポーネント
   │  └─ islands/           # React: 漫画ビューワ・drawer・モーダル・設定 UI
   └─ layouts/
```

### fetch.ts のミドルウェア順

1. `cf()`（`@astrojs/cloudflare/hono`）
2. アクセスログ（Axiom。bot 判定・geo・prefetch 除外は現行 `pages/middleware.ts` を移植）
3. クエリの正規化
4. 限定公開記事のゲート（署名 Cookie の検証。該当レスポンスを `private, no-store` にする）
5. キャッシュヘッダと `Cache-Tag` の付与
6. Astro の middleware / pages

ログはレスポンスを待たせない（`waitUntil`）。Secrets Store の取得をリクエストごとに await しない（#1303 と同じ問題を持ち込まない）

### データ取得

`cloudflare:workers` の `env` から `CMS_RPC` を呼ぶ薄い関数を `lib/` に置く。`pages/lib/api/workers.ts` の `createCachedAPIFunction`（KV キャッシュ）と一覧総件数キャッシュは移植しない。Live Content Collections を挟むかは M2 で決める

### 画像

- next/image は使わない。`/cdn-cgi/image/` の URL と固定幅 srcset を作るユーティリティを用意する
- 漫画ビューワは固定幅 2〜3 種の srcset、1〜2 本ずつの順次先読み、`onerror` でのリトライ（最後は原本 URL）を持つ
- 記事本文画像の寸法と blur は現行どおり `IMAGE_CACHE` を使う。KV の読み書きに失敗しても描画は続ける（#1300）

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
| Astro のビルド成果物でパージ入口（内部ルート）を default entrypoint に置けるか。fetch.ts から `ctx.props` を読めるか | M2 |
| `astro dev` でのバインディング（D1 は不要、RPC・KV・Images・Secrets Store） | M2 |
| Live Content Collections の採否 | M2 |
| drawer・モーダルの実現方式 | M2 |
| React Island のバンドルサイズ | M2 |

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
