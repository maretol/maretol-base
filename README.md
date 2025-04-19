# maretol-base

[個人サイト](https://www.maretol.xyz)のコード

もとは別プロジェクトだったが、ファイル整理が必要だった＋いくつか Edge Workers を追加したのでそれらをまとめたモノレポにするため作り直した

## deploy

基本は Github Actions に全部任せる

設定は wrangler.toml に記述してそれに全任する

### staging

development ブランチが自動で staging 環境としてデプロイされる

Workers は `[worker-name]-stg` という名称で、Pages は標準の Pages のプレビュー機能でデプロイされる

それぞれの連携は wrangler.toml に定義されている

## secrets

シークレットは wrangler コマンドで登録する

登録後はコンソール画面からは見えない（暗号化されている）

登録方法は

```
$ wrangler secret put <KEY> --env ENV
```

Secrets 自体は外には出さないので、ローカルに .secrets で保管している

また、pages の方ではコンソールからしか登録できないようなのでそっちでやる

## development

### workers

OGP Fetcher や CMS Fetcher はシンプルに `npm run dev:ogp` や `npm run dev:cms` で起動させる

ポートはそれぞれ違うのでそれぞれの wrangler.toml ファイルを参照

ローカルでの動作確認時は、x-api-key ヘッダーを指定する必要があるので両方それを行うこと

OGP Fetcher は取得データを Cloudflare KV にキャッシュするようになっている。キャッシュ期間は 3 日（72 時間）

ローカル起動時はローカルに .wrangler でキャッシュされるので削除時はそのファイルを消す

### pages

~~前提として pages はバックエンドの処理として workers の処理を必要としている。~~

~~将来的には local 起動時だけパッケージとして読み込めるようにしたいところだが、とりあえず現状は上記の workers の dev 起動をしておく必要がある~~

2 つの worker はローカル起動時はパッケージとして読み込むことで処理できるようになった（ただしそのかわり、env に CMS の API キーが必要になったのでローカルの `dev.vars` にはそれを書き足した。

ビルド時はパッケージサイズの都合、含まれるとオーバーする可能性が高いので `next.config.mjs` の webpack 設定の external にそれぞれの worker のパッケージを取り除くように記載している

ローカル開発時は単純に next-dev:page/dev:page のどっちかを起動させれば問題ない

page 自体には 2 種類の dev 起動がある。一つは next dev の起動で、これが `npm run next-dev:page` に当てられている

シンプルな動作確認はこちらを利用する

もう一つが `npm run dev:page` に当てられている方で、これはビルド後に wrangler の local 起動を行うもの

wrangler の動作確認で利用する。

~~どちらも環境変数に対しては @cloudflare/next-on-pages の getRequestContext() が呼び出す env から取り出すことを想定している。この処理によって取り出される env は .dev.vars ファイルと wrangler.toml ファイルを起動時に読んでいる様子なので、 next dev の起動でもこちらの env 設定が利用される~~

next-on-pages から openNext に移行したので env の呼び出しも @opennextjs/cloudflare の getCloudflareContext になった。処理によって呼び出される env が .dev.vars や wrangler.toml の内容を読んでいるのは同じ（と思う。まだ未確認）

### packages

API 関係の型定義ファイルを別パッケージに切り出して双方から参照している

ただ API のレスポンスに完全に一致した型を用意できてないのでどっかしらで修正したい

また、上記の通り pages のテスト用に ogp データ取得と cms データ取得処理をパッケージとして読み込めるようにしている
