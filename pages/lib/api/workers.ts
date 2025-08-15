import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  bandeDessineeResult,
  categoryAPIResult,
  contentsAPIResult,
  staticAPIResult,
  infoAPIResult,
  OGPResult,
  atelierResult,
} from 'api-types'
import { getLocalEnv, getNodeEnv } from '../env'
import {
  generateBandeDessineeContentKey,
  generateBandeDessineeKey,
  generateContentKey,
  generateContentsKey,
  generateContentsWithTagsKey,
  generateStaticDataKey,
  generateInfoKey,
  generateTagsKey,
  generateAtelierKey,
  generateAtelierContentKey,
} from 'cms-cache-key-gen'
import { cache } from 'react'

// const revalidateTime = 0 // 無効にする。どうやらnext.jsのバグを踏んでいるっぽい
const dev = getNodeEnv() === 'development'

const DAY = 60 * 60 * 24
// const HOUR = 60 * 60

const CacheTTL = {
  ogpData: 3 * DAY, // OGPデータの保持
  contents: 15 * DAY, // トップページなどのブログコンテンツリスト
  content: 10 * DAY, // 特定のブログコンテンツ
  contentsWithTags: 10 * DAY, // タグ指定のブログコンテンツリスト
  tags: 30 * DAY, // タグリスト
  info: 30 * DAY, // 特定ページ（静的ページ）の情報。変更が少ないためキャッシュ長め
  static: 30 * DAY, // サイドバーのデフォルト情報。変更が少ないためキャッシュ長め
  bandeDessinee: 30 * DAY, // マンガリスト。変更が少ないためキャッシュ長め
  bandeDessineeByID: 30 * DAY, // マンガの詳細情報。更新少なめなのでキャッシュ長め
  atelier: 30 * DAY, // イラストリスト
  atelierByID: 30 * DAY, // イラストの詳細情報
}

// ジェネリックAPI関数の設定型
interface CacheConfig {
  cacheKey: string
  cacheTTL: number
  cacheStore: KVNamespace
  skipCache?: boolean
}

interface APIConfig<TResult> extends CacheConfig {
  fetcher: () => Promise<TResult>
  defaultResult: TResult
}

// キャッシュ付きAPI関数（環境非依存）
async function createCachedAPIFunction<TResult>(config: APIConfig<TResult>): Promise<TResult> {
  // キャッシュの確認（skipCacheがfalseの場合のみ）
  if (!config.skipCache) {
    const cache = await config.cacheStore.get(config.cacheKey)
    if (cache) {
      const data = JSON.parse(cache) as TResult
      return data
    }
  }

  // データ取得（環境に依存しない）
  try {
    const res = await config.fetcher()

    // キャッシュの保存（skipCacheがfalseの場合のみ）
    if (!config.skipCache) {
      const expirationTtl = dev ? 60 : config.cacheTTL
      await config.cacheStore.put(config.cacheKey, JSON.stringify(res), { expirationTtl })
    }

    return res as TResult
  } catch (e) {
    console.error('API call error:', e)
    return config.defaultResult
  }
}

// ローカル環境用のfetcher生成関数
async function createLocalFetcher<TResult>(
  path: string,
  query?: Record<string, string>,
  defaultResult?: TResult
): Promise<TResult> {
  const request = await cmsFetcher(path, query)
  const res = await fetch(request, { cache: 'no-store' })
  if (!res.ok) {
    return defaultResult || ({} as TResult)
  }
  const data = (await res.json()) as TResult
  if (!data) {
    return defaultResult || ({} as TResult)
  }
  return data
}

const getOGPData = cache(getOGPDataOrigin)
const getCMSContents = cache(getCMSContentsOrigin)
const getCMSContent = cache(getCMSContentOrigin)
const getCMSContentsWithTags = cache(getCMSContentsWithTagsOrigin)
const getTags = cache(getTagsOrigin)
const getInfo = cache(getInfoOrigin)
const getStatic = cache(getStaticOrigin)
const getBandeDessinee = cache(getBandeDessineeOrigin)
const getBandeDessineeByID = cache(getBandeDessineeByIDOrigin)
const getAteliers = cache(getAteliersOrigin)
const getAtelierByID = cache(getAtelierByIDOrigin)

// OGPデータの取得
async function getOGPDataOrigin(targetURL: string) {
  const { env } = await getCloudflareContext({ async: true })

  // OGPデータは特殊な処理が必要なため、カスタム実装
  const cache = await env.OGP_FETCHER_CACHE.get(targetURL)
  if (cache) {
    const data = JSON.parse(cache) as OGPResult
    return data
  }

  if (getLocalEnv() === 'local') {
    const host = env.OGP_DEV
    const url = new URL(host)
    url.searchParams.set('target', targetURL)

    const ogpAPIKey = env.OGP_FETCHER_API_KEY
    const request = new Request(url, { headers: { 'x-api-key': ogpAPIKey }, method: 'GET' })

    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return { success: false } as OGPResult
    }

    const data = (await res.json()) as OGPResult
    if (!data.success) {
      return data
    }

    await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(data), { expirationTtl: 60 })
    return data
  }

  try {
    const res = await env.OGP_RPC.fetchOGPData(targetURL)
    const expirationTtl = dev ? 60 : CacheTTL.ogpData
    await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(res), { expirationTtl })
    return res as OGPResult
  } catch (e) {
    console.error(e)
    return { success: false } as OGPResult
  }
}

// ブログの更新リストの取得
async function getCMSContentsOrigin(offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const defaultResult = { contents: [], total: 0 }

  return createCachedAPIFunction<{ contents: contentsAPIResult[]; total: number }>({
    cacheKey: generateContentsKey(offsetStr, limitStr),
    cacheTTL: CacheTTL.contents,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/get_contents', { offset: offsetStr, limit: limitStr }, defaultResult)
      : () => env.CMS_RPC.fetchContents(offsetStr, limitStr),
    defaultResult,
  })
}

