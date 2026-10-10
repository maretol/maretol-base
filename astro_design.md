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
| 9 | prerender | `/.well-known/nostr.json`・robots など本当に静的なものだけ（どちらも `public/` の静的ファイルにした） | about / contact / secret は D1 由来で CMS から更新される |
| 10 | アクセスログ | Axiom へのログは描画時（ミス時）のみになることを受容。アクセス解析は Cloudflare beacon / Clarity / Cloudflare Analytics で見る。beacon / Clarity のタグは本番だけに出す（staging では出さない） | ヒット時は Worker が起動しない。ログはエラーと異常アクセスの監視用に残す。staging のアクセスを解析に混ぜない |
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
- 一覧（ブログ一覧・タグ一覧）のページ番号 `p` は、不正な値と `p=1` を、`p` を外した URL へ 308 でリダイレクトする。これはクエリの正規化（4.5）がほかのクエリとまとめて 1 回で行い、ページは形式を検証しない（受け付ける形式は `src/lib/pagination.ts` の `isPageParam`）。総ページ数を超える `p` は、ページが 404 にする。この 404 には `list:blog` を付け、記事が増えたときに一緒に消えるようにする
- タグ一覧で、タグの一覧に無い `tag_id` を指定された場合は 400 を返す（`src/pages/400.astro`）。404 と同じく 60 秒だけキャッシュし、`blog` を付けて、タグが作られたときに一緒に消えるようにする
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
| `tag:{tag_id}` | タグ一覧（現行と同じく、タグは 1 つだけ指定できる） |
| `info` | about / contact / secret / `artifacts/post-for-nostter`（info の内容を表示するページ）。制作物カードを含む記事詳細 |
| `list:comics` | 漫画の一覧と、漫画詳細（前後の巻へのリンクが他の巻の公開状態で変わるため、シリーズの有無にかかわらず持つ）。トップと、サイドバーを持つページ。漫画カードを含むページ |
| `comic:{id}` | 漫画詳細 |
| `series:{id}` | シリーズ作品の漫画詳細と、シリーズで絞り込んだ漫画の一覧（`/comics?series={id}`）。パージには使っていない |
| `list:illust` | イラストの一覧と、イラスト詳細（背景に一覧の 1 ページ目を出すため）。トップと、サイドバーを持つページ。イラストカードを含むページ |
| `illust:{id}` | イラスト詳細 |

サイドバーを持つページ（ブログ一覧・タグ一覧・記事詳細など、`BlogLayout` を使うページ）は、サイドバーが最新の記事・漫画・イラストとタグの一覧を出すので、`blog` / `list:blog` / `list:comics` / `list:illust` をまとめて持つ（`src/lib/cache.ts` の `latestListTags`）。ページは `cachePage()` に `{ sidebar: true }` を渡して付ける。付け忘れると古いサイドバーが残るので、サイドバーの描画時に確かめて、付いていなければ例外にする（`assertSidebarTagged()`）。漫画やイラストを保存すると、サイドバーを持つページもパージされる。トップページも同じ 4 つを持つ（3 種類の一覧を出すため）。404 と 500 のページはサイドバーを出さない（存在しない URL への連続アクセスで、サイドバーのための取得が増えないようにする）

一覧に出す記事の抜粋にカードが含まれる場合は、その参照先のタグも付ける。タグ一覧の `tag:{tag_id}` は、タグの一覧にある ID にだけ付ける（一覧に無い値は 400 にするので、クエリの値がそのままヘッダへ入ることはない）

本文にカードを埋め込んだ記事詳細には、参照先のタグも付ける（`src/lib/content_tags.ts`）。イラストカードは `illust:{id}` と `list:illust`、漫画カードは `comic:{id}` と `list:comics`、制作物カードは `info`、ブログカードは `list:blog`。固定ページ（`/secret` など）の本文にブログカードがある場合も、同じ仕組みで `list:blog` が付き、記事の保存でパージされる。イラストと漫画のカードに粗いタグ（`list:illust` / `list:comics`）も付けるのは、手動パージ（4.3）がこのタグで消すため。サイドバーの無い固定ページは、付けないとカードの参照先のタグ（`illust:{id}` など）しか持たず、手動パージが届かない

### 4.3 保存操作とパージするタグ

| admin の操作 | 現行の KV パージ | パージするタグ |
|---|---|---|
| ブログ記事の保存・削除 | `purgeBlogContentCache(id)` | `post:{id}`, `list:blog` |
| タグ（カテゴリ）の編集 | `purgeBlogMetaCache('tags')` | `blog` |
| info の編集 | `purgeBlogMetaCache('info')` | `info` |
| static（固定文言）の編集 | `purgeBlogMetaCache('static')` | `layout` |
| 漫画の保存・削除 | `purgeBandeDessineeCache(id)` | `comic:{id}`, `list:comics` |
| イラストの保存・削除 | `purgeAtelierCache(id)` | `illust:{id}`, `list:illust` |
| 手動パージ（admin の `/cache` ページ） | グループ単位・全件 | グループごとに下の表のタグ。全件は `layout` |

手動パージのグループとタグ（`packages/cache-tags` の `manualPurgeTags`。admin 側のグループの定義は `admin-pages/lib/cache-groups.ts` の `CACHE_GROUPS`）

| グループ | パージするタグ |
|---|---|
| イラスト | `list:illust` |
| マンガ | `list:comics` |
| ブログ（一覧・タグ絞り込み・記事単体） | `blog` |
| ブログメタ（tags / info / static） | `layout`（固定文言は全ページに出るため、全ページを対象にする） |

