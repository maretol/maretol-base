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
const KV_CACHE_ENABLED = true

function isKVCacheEnabled() {
  return KV_CACHE_ENABLED
}

// CMSコンテンツのKVキャッシュ(CMS_CACHE)の有効判定。
// stg環境はprdとCMS_CACHEのKV namespaceを共有しているため、stgのCMS(cms-data-fetcher-stg)の
// データがprdのキャッシュに混入しないよう、stgではCMSキャッシュを無効にする。
function isCMSCacheEnabled() {
  if (['stg', 'STG', 'staging'].includes(getEnv() || '')) {
    return false
  }
  return isKVCacheEnabled()
}

async function getSecretArticleCookieKey(env: CloudflareEnv): Promise<string> {
  try {
    const key = await env.SECRET_ARTICLE_COOKIE_KEY.get()
    if (key) {
      return key
    }
    // get() が null/空を返すケースも下のフォールバック判定に流す（例外時と挙動を揃える）
  } catch (e) {
    // binding 未設定などで get() が例外を投げるケースも同様に扱う
  }
  // 鍵が未設定/空のとき: ローカル環境のみ既定値を許容し、それ以外はエラーにする。
  // 推測可能な固定鍵で解錠Cookieを偽造されるのを防ぐため、preview等でも未設定はエラー。
  if (getLocalEnv() === 'local') {
    return 'test_dev_key'
  }
  throw new Error('SECRET_ARTICLE_COOKIE_KEY is not set')
}

export { getHostname, getLocalEnv, getNodeEnv, getEnv, isKVCacheEnabled, isCMSCacheEnabled, getSecretArticleCookieKey }
