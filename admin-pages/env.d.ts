/// <reference path="../sns-article-publisher/types.d.ts" />

interface CloudflareEnv {
  // 内製CMSのD1データベース（maretol-cms）
  DB: D1Database
  // pages の KV キャッシュ（保存時にパージする）
  CMS_CACHE: KVNamespace
  // KVプレビュー（draftKey互換）のドラフト保存先
  CMS_DRAFT: KVNamespace
  // SNS自動投稿Worker（sns-article-publisher）への Service Binding（RPC呼び出し）
  SNS_PUBLISHER: Service<SNSArticlePublisher>
  // pages 本体のホスト（プレビューURL生成用）
  PAGES_HOST: string
  // SNS自動投稿の通知を送るか（'true' で有効。本番のみ）
  SNS_NOTIFY_ENABLED?: string
  ENV: string
}