- 記事詳細は前後記事を表示するため `list:blog` を持つ。記事を保存するとブログ系はほぼ全ページがパージされる。現行の KV パージと同じ粒度であり、前後記事のパージ漏れ（#1310）はこれで解消する
- 手動パージは保存時より粗い。保存時のパージに失敗したときの回復と、D1 を直接編集したあとの反映に使う。漫画の詳細は常に `list:comics` を、イラストの詳細は背景に一覧を出すため `list:illust` を持つので、手動パージの「マンガ」「イラスト」は詳細ページにも届く（M4 で確認）
- ブログの一覧と記事単体は、KV ではキーが分かれるが、公開サイトでは同じ `blog` になる。グループを分けると同じパージを 2 回実行することになるので、1 つのグループにしている
- 手動パージの `blog` は、ブログカードを埋め込んだサイドバーの無い固定ページ（`list:blog` だけを持つ）には届かない。該当するのは `/secret` だけなので、許容する（届かせるなら「ブログメタ」をパージする）
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

タグの文字列と、パージするタグの組（保存操作ごとの `purgeTags` と、手動パージのグループごとの `manualPurgeTags`）は `packages/cache-tags` に置き、付ける側（pages-astro）とパージする側（admin-pages）の両方がそこを参照する

運用上の決まり

- Service Binding は環境ごとに分ける（`admin-pages-stg` → `maretol-base-v4-stg`、`admin-pages` → `maretol-base-v4`）
- 切替（M6）までは admin が KV パージと Workers Cache パージの両方を呼ぶ。Service Binding が無い環境では Workers Cache パージを飛ばす
- **保存 1 回につきパージ呼び出しは 1 回**にし、必要なタグをまとめて渡す。パージにはレート制限がある（連続で約 25 回、以後は毎分 5 回程度。9 章）
- `purge()` は制限に達しても例外を投げず `success: false` を返す。戻り値を必ず確認する
- パージの失敗は保存の失敗にしない（現行の KV パージと同じ扱い）。失敗時は admin に表示し、手動パージで回復できるようにする。保存後の遷移先に `purge_failed=1` を付け、画面に「公開サイトのキャッシュ削除に失敗しました」と出す（記事・漫画・イラストは編集画面のキャッシュ削除ボタン、タグ・info・固定文言はキャッシュ管理の「ブログメタ」へ案内する）。手動パージ自体が失敗したときも同じように表示する

### 4.5 クエリの扱い

キャッシュのキーはパスとクエリ文字列で、ホスト名は含まれない。任意のクエリで別エントリになり、`?a=1&b=2` と `?b=2&a=1` のような順序違いも別エントリになる。そこで、ミドルウェア（`src/mw/query.ts`）でルートごとに受け付けるクエリと並び順を決め、それ以外が付いていたり順序が違ったりしたら、正規化した URL へ 308 でリダイレクトする

| ルート | 受け付けるクエリ（この順） |
|---|---|
| `/blog` | `p` |
| `/tag` | `tag_id`, `tag_name`, `p` |
| `/blog/[article_id]`、`/blog/[article_id]/image/[src]` | `draftKey` |
| `/illust` | `p` |
| `/illust/detail/[id]` | `draftKey` |
| `/comics` | `series`, `p` |
| `/comics/[id]` | `draftKey` |
| それ以外 | なし |

- 受け付けるクエリの表は、Astro のルート（`src/pages` のファイルと 1 対 1。`blog/[article_id].astro` なら `/blog/[article_id]`）をキーにして `src/mw/query.ts` に持つ。リクエストがどのルートに当たるかは Astro の判定（`getFetchState(c).routeData`）を使うので、パスのデコードや末尾のスラッシュの扱いが、ページの描画と揃う
- クエリを受け付けないルートも、空の指定で表に載せる。**表に載っていないルートへのリクエストは例外にする**（500）。黙ってクエリを外すと、ページ番号や `draftKey` が効かない原因に気づけないため。どのルートにも一致しないパスは Astro が 404 のルートを割り当てるので、例外にはならず、クエリを外すだけになる
- ルートを足したら（M4 のイラスト・漫画など）、受け付けるクエリを表に足す。足し忘れると、そのページを開いた時点で例外になる
- どのルートでも、UTM パラメータ（`utm_source` / `utm_medium` / `utm_campaign` / `utm_content`）は残す。流入元の解析はブラウザ側（Clarity など）が URL から読むため。**値は見ない**（キーだけで判定する）。値を変えればキャッシュのエントリを増やせるが、存在しないパスやパスの表記揺れでも同じことができるので、ここでは絞らない。エントリの数そのものには課金されず、数の上限も Cloudflare のドキュメントには無い。増えるのはミス時の描画で、Worker の起動回数に表れる（ヒット時は Worker が起動しない）
- 値まで見るのはページ番号 `p` の形式だけ。正の整数以外と `p=1` は外す（1 ページ目は `p` の無い URL に統一する）。ほかのクエリとまとめて 1 回のリダイレクトで済ませるため、ページではなくここで行う。値の検証のうち、ページ番号の範囲と、存在するタグかどうかは、各ページが行う
- 並び順は、サイト内のリンクが作る順に合わせる（合わないと、リンクを踏むたびにリダイレクトになる）
- 同じキーが複数あるときは先頭の値を使い、空の値は外す。`/blog?` のように `?` だけが付いた URL も揃える
- 対象は GET と HEAD だけ。Astro の内部ルート（`/_server-islands/` など）は触らない
- リダイレクト先（`Location`）は、スラッシュ 1 つで始まるパスにする。`//example.com?x=1` のようなパスをそのまま返すと、ブラウザがホスト名として解釈し、別サイトへのリダイレクト（オープンリダイレクト）になる
- リダイレクト自体は `private, no-store` にする（クエリの数だけエントリが増えるのを防ぐ）
- 末尾のスラッシュは付けない形に揃える（`astro.config.ts` の `trailingSlash: 'never'`。`/illust/detail/{id}/` → `/illust/detail/{id}` へ 301。クエリは引き継ぐ。`/` と `/_` で始まる内部パスは対象外）。末尾の重複したスラッシュ（`/blog//`）も同時に揃う。リダイレクトを行うハンドラ（`astro/hono` の `trailingSlash()`）は `middleware()` / `pages()` に含まれないので、`src/worker.ts` で明示的に載せる。GET は 301、それ以外は 308。レスポンスは Astro のもので `Cache-Control` は付かず、キャッシュヘッダの確定（`src/mw/cache.ts`）より前で返るので `no-store` も付かない。恒久的なリダイレクトなので、エッジが既定の期間だけ保持しても問題ない。揃えないと、エッジのエントリが分かれるだけでなく、URL からイラストの ID を読む drawer の island（`/illust/detail/{id}` にだけ一致させている）が、`/illust/detail/{id}/` を開いたときに hydration 後に閉じてしまう
- パスのエンコードの違いは揃えない。別のエントリになるが、許容する
- `/tag` の `tag_name` は表示用の値で、任意の値を通す。値を変えればエントリは増えるが、許容する（問題になったら `tag_name` 自体をやめる）
- リンクカードの Server Island（`/_server-islands/LinkCard`）のクエリは正規化していない。扱いは別に考える

