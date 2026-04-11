function getHostname() {
  return process.env.HOST || 'https://www.maretol.com/'
}

function getLocalEnv() {
  if (['prd', 'PRD', 'production'].includes(getEnv() || '')) {
    return ''
  }

  if (getNodeEnv() === 'development') {
    // local起動は指定して local を返す
    return 'local'
  }
  return process.env.LOCAL || ''
}

function getNodeEnv() {
  return process.env.NODE_ENV || 'development'
}

function getEnv() {
  return process.env.ENV
}

// [一時対応] KVキャッシュ(CMS_CACHE / OGP_FETCHER_CACHE / IMAGE_CACHE)のリクエスト数が異常に多いため、
// 原因特定までKVキャッシュを全面的に無効化するための一括スイッチ。
// 復旧時はこの定数を true に戻すだけでよい(他の変更は不要)。
// 関連: PR #944, commit 46d1682
const KV_CACHE_ENABLED = false

function isKVCacheEnabled() {
  return KV_CACHE_ENABLED
}

export { getHostname, getLocalEnv, getNodeEnv, getEnv, isKVCacheEnabled }
