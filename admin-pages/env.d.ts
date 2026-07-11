interface CloudflareEnv {
  // 内製CMSのD1データベース（maretol-cms）
  DB: D1Database
  // pages の KV キャッシュ（保存時にパージする）
  CMS_CACHE: KVNamespace
  // KVプレビュー（draftKey互換）のドラフト保存先
  CMS_DRAFT: KVNamespace
  // pages 本体のホスト（プレビューURL生成用）
  PAGES_HOST: string
  ENV: string
}