リクエストの `Cookie` はキーに含まれない。Cookie の有無で内容が変わるページ（限定公開記事）は、未解錠の表示も含めて必ず `private, no-store` にする

## 5. `pages-astro` の構成

```
pages-astro/
├─ astro.config.ts          # output: 'server'、Cloudflare アダプタ、React、Tailwind
├─ wrangler.toml            # maretol-base-v4 / env.staging: maretol-base-v4-stg
├─ tailwind.config.ts       # 現行 pages の設定を引き継ぐ（global.css の @config から読む）
└─ src/
   ├─ worker.ts             # Worker のエントリ（wrangler の main）。Hono + RPC メソッド
   ├─ mw/                   # cache / purge / query / observe
   ├─ lib/                  # RPC 呼び出し、キャッシュヘッダ、画像 URL、OGP、ページ番号
   ├─ pages/
   │  ├─ index.astro
   │  ├─ blog/index.astro, blog/[article_id].astro
   │  ├─ blog/[article_id]/image/[src].astro   # 画像モーダルの URL を直接開いたときのリダイレクト
   │  ├─ blog/[article_id]/unlock.ts           # 限定公開記事の解錠（POST）
   │  ├─ tag.astro
   │  ├─ comics/index.astro, comics/[id].astro
   │  ├─ illust/index.astro, illust/detail/[id].astro
   │  ├─ about.astro, contact.astro, secret.astro
   │  ├─ rss/feed.rdf.ts, sitemap.xml.ts
   │  ├─ artifacts/post-for-nostter.astro
   │  ├─ 400.astro, 404.astro, 500.astro
   │  └─ （.well-known/nostr.json と robots.txt は public/ の静的ファイル）
   ├─ components/
   │  ├─ blocks/            # ParsedContent のブロック → Astro コンポーネント
   │  ├─ article/ shell/ ui/
   │  ├─ top/ illust/ comic/   # トップページの一覧、イラスト・漫画のカード
   │  └─ islands/           # React: 漫画ビューワ・drawer・モーダル・設定 UI
   ├─ layouts/              # BaseLayout（html / head）→ SiteLayout（ヘッダー・フッター）→ BlogLayout（サイドバー）
   └─ styles/global.css
packages/cache-tags/        # Cache-Tag の文字列と、保存操作・手動パージごとのパージ対象
```

いま存在するのはトップ（`index.astro`）、ブログ一覧（`blog/index.astro`）、タグ一覧（`tag.astro`）、記事詳細（`blog/[article_id].astro` と画像モーダルの URL）、限定公開記事の解錠（`blog/[article_id]/unlock.ts`）、固定ページ（`about.astro`、`contact.astro`、`secret.astro`、`artifacts/post-for-nostter.astro`）、フィード（`rss/feed.rdf.ts`、`sitemap.xml.ts`）、イラスト一覧（`illust/index.astro`）、イラスト詳細（`illust/detail/[id].astro`）、漫画一覧（`comics/index.astro`）、漫画詳細（`comics/[id].astro`）、`400.astro`、`404.astro`、`500.astro`。現行サイトのページはこれで全部そろった（M4）

### Worker のエントリ（src/worker.ts）

Astro 7 の `src/fetch.ts`（Advanced Routing）は使わず、wrangler の `main` に自前のエントリを指定する。`src/fetch.ts` はアダプタの既定エントリ経由だと `fetch(request)` の引数 1 つで呼ばれ、`ExecutionContext` を受け取れないため。Cloudflare 用のハンドラ `cf()`（`@astrojs/cloudflare/hono`）も自前のエントリで使う前提になっている

エントリは Hono のアプリを `WorkerEntrypoint` のクラスで包む。クラスにするのは、パージ用の RPC メソッドを default entrypoint に置くため（4.4）

ミドルウェアの順序

1. `cf()`（静的アセットの配信、`locals.cfContext` などの設定。Astro の他のハンドラより前に置く）
2. 観測（`src/mw/observe.ts`。レスポンスの確定後に、アクセスログと後ろで記録されたイベントをまとめて Axiom へ送る。「ログと解析」）
3. 末尾のスラッシュの正規化（`astro/hono` の `trailingSlash()`。4.5。クエリの正規化より前に置き、両方がずれていてもスラッシュを直した URL にクエリの正規化が 1 回かかるだけで済むようにする）
4. クエリの正規化（`src/mw/query.ts`。4.5）
5. （限定公開記事のゲートはミドルウェアにしない。記事詳細のページが記事を取得した時点で判定する。6 章）
6. キャッシュヘッダの確定（`src/mw/cache.ts`。HTML の本文を最後まで描画し、既定値の適用・不完全なページの保持期間の短縮・描画中の例外の 500 化を行う）
7. Astro の `middleware()` / `pages()`

