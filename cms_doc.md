# CMS に追加した独自文法の説明

基本的に CMS の機能は全部対応しているが、一部の処理は CMS になかったり、別途表示させたい表現のために独自文法を採用している

それらを忘れないためのメモ

## 画像

画像周りは CMS 管理ではなく、Cloudflare のストレージにアップロードし、公開 URL を文中に配置する処理になっている

@@ で追加要素を入力できるようになっている。追加要素は key::value の記述

CMS のテキスト中のリンク機能はオフにするのを推奨（多分大丈夫だけど試してない

```
https://example.com/image-name.png@@key1::value1@@key2::value2
```

ただし、画像 URL はこちらの指定したドメイン始まりで外部の画像は引用できない（どっちみち CORS の関係で無理）。また、URL の最後が画像の拡張子である必要がある（jpg, jpeg, png, gif）

key::value は key の種類ごとに表示が変わる。現状対応しているのは title, caption

## リンク

URL を単行で挿入すると、自動的にリンクとしてリンクカードに置き換えられる。リンクカードは OGP 情報を取得するほか、なかった場合も適当な情報が記入される

現在 OGP は UTF-8 以外対応できてないが、そのうち対応予定

### ブログ内部リンク

URL がブログのページの一部だった場合（URL パターンで判定）、内部用のリンクボタンになる。専用デザインが採用されている

### コンテンツリンク

Youtube の URL と Twitter の URL だけは iframe で囲った独自のコンテンツ表示になる（動画埋め込みやツイート埋込）

今後対応コンテンツは増やす予定

## blockquote(引用)

引用符は対応しているが、CMS は引用元の情報を設定できないためそれに対応した独自文法が採用されている

引用符の最終行に `cite::` 書き、そこに URL と引用元のタイトルを記述する。記法は以下の 3 パターン

```
cite::[タイトル](https://example.com)
```

```
cite::https://example.com
```

```
cite::書籍名など
```

上 2 つの場合は自動的にリンクになる。最後のものはリンクにならない

## 見出し要素

h1 を記事タイトルに使用している都合、CMS の h1 はブログ内では h2 になっている。他も同様に一つずれる

## コマンド

単行で行のはじめに `/` から始まる場合そこをコマンドとして扱う。コマンドは行末までで取得されるので偶然の一致に注意する

実装されていないコマンドを入力した場合はその行は何も表示されない

現状対応しているコマンドは以下の通り

- `/table_of_contents` : 目次。目次となる対象は見出しコンテンツ（つまり h1~h5）で、かつ `<span class="index">` の指定が必要。こちらの指定は CMS の機能で付与する
