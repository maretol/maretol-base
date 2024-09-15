# maretol-base

[個人サイト](https://www.maretol.xyz)のコード

もとは別プロジェクトだったが、ファイル整理が必要だった＋いくつか Edge Workers を追加したのでそれらをまとめたモノレポにするため作り直した

## deploy

基本は Github Actions に全部任せる

設定は wrangler.toml に記述してそれに全任する

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

### pages

前提として pages はバックエンドの処理として workers の処理を必要としている。

将来的には local 起動時だけパッケージとして読み込めるようにしたいところだが、とりあえず現状は上記の workers の dev 起動をしておく必要がある

page 自体には 2 種類の dev 起動がある。一つは next dev の起動で、これが `npm run next-dev:page` に当てられている

シンプルな動作確認はこちらを利用する

もう一つが `npm run dev:page` に当てられている方で、これはビルド後に wrangler の local 起動を行うもの

wrangler の動作確認で利用する。