ミドルウェアの例外（`mw/query.ts` の routes に無いルートなど）は Hono の `app.onError` で受け、記録して 500 ページ（`src/lib/error_page.ts`）を返す。ログはレスポンスを待たせない（`waitUntil`）。Secrets Store の取得をリクエストごとに await しない（#1303 と同じ問題を持ち込まない）

### 固定ページとフィード

- about / contact / secret / `artifacts/post-for-nostter` は、CMS の info をパスで探して表示する（`getInfoPage()`）。取得からキャッシュの指定までは 4 ページ共通で、`src/lib/info_page.ts` の `loadInfoPage()` にまとめている。該当する info が無ければ 404 にし、`info` のタグを付けて、公開されたときに一緒に消えるようにする。`artifacts/post-for-nostter` だけサイドバーを出す（現行と同じ）
- RSS（`/rss/feed.rdf`）は、最新 20 件の記事の冒頭 10 ブロックを載せる。本文の組み立て（`src/lib/rss.ts`）は現行サイトと同じで、出力も一致する。エッジには `blog` / `list:blog` のタグで 30 日キャッシュし、記事の保存でパージする。フィードリーダーには保持させない（ほかのページと同じ `max-age=0, must-revalidate`。現行サイトは `max-age=3600` を返している）。記事の取得に失敗したときは 500 にする（空のフィードをキャッシュさせない）
- sitemap（`/sitemap.xml`）は、現行と同じく入口になる 7 ページだけを載せる。`lastmod` は描画した時刻で、記事の保存でパージされたときに新しくなる。漫画・イラスト・タグ・info の保存には追従させない（現行サイトの `lastmod` も内容の更新には追従していない。追従させるためにタグを足すと、内容と無関係なパージでも全ページの `lastmod` が変わる）
- `robots.txt` と `/.well-known/nostr.json` は `public/` の静的ファイル。`nostr.json` の CORS のヘッダは `public/_headers` で付ける。`robots.txt` は、現行の `/_next/` と `/api/` の Disallow を外し、`/_server-islands/` だけを Disallow にする（CSS や JS のある `/_astro/` はクローラに見せる）

### データ取得

`cloudflare:workers` の `env` から `CMS_RPC` を呼ぶ薄い関数を `src/lib/api/` に置く。`pages/lib/api/workers.ts` の `createCachedAPIFunction`（KV キャッシュ）と一覧総件数キャッシュは移植しない。info の一覧だけは、取得中の Promise を `Astro.locals` に置き、1 回の描画の中で共有する（制作物カードが複数あると、カードごとに全件の取得とパースが走るため。リクエストをまたぐキャッシュは持たない）。Live Content Collections は使わない（RPC を包むだけなので素の関数で足り、エラーの扱いも自前で決められる）

サイドバー（`src/components/shell/sidebar/BlogSidebar.astro`）は、固定文言・最新の漫画・イラスト・記事・タグの 5 つを自分で取得する。取得できなかった区画は、枠を残して「取得できませんでした」と出し、不完全なページとして記録する（10 分キャッシュ）。本文は表示する。固定文言に該当する項目が無い場合も同じ表示にする。タグの一覧と記事の一覧は、ページ本体とサイドバーの両方が取得するので、info と同じく取得中の Promise を `Astro.locals` に置いて 1 回の描画の中で共有する（ブログ一覧の 1 ページ目では、サイドバーは本体が取得した一覧の先頭を使う）。サイドバーはページの HTML に含める（Server Island にはしない。JS が無くても最新の一覧へのリンクが出ることと、取得が自サイトの中で完結して速いことから）

RPC メソッドの型は `src/env.d.ts` で付ける。`cms-data-fetcher/types.d.ts` と `ogp-data-fetcher/types.d.ts` を参照し、`Cloudflare.Env` とグローバルの `Env` の `CMS_RPC` / `OGP_RPC` を `Service<…>` として宣言する（`wrangler types` は Service Binding を `Fetcher` としか出力しない。pages / admin-pages の `env.d.ts` と同じやり方で、キャストは使わない）

絶対 URL（OGP・canonical・RSS など）は環境ごとの `HOST`（wrangler.toml の vars）から作る（`src/lib/site.ts`）。astro.config.ts の `site` は設定しない。ビルド時に決まる値なので、本番の URL を書くと staging でも `Astro.site` が本番を指す

### 画像

