# maretol-base

[個人サイト](https://www.maretol.xyz)のコード

もとは別プロジェクトだったが、ファイル整理が必要だった＋いくつかEdge Workersを追加したのでそれらをまとめたモノレポにするため作り直した

## deploy

基本はGithub Actionsに全部任せる

設定は wrangler.toml に記述してそれに全任する

## secrets

シークレットは wrangler コマンドで登録する

登録後はコンソール画面からは見えない（暗号化されている）

登録方法は

```
$ wrangler secret put <KEY> --env ENV
```

Secrets自体は外には出さないので、ローカルに .secrets で保管している