// 特定のブログコンテンツの取得
async function getCMSContentOrigin(articleID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const query: Record<string, string> =
    draftKey !== undefined ? { article_id: articleID, draftKey } : { article_id: articleID }
  const defaultResult = {} as contentsAPIResult

  return createCachedAPIFunction<contentsAPIResult>({
    cacheKey: generateContentKey(articleID),
    cacheTTL: CacheTTL.content,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/get_content', query, defaultResult)
      : () => env.CMS_RPC.fetchContent(articleID, draftKey || null),
    defaultResult,
    skipCache: !!draftKey, // draftKeyがある場合はキャッシュをスキップ
  })
}

// タグを指定してコンテンツを取得
async function getCMSContentsWithTagsOrigin(tagIDs: string[], offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const defaultResult = { contents: [], total: 0 }

  return createCachedAPIFunction<{ contents: contentsAPIResult[]; total: number }>({
    cacheKey: generateContentsWithTagsKey(tagIDs, offsetStr, limitStr),
    cacheTTL: CacheTTL.contentsWithTags,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () =>
          createLocalFetcher(
            '/api/cms/get_contents_with_tags',
            { tag_id: tagIDs.join('+'), offset: offsetStr, limit: limitStr },
            defaultResult
          )
      : () => env.CMS_RPC.fetchContentsByTag(tagIDs, offsetStr, limitStr),
    defaultResult,
  })
}

// タグの一覧取得
async function getTagsOrigin() {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'

  return createCachedAPIFunction<categoryAPIResult[]>({
    cacheKey: generateTagsKey(),
    cacheTTL: CacheTTL.tags,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher<categoryAPIResult[]>('/api/cms/get_tags', undefined, [])
      : () => env.CMS_RPC.fetchTags(),
    defaultResult: [],
  })
}

// 特定のページの詳細情報取得
async function getInfoOrigin() {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'

  return createCachedAPIFunction<infoAPIResult[]>({
    cacheKey: generateInfoKey(),
    cacheTTL: CacheTTL.info,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher<infoAPIResult[]>('/api/cms/get_info', undefined, [])
      : () => env.CMS_RPC.fetchInfo(),
    defaultResult: [],
  })
}

async function getStaticOrigin() {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'

  return createCachedAPIFunction<staticAPIResult>({
    cacheKey: generateStaticDataKey(),
    cacheTTL: CacheTTL.static,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher<staticAPIResult>('/api/cms/get_static', undefined, {} as staticAPIResult)
      : () => env.CMS_RPC.fetchStatic(),
    defaultResult: {} as staticAPIResult,
  })
}

// マンガのリスト取徖
async function getBandeDessineeOrigin(offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const query = { offset: offsetStr, limit: limitStr }

  return createCachedAPIFunction<{ bandeDessinees: bandeDessineeResult[]; total: number }>({
    cacheKey: generateBandeDessineeKey(offsetStr, limitStr),
    cacheTTL: CacheTTL.bandeDessinee,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/bande_dessinees', query, { bandeDessinees: [], total: 0 })
      : () => env.CMS_RPC.fetchBandeDessinees(offsetStr, limitStr),
    defaultResult: { bandeDessinees: [], total: 0 },
  })
}

// 単一のマンガ情報取得
async function getBandeDessineeByIDOrigin(contentID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'

  const query: Record<string, string> =
    draftKey !== undefined ? { content_id: contentID, draftKey } : { content_id: contentID }

  return createCachedAPIFunction<bandeDessineeResult>({
    cacheKey: generateBandeDessineeContentKey(contentID),
    cacheTTL: CacheTTL.bandeDessineeByID,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher<bandeDessineeResult>('/api/cms/bande_dessinee', query, {} as bandeDessineeResult)
      : () => env.CMS_RPC.fetchBandeDessinee(contentID, draftKey || null),
    defaultResult: {} as bandeDessineeResult,
    skipCache: !!draftKey,
  })
}

async function getAteliersOrigin(offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const query = { offset: offsetStr, limit: limitStr }

  return createCachedAPIFunction<{ ateliers: atelierResult[]; total: number }>({
    cacheKey: generateAtelierKey(offsetStr, limitStr),
    cacheTTL: CacheTTL.atelier,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/ateliers', query, { ateliers: [], total: 0 })
      : () => env.CMS_RPC.fetchAteliers(offsetStr, limitStr),
    defaultResult: { ateliers: [], total: 0 },
  })
}

async function getAtelierByIDOrigin(contentID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'

  const query: Record<string, string> =
    draftKey !== undefined ? { content_id: contentID, draftKey } : { content_id: contentID }

  return createCachedAPIFunction<atelierResult>({
    cacheKey: generateAtelierContentKey(contentID),
    cacheTTL: CacheTTL.atelierByID,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher<atelierResult>('/api/cms/atelier', query, {} as atelierResult)
      : () => env.CMS_RPC.fetchAtelier(contentID, draftKey || null),
    defaultResult: {} as atelierResult,
    skipCache: !!draftKey,
  })
}

async function cmsFetcher(path: string, query?: Record<string, string>) {
  const { env } = await getCloudflareContext({ async: true })
  const host = env.CMS_DEV
  const url = new URL(host + path)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  const cmsAPIKey = env.CMS_FETCHER_API_KEY
  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })
  return request
}

export {
  getOGPData,
  getCMSContents,
  getCMSContent,
  getCMSContentsWithTags,
  getTags,
  getInfo,
  getStatic,
  getBandeDessinee,
  getBandeDessineeByID,
  getAteliers,
  getAtelierByID,
}