- next/image は使わない。`/cdn-cgi/image/` の URL と srcset は `src/lib/image.ts` と `src/components/ui/CdnImage.astro` で作る
- 派生の幅は固定の候補から選び、1x と 2x の 2 つだけを要求する。表示幅の上限（本文は 1280px、写真は 576px）と原本の幅で頭打ちにするので、現行より小さい派生で済む（例: 幅 576px の枠に入る写真は、現行の `w=1920` / `w=3840` に対して `w=640` / `w=1200`）
- 2x の候補が 1x と同じ URL になっても srcset からは省かない。省くと画面の密度ごとの表示サイズが現行と変わる
- 漫画ビューワのページの画像は、固定幅 3 種（828 / 1200 / 1920px）の srcset、表示中のページから順に読み込む先読み、`onerror` でのリトライ（最後は原本 URL）を持つ（下の「漫画」）
- 記事本文画像の寸法と blur は現行どおり R2 + Images binding で作り、`IMAGE_CACHE` に 7 日保持する。KV の読み書きに失敗しても描画は続ける（#1300）
- 引用画像（外部サイトの画像）は現行どおりサーバー側で取得し、data URL で HTML に埋め込む（`src/lib/api/cite_image.ts`）。待ち時間は 5 秒、成功は `IMAGE_CACHE` に 7 日、失敗は 10 分保持する。キャッシュの形式は現行と同じ。取得する画像は 3MB までにし、超えるものは失敗として扱う（HTML にそのまま埋め込まれ、描画中のメモリにも全量が載るため）。失敗の記録には、取り直しても直らない失敗かどうかの印を含める（`error:permanent:`。現行サイトは `error:` で始まる値を失敗として読むので、そのまま共有できる）
- リンクカードは Server Island（`server:defer`）にする（`src/components/blocks/LinkCard.astro`、決定 14）。記事の HTML には、同じ枠にホスト名と URL だけを入れた表示（`LinkCardFallback.astro`）を出し、ブラウザが `/_server-islands/LinkCard` から取得したカードに差し替える。枠（`LinkCardFrame.astro`）を共有するので、差し替えで大きさは変わらない。JS が動かない閲覧者やクローラには、差し替え前の表示（リンクは機能する）のまま残る
- island のレスポンスは記事とは別にエッジへキャッシュする（`cacheLinkCard()`）。リンク先の情報を取得できたときは 3 日（OGP データを KV に持つ期間と同じ）、取得できなかったときは 10 分
- island の props（リンク先の URL）は、ビルドごとに生成される鍵で暗号化して URL に入る。デプロイをまたぐと古い URL は復号できない（差し替えられず、差し替え前の表示のまま残る）が、Workers Cache はデプロイで切り替わる（9 章）ので、キャッシュ済みの記事が古い鍵の URL を持ち続けることはない。鍵を固定する場合は、ビルド時に `ASTRO_KEY` を渡す
- OGP の取得（`src/lib/api/ogp.ts`）は、待ち時間を 5 秒にし、失敗を `OGP_FETCHER_CACHE` に 10 分保持する。待ち時間を超えても取得と KV への保存は `waitUntil` で続け、遅れて返った結果を次回の描画で使う（応答が遅いだけのリンク先でも、2 回目にはカードが出る）。KV への書き込みは描画では待たない。現行サイトも同じ KV を読むので、失敗の記録は `OGPResult` として読める形（`success: false`）にしている

### 漫画

- 一覧（`/comics`）は `series` でシリーズに絞り込める（漫画詳細の「This series」とビューワの末尾の案内から来る）。ID の形式（英数字・ハイフン・アンダースコア）に合わない値は 400、形式は合うが漫画が 0 件（存在しないシリーズや公開中の巻が無いシリーズ）のときは、見出しと見つからなかったことを出して 404 にする（どちらも 60 秒キャッシュ。現行サイトは形式に合わない値を無視して全件を出し、0 件は 200 で返していた）。`series:{id}` のタグは、漫画が実際にあるシリーズにだけ付ける（クエリの値をそのままヘッダへ入れない）
- 詳細（`/comics/{id}`）は、サイトのヘッダーを出さず、上にビューワ、下に作品情報と説明文を置く（現行と同じ。マウスを上端に乗せるとロゴが出る）。fetcher は存在しない ID とそれ以外の失敗を区別せずに例外を投げるので、取得できなければどちらも 404（ビューワの形を保った見つからない表示、`comic:{id}` のタグで 60 秒）
- ビューワは React の Island（`src/components/islands/comic-viewer/`、`client:load`）。現行サイトの `pages/components/middle/comicbook` の移植で、右綴じ（`dir=rtl`）の Swiper、画面の幅（980px）での見開き・単ページの切り替え、スワイプ・キーボード・左右のボタン・画面の左右 1/3 のクリックでのページ送り、シリーズ作品の末尾の案内（次の話へ / 現在の最新話。案内の表示中にもう一度送ると次の話へ遷移）、設定（ページ送りボタンの見やすさ・非表示・モードの固定）の `localStorage` への保存は、動作もキーも現行と同じ。Island には説明文などを含まない平らな情報（`ComicViewerData`）だけを渡す。次の話への遷移は通常の遷移（`location.assign`）
- 画面の幅・設定・読み込みの状態は `useSyncExternalStore` で読む（サーバーと hydration では単ページ・既定の設定）。モードの固定は、固定にした時点のモードを保ち、固定のまま読み込み直したときはそのときの幅のモードで固定し直す（現行と同じ）
- ページの画像（`ComicImage.tsx`）: `srcset` は幅 828 / 1200 / 1920px の 3 つ、`sizes` は `(min-width: 980px) 50vw, 100vw`（画像は高さいっぱいに出すので幅は目安。見開きかどうかを決めるのと同じメディアクエリにして、サーバーとブラウザで同じ候補を選ばせる）。読み込みに失敗したら 1 秒おいて取り直す。派生画像の組 → 幅 1200px の派生 1 つ（2 回）→ 原本の URL の順に試し、原本も失敗したら諦める。原本の取得はできるだけ避けたいので、原本は 4 回目にする。サーバーで描画した画像は hydration の前に読み込みが終わっていることがあるので、取り付け時に成否を見て同じ扱いにする（失敗していれば取り直す）
- 順次先読み（`pages.ts` の `getLoadableIDs`）: 画像は許可されたスライドにだけ置く。表示中のスライドは常に許可し、それ以外は進む方向に 4 枚・戻る方向に 2 枚までを候補にして、読み込み中（読み込みの成否がまだ分からない）画像が 2 枚以下になるように順に許可する。表示中・候補・読み込み済みから決まる純粋な計算なので、画像の読み込みが終わるたびに計算し直す。一度読み込んだ画像は置いたままにする。現行サイト（Swiper の前後 4 枚の先読みと `loading="lazy"`）のように、開いた直後に多数のページを一斉に要求しない

### スタイルと UI 部品

- Tailwind v4（`@tailwindcss/vite`）。`global.css` と `tailwind.config.ts` は現行 pages から引き継ぐ
- フォントは `@fontsource-variable/m-plus-1` と `@fontsource-variable/suse`（next/font の置き換え）。Astro の Fonts API は使っていない（内部で使う `undici` が Node 22.19 以上を要求しており、CI とローカルの 22.17 で動く確証が無い。未検証）
- shadcn 由来の Button / Card は React コンポーネントにせず、class の定義（`src/components/ui/button.ts`、`card.ts`）を `.astro` と Island の両方から使う。`.astro` から React の `asChild` は使えないため
- アイコンは `.astro` では `@lucide/astro`、Island では `lucide-react`
- Island には class をサーバー側で組み立てて props で渡す（tailwind-merge などをクライアントへ持ち込まない）
- 共有のボタン（`src/components/article/ShareSection.astro`）の「タイトルと URL をコピー」は Island にせず、document で受けるクリック（`src/lib/share_copy.ts`）で動かす。イラストの drawer に差し込んだ HTML の中にあるボタンでも動くようにするため（差し込んだ HTML の中の `<astro-island>` は hydrate されない）。コピーしたことはボタンの `data-copied` 属性で示し、アイコンの切り替えは CSS で行う
- サイドバーのタグの選択は React の Island（`src/components/islands/TagSelect.tsx`、Radix Select）。サイドバーは md（48rem）以上の幅でだけ表示するので、`client:media="(min-width: 48rem)"` でその幅になってから読み込む（狭い画面で開いたあとに幅が広がった場合も、その時点で読み込まれる）。class は現行サイトの shadcn/ui の Select を結合済みの文字列で持つ。トップページの横スクロールの左右ボタンは、Island にせず `<script>` で動かす
- ヘッダーのロゴ画像の `width` / `height` は原本（1104×210）の比率に合わせる。本文とサイドバーの列の幅は grid で決める（`minmax(0,4fr)` と `minmax(15rem,1fr)`、間隔 16px）。本文は残りの幅、サイドバーは全体の 1/5 で、狭い画面では 15rem にする。幅が中身・フォント・サイドバーの有無に左右されないので、読み込みの途中で本文の幅が変わらない。どちらも、初回訪問時のレイアウトのずれを避けるため（#1355）。幅 1280px 以上では現行サイトと同じ幅になり、それより狭い幅では本文が少し狭くなる（900px で 12px。現行サイトは、サイドバーの幅が中身の最小幅で決まっている）
- 漫画の表紙（サイドバーと概要カード）は、1:1.41（B5 など）を想定して枠の比率を固定し、`object-contain` で収める。読み込み後に高さが変わらないようにするため（#1355）

### ログと解析

- アクセス解析は Cloudflare Web Analytics の beacon と Microsoft Clarity で行う（決定 10）。どちらも本番（`ENV` が `PRD`）だけに出し、staging と開発サーバーでは出さない（`src/components/shell/AnalyticsScripts.astro`、`isProduction()`）。Clarity のプロジェクト ID は Secrets Store（`CLARITY_ID`）から読む。読めないときは Clarity を出さずに描画を続ける
- Axiom へのログは、異常なアクセスとエラーの監視用（決定 10）。ヒット時は Worker が起動しないので、残るのは描画した（ミスした）リクエストだけ。本番と staging の両方から送り（現行と同じ。`host` で区別する）、開発サーバーからは送らない（`src/worker.ts` を通らない）。Cloudflare の OpenTelemetry export / Logpush / Tail Workers は Workers Paid 限定なので使わず、Worker から送る
- 仕組み。Astro の `locals` を 1 リクエストの記録先にし、送信は 1 か所にまとめる
  - 記録: 起きたことは `recordLogEvent(locals, event)`（`src/lib/log.ts`）で `Astro.locals.logEvents` に積む。Hono のミドルウェア（`getFetchState(c).locals`）と Astro のページ（`Astro.locals`）は同じオブジェクトを見る
  - 送信: `cf()` の直後の `src/mw/observe.ts` が、レスポンスの確定後（後ろで例外が起きても）にアクセスログと積まれたイベントをまとめ、`src/lib/axiom.ts` の `sendLogs(ctx, events)` で 1 回の POST として `waitUntil` に渡す。ctx は呼び出し元が渡す
  - Secrets Store（`AXIOM_ENDPOINT` / `AXIOM_APITOKEN`、`CLARITY_ID`）は `src/lib/cached_read.ts` で isolate ごとに 1 回だけ読む。読めなかったときは null を返し、60 秒は読み直さない（障害の間にすべての描画が読み取りを待たされないようにする）
  - 送信の失敗はページに影響させず、Workers Logs に残す
- 送るイベントは 4 種類。`type` で区別する
  - `access_log`（`observe.ts`）: 現行 `pages/middleware.ts` と同じ項目（method / host / path / search / referer / utm_* / is_bot / bot_name / user_agent / country / region / city / connecting_ip）に `status` と `route`（Astro のルート。`/blog/[article_id]` の形）を足したもの。bot 判定は現行のパターンをそのまま使う。地域情報は `request.cf` から読む。残さないのは、Astro の内部ルート（`/_server-islands/`、`/_astro/`、`/_image`）と `/cdn-cgi/`、機械向けのルート（`/rss/feed.rdf`、`/sitemap.xml`）、ブラウザの先読み（`Sec-Purpose` / `Purpose` に prefetch）。静的アセットは Worker の手前で配信されるので、その形のパスが Worker に来るのは存在しないものへのアクセスであり、残す。末尾のスラッシュの 301、クエリの正規化の 308、500 への差し替えも、そのステータスで残る
  - `degraded_page`（`src/mw/cache.ts`）: 取得に失敗した部品を含むページ（4.1）。`reasons` に `locals.degraded` の内容。キャッシュしないページでも残す
  - `render_error`: 描画中の例外。`stage: 'page'` はページの frontmatter の例外で、Astro が catch して `500.astro` を描くときに渡す `error` prop から `500.astro` が記録する（Astro 自身も `console.error` にスタックを出す）。`stage: 'stream'` は本文の描画中の例外で、`src/mw/cache.ts` が検出して `/500` へ rewrite する。どちらも `error` と `stack`
  - `middleware_error`（`src/worker.ts` の `onError`）: ミドルウェアの例外。`error` と `stack`
- Workers Logs（observability）には、現行がしていた全アクセスの `console.log` は出さない（Axiom に一本化する）。不完全なページ・描画中の例外・ミドルウェアの例外は、これまでどおり `console.warn` / `console.error` にも出す

### ビルド・デプロイ・ローカル開発

- 環境はビルド時に決まる。staging は `CLOUDFLARE_ENV=staging astro build` のあと `wrangler deploy`（`-e staging` は効かない）。`npm run deploy-stg:astro`
- `astro check` は TypeScript 7 に未対応のため、このワークスペースだけ TypeScript 6 を使う
- ローカル開発は `npm run dev:cms` と `npm run dev:ogp` を起動した状態で `npm run dev:astro`。Service Binding はローカルの fetcher につながる。R2 と Images binding は `remote = true` で実物を読む（cms-data-fetcher の D1 と同じ扱い）
- Workers Cache はローカルでは働かない。キャッシュとパージの確認は staging で行う
- デプロイ: staging は development への push（`deploy_stg_astro.yaml`）と main 宛て PR（`deploy_stg.yaml`）で `maretol-base-v4-stg` へ、本番は main への push（`deploy_prd.yaml`）で `maretol-base-v4` へ出す。本番の Worker は切替（M6）まで custom domain を付けず workers.dev だけで動くので、本番デプロイを先に始めても公開サイトには影響しない
- e2e（`e2e/`、Playwright）は main 宛て PR の staging デプロイ後（`deploy_stg.yaml` の e2e ジョブ）に `maretol-base-v4-stg` に対して走る。development への push では走らせない。Next.js 版（`maretol-base-v3-stg`）は対象にしない

## 6. 限定公開記事

- 現行の `pages/lib/secret_unlock.ts`（HMAC-SHA256 署名 Cookie `secret_unlock_{id}`、HttpOnly / Secure / path 限定 / 30 日、定数時間比較）をそのまま移植する（`src/lib/secret_unlock.ts`）。署名の方式と鍵（Secrets Store の `SECRET_ARTICLE_COOKIE_KEY`）が現行と同じなので、現行サイトで発行した Cookie は Astro 版でもそのまま有効
- ゲートは記事詳細のページ（`blog/[article_id].astro`）で判定する。限定公開記事は、解錠の Cookie が有効なときだけ本文を描画し、それ以外は題名と入力フォームだけを出す（`SecretGate.astro`）。下書きプレビューでも同じく閲覧コードを求める
- unlock は POST エンドポイント（`/blog/{id}/unlock`）にし、Workers の Rate Limiting バインディング（`SECRET_UNLOCK_RATE_LIMIT`）で IP ごとに 60 秒で 5 回までに制限する（colo 単位の近似である点は許容）。超えたら 429 を返す。IPv6 は、利用者が /64 の中でアドレスを変えられるので、/64 ごとに数える（`src/lib/rate_limit.ts`）
- 入力フォームは React の Island（`SecretGateForm.tsx`、`client:load`）。結果を JSON で受け取り、解錠できたらページを読み込み直す。正規でない表記の URL（`/blog/%74est` など）で開いているときは、Cookie の path と一致せず Cookie が送られないので、読み込み直す代わりに正規の URL へ移る。JS が動く前に送信された場合は通常のフォーム送信として受け、303 で記事へ戻す
- 別オリジンからのフォーム送信は、Astro の既定の確認（`security.checkOrigin`）で 403 になる
- 記事本体のレスポンスは `private, no-store`（解錠する前の表示も含む）。メタ情報には本文とサムネイルを出さず、`noindex` にする（解錠の状態にかかわらず）。一覧には従来どおり出さない
- 署名の鍵を読めないときは解錠できない（500）。既定の鍵に置き換えるのは開発サーバー（`astro dev`）だけ
- 解錠の Cookie があるのに確かめられないとき（`secret_code` の取得や、署名の鍵の読み取りの失敗）は、ゲートを出さずに 500 にする。未解錠として扱うと、解錠済みの閲覧者に閲覧コードの再入力を求めてしまうため
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
- イラスト drawer（M4）: リンク先は現行と同じ `/illust/detail/{id}`。Island がクリックを横取りして drawer を開く。直接開いた場合は、現行サイトと同じく、一覧（1 ページ目）の上に drawer が開いた状態を最初から描画する
- 戻るで閉じる。閉じる操作は `history.back()` に揃え、履歴に余分なエントリを残さない

記事画像モーダルは M3 で実装した（`src/components/islands/ImageModal.tsx`、Radix Dialog）

- 画像のリンク（`a.x-blog-image`）のクリックを document で受け、`pushState` で URL を変えて開く。履歴の state には画像のアンカー id を入れ、進むボタンで開き直せるようにする
- 閉じる操作（閉じるボタン・Esc・画像の外側のクリック）は `history.back()` を呼び、`popstate` で実際に閉じる。`popstate` が届くまでの間の閉じる操作は無視する（Esc の連打などで履歴を 2 つ戻らないようにする）
- Island は画像のある記事にだけ載せ、`client:idle` で読み込む。読み込み前のクリックや直接開いた場合は、`blog/[article_id]/image/[src].astro` が `/blog/{id}#{base64url}` へ 302 で戻す（`draftKey` は引き継ぐ）
- 自サイトの画像は幅 1920px（2x は 3840px、原本の幅まで）の派生を表示する。引用画像は記事に埋め込まれている data URL をそのまま表示する
- 現行サイトと同じ記事で、モーダル内の画像と閉じるボタンの位置・大きさが一致することを確認した

イラスト drawer は M4 で実装した（`src/components/islands/IllustDrawer.tsx`、vaul。現行サイトと同じライブラリで、スワイプで閉じる操作も同じ）

- 開いているかどうかは URL だけで決める（`/illust/detail/{id}` なら開いている）。`/illust/detail/{id}` へのリンク（一覧のカード、サイドバー、記事のイラストカード）のクリックを document で受け、`pushState` で URL を変えて開く。Island は、イラスト一覧・トップ・サイドバーを持つページ（`BlogLayout`）に `client:idle` で載せる。載っていないページ（about など）からは通常の遷移になる
- drawer の中身は、詳細ページ（`/illust/detail/{id}`）を `fetch` し、その HTML から `[data-illust-detail]` の要素（`src/components/illust/IllustDetail.astro`）を取り出して差し込む。詳細ページはエッジにキャッシュされるので、2 回目以降は速い。同じ HTML を直接開いたときにも使うので、見た目と中身が一致する。取得した中身はページを離れるまで持ち、戻る・進むで開き直すときに使う
- 閉じる操作（閉じるボタン・Esc・外側のクリック・スワイプ）は、このドキュメントで `pushState` した履歴があれば `history.back()`、詳細の URL を直接開いていれば一覧の URL への `pushState`。drawer は別のページとして扱うので、閉じる操作も一覧への遷移として履歴に残し、戻ると詳細が開き直す（JS が動かないときの閉じるボタンが一覧へのリンクであるのと同じ形。現行サイトも直接開いた URL から数回のリダイレクトを経て一覧が履歴に積まれる）。戻るボタンでも閉じ、進むボタンで開き直す。閉じる途中（`popstate` が届くまで）の閉じる操作は無視する（画像モーダルと同じ）
- `pushState` で開いたあとに再読み込みしたページは、直接開いたページとして扱う。`history.state` の印は残るが、その履歴を積んだのは前のドキュメントで、戻る先は一覧とは限らない（記事やトップから開いた場合）。印にはドキュメントごとの値を入れ、自分の印でなければ一覧への `pushState` で閉じる。Chrome では、再読み込みの前に `pushState` で積んだ履歴も新しいドキュメントの履歴として扱われ、戻るとページを描き直さずに URL だけが変わる（リロード前が `/` なら、URL が `/` なのに一覧が表示される）。詳細の URL を直接開いたページが描画できるのは詳細と一覧（背景の 1 ページ目）だけなので、`popstate` でそれ以外の URL になったら `location.reload()` でその URL のページを読み込み直す。画像モーダルの Island と同居するページ（記事）ではこの読み込み直しを行わない（モーダルの履歴を壊すため。詳細の URL を直接開いたページにだけ適用する）
- `history.back()` が別のドキュメントへの遷移になった場合に、進むで bfcache から復元されると `popstate` が届かず閉じる途中の印が残るので、`pageshow`（`persisted`）で戻す（#1366 のレビュー）
- URL の形（`/illust/detail/{id}`）は `src/lib/illust.ts` で決める。詳細の URL を組み立てる側（一覧のカード・サイドバー・記事のイラストカード・共有 URL）と、URL から開いているイラストの ID を読む island の両方がこれを使う。末尾のスラッシュは 4.5 のとおり Worker が外すので、island は正規形にだけ一致させる
- 詳細の URL を直接開いたとき（共有されたリンク、再読み込み、JS が動かない場合）は、`pages/illust/detail/[id].astro` が一覧の 1 ページ目を背景にして、詳細を固定の枠（drawer と同じ見た目）で描画する。中身は Island の children として渡し、hydration 後に同じ中身を drawer に移す。このときだけ開くアニメーションを付けない。閉じると URL は `/illust` になり、背景の一覧がそのまま残る。JS が動かないときは、閉じるボタンが一覧へのリンクとして働く
- 最初の表示のアニメーションの抑止は、vaul の `defaultOpen` ではなく、`Drawer.Overlay` と `Drawer.Content` に渡す `data-vaul-animate` 属性（vaul の CSS で `animation: none`）を Island が自分で決めて行う。`defaultOpen` は同じ属性で止めるが、再有効化が ref の書き換えだけで DOM の属性は次の再描画まで変わらず、最初の pointerdown（vaul の `isDragging` の更新）の再描画で属性が `true` になった瞬間に、止めていた開くアニメーションが走る（drawer が閉じ位置へ飛んでから開き直し、続けて本来の閉じるアニメーションが走るので「閉じる→開く→閉じる」に見える。vaul 1.1.2）。属性は、このドキュメントで一度閉じるまで `false`、それ以降は `true`
- 閉じるアニメーションの間も、drawer の中身は直前のイラストを出し続ける（URL が一覧に戻った時点で中身を切り替えると、スライドアウト中に中身が消える）
- `document.title` は、開いたときに詳細の title（`[data-illust-detail]` の `data-title`）、閉じたときに元の title（直接開いたページでは一覧の title）にする
- 現行の `/illust?illust_id={id}` から `/illust/detail/{id}` へのリダイレクトは作らない。Next.js のパラレルルートの都合で内部的に使っていた URL で、外部に共有されている可能性は低い（#1344 のコメント）
- 現行サイトと同じイラストで、一覧のカードと drawer の中身（画像・ボタン・題名・公開日・タグ・説明）の位置・大きさが一致することを確認した

