import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  bandeDessineeResult,
  categoryAPIResult,
  contentsAPIResult,
  adjacentContentsResult,
  staticAPIResult,
  infoAPIResult,
  OGPResult,
  atelierResult,
} from 'api-types'
import { getLocalEnv, getNodeEnv, isKVCacheEnabled } from '../env'
import {
  generateAdjacentContentsKey,
  generateBandeDessineeContentKey,
  generateBandeDessineeKey,
  generateBandeDessineeBySeriesKey,
  generateContentKey,
  generateSecretMetaKey,
  generateContentsKey,
  generateContentsWithTagsKey,
  generateStaticDataKey,
  generateInfoKey,
  generateTagsKey,
  generateAtelierKey,
  generateAtelierContentKey,
  generateContentsTotalKey,
  generateContentsWithTagsTotalKey,
  generateBandeDessineeTotalKey,
  generateAtelierTotalKey,
} from 'cms-cache-key-gen'
import { cache } from 'react'
import { getTotalPage } from '../pagenation'
import { DAY, HOUR } from '../static'

// const revalidateTime = 0 // 無効にする。どうやらnext.jsのバグを踏んでいるっぽい
const dev = getNodeEnv() === 'development'

const CacheTTL = {
  ogpData: 3 * DAY, // OGPデータの保持
  contents: 15 * DAY, // トップページなどのブログコンテンツリスト
  content: 10 * DAY, // 特定のブログコンテンツ
  adjacentContents: 1 * HOUR, // 前後記事ナビ。新記事公開で「一つあとの記事」が変わるため記事本体と別キーで短め
  secretMeta: 0, // 限定公開記事のコード照合メタ。secret_codeを含むため常にskipCache（保持しない）
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

// 一覧の総件数による範囲判定の設定（issue #1291）
interface ListTotalConfig {
  totalKey: string
  offset: number
  limit: number
}

interface APIConfig<TResult> extends CacheConfig {
  fetcher: () => Promise<TResult>
  defaultResult: TResult
  shouldCache?: (result: TResult) => boolean
  // 一覧の取得で指定する。2ページ目以降は、KV に持つ総件数で範囲外と分かれば fetcher を呼ばない
  listTotal?: TResult extends { total: number } ? ListTotalConfig : never
}

// キャッシュ付きAPI関数（環境非依存）
async function createCachedAPIFunction<TResult>(config: APIConfig<TResult>): Promise<TResult> {
  // キャッシュの確認（skipCacheがfalseの場合のみ）
  if (isKVCacheEnabled() && !config.skipCache) {
    const cache = await config.cacheStore.get(config.cacheKey)
    if (cache) {
      const data = JSON.parse(cache) as TResult
      return data
    }
  }

  // 一覧の2ページ目以降は、D1 へ問い合わせる前に KV の総件数で範囲を判定する（issue #1291）
  // 0件の結果はキャッシュしないので、この判定がないと範囲外のリクエストが毎回 D1 まで届く
  // 一覧のキャッシュに当たったリクエストは範囲内と分かっているので、ここまで来ない。総件数を読むのはキャッシュミスのときだけ
  const listTotal: ListTotalConfig | undefined = config.listTotal
  const pageNumber = listTotal ? Math.floor(listTotal.offset / listTotal.limit) + 1 : 1
  let cachedTotal: number | undefined
  if (listTotal && pageNumber > 1) {
    cachedTotal = await getCachedListTotal(config.cacheStore, listTotal.totalKey)
    // KV の総件数は、パージと書き込みが競合すると古い値のまま残ることがある
    // 記事が増えて新しくできる「最終ページの次」まで範囲外にしないよう、そのページだけは D1 で確かめる。値が古ければ下の保存で直る
    if (cachedTotal !== undefined && pageNumber > getTotalPage(cachedTotal, listTotal.limit) + 1) {
      return { ...config.defaultResult, total: cachedTotal }
    }
  }

  // データ取得（環境に依存しない）
  try {
    const res = await config.fetcher()

    // shouldCacheコールバックでキャッシュ保存を判定
    const shouldSaveCache = config.shouldCache ? config.shouldCache(res) : true

    // キャッシュの保存（skipCacheがfalseかつshouldSaveCacheがtrueの場合のみ）
    if (isKVCacheEnabled() && !config.skipCache && shouldSaveCache) {
      const expirationTtl = dev ? 60 : config.cacheTTL
      try {
        await config.cacheStore.put(config.cacheKey, JSON.stringify(res), { expirationTtl })
      } catch (e) {
        // キャッシュ保存に失敗した場合でもAPIの結果は返すためのラッパー
        console.error(`[lib/api/workers.ts] Cache put error for key ${config.cacheKey}:`, e)
      }
    }

    // 取得に失敗すると total は既定値の 0 になる。それを保存すると全ページが範囲外になるので、1件以上のときだけ保存する
    if (listTotal && pageNumber > 1) {
      const total = (res as { total: number }).total
      if (total > 0 && total !== cachedTotal) {
        await saveListTotal(config.cacheStore, listTotal.totalKey, total)
      }
    }

    return res as TResult
  } catch (e) {
    console.error('[lib/api/workers.ts] API call error:', e)
    return config.defaultResult
  }
}

// 一覧の総件数だけを持つ KV エントリの読み書き（issue #1291）。createCachedAPIFunction の listTotal から使う
// キーは一覧と同じ prefix なので、記事の保存時のパージで一緒に消える。TTL はパージを通らない変更（D1 の直接編集など）への保険
const LIST_TOTAL_TTL = 1 * HOUR

async function getCachedListTotal(cacheStore: KVNamespace, totalKey: string): Promise<number | undefined> {
  if (!isKVCacheEnabled()) return undefined
  try {
    const cache = await cacheStore.get(totalKey)
    const total = cache === null ? NaN : Number(cache)
    return Number.isInteger(total) && total > 0 ? total : undefined
  } catch (e) {
    console.error(`[lib/api/workers.ts] Cache get error for key ${totalKey}:`, e)
    return undefined
  }
}

// 書き込みの完了はレスポンスに必要ないので、waitUntil に渡して待たない
async function saveListTotal(cacheStore: KVNamespace, totalKey: string, total: number): Promise<void> {
  if (!isKVCacheEnabled()) return
  try {
    const { ctx } = await getCloudflareContext({ async: true })
    ctx.waitUntil(
      cacheStore.put(totalKey, total.toString(), { expirationTtl: dev ? 60 : LIST_TOTAL_TTL }).catch((e) => {
        console.error(`[lib/api/workers.ts] Cache put error for key ${totalKey}:`, e)
      }),
    )
  } catch (e) {
    console.error(`[lib/api/workers.ts] Cache put error for key ${totalKey}:`, e)
  }
}

// ローカル環境用のfetcher生成関数
async function createLocalFetcher<TResult>(
  path: string,
  query?: Record<string, string>,
  defaultResult?: TResult,
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
const getAdjacentContents = cache(getAdjacentContentsOrigin)
const getSecretMeta = cache(getSecretMetaOrigin)
const getCMSContentsWithTags = cache(getCMSContentsWithTagsOrigin)
const getTags = cache(getTagsOrigin)
const getInfo = cache(getInfoOrigin)
const getStatic = cache(getStaticOrigin)
const getBandeDessinee = cache(getBandeDessineeOrigin)
const getBandeDessineeByID = cache(getBandeDessineeByIDOrigin)
const getAteliers = cache(getAteliersOrigin)
const getAtelierByID = cache(getAtelierByIDOrigin)
// generateMetadata とページ本体の両方から呼ばれても、KV の読み書きは1リクエストに1回で済ませる

// OGPデータの取得
async function getOGPDataOrigin(targetURL: string) {
  const { env } = await getCloudflareContext({ async: true })

  // OGPデータは特殊な処理が必要なため、カスタム実装
  if (isKVCacheEnabled()) {
    const cache = await env.OGP_FETCHER_CACHE.get(targetURL)
    if (cache) {
      const data = JSON.parse(cache) as OGPResult
      return data
    }
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

    if (isKVCacheEnabled()) {
      try {
        await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(data), { expirationTtl: 60 })
      } catch (e) {
        // キャッシュ保存に失敗した場合でもAPIの結果は返すためのラッパー
        console.error(`[lib/api/workers.ts] Cache put error for key ${targetURL}:`, e)
      }
    }
    return data
  }

  try {
    const res = await env.OGP_RPC.fetchOGPData(targetURL)
    if (isKVCacheEnabled()) {
      const expirationTtl = dev ? 60 : CacheTTL.ogpData
      try {
        await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(res), { expirationTtl })
      } catch (e) {
        // キャッシュ保存に失敗した場合でもAPIの結果は返すためのラッパー
        console.error(`[lib/api/workers.ts] Cache put error for key ${targetURL}:`, e)
      }
    }
    return res as OGPResult
  } catch (e) {
    console.error('[lib/api/workers.ts] OGP fetch error:', e)
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
    // 範囲外ページによる空結果のキーがKVに溜まらないよう、結果ありのときだけ保存する
    shouldCache: (res) => res.contents.length > 0,
    listTotal: { totalKey: generateContentsTotalKey(), offset: offset ?? 0, limit: limit ?? 10 },
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
    // 限定公開記事は本文を KV に残さないようキャッシュ保存しない
    shouldCache: (res) => res?.is_secret !== true,
  })
}

// 前後記事（一つ前・一つあと）ナビの取得
async function getAdjacentContentsOrigin(articleID: string) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const defaultResult: adjacentContentsResult = { prev: null, next: null }

  return createCachedAPIFunction<adjacentContentsResult>({
    cacheKey: generateAdjacentContentsKey(articleID),
    cacheTTL: CacheTTL.adjacentContents,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/get_adjacent_contents', { article_id: articleID }, defaultResult)
      : () => env.CMS_RPC.fetchAdjacentContents(articleID),
    defaultResult,
  })
}

// 限定公開記事のコード照合用メタ（is_secret / secret_code）の取得
// secret_code を含むため skipCache で常にキャッシュせず、サーバ側の照合処理でのみ利用する
// 下書きプレビュー時は draftKey を渡さないと未公開の記事メタが取得できない
async function getSecretMetaOrigin(articleID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const defaultResult: { is_secret: boolean; secret_code: string | null } = { is_secret: false, secret_code: null }
  const query: Record<string, string> =
    draftKey !== undefined ? { article_id: articleID, draftKey } : { article_id: articleID }

  return createCachedAPIFunction<{ is_secret: boolean; secret_code: string | null }>({
    cacheKey: generateSecretMetaKey(articleID),
    cacheTTL: CacheTTL.secretMeta,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/get_secret_meta', query, defaultResult)
      : () => env.CMS_RPC.fetchSecretMeta(articleID, draftKey || null),
    defaultResult,
    skipCache: true, // secret_code を KV に保存しないため常にキャッシュをスキップする
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
            defaultResult,
          )
      : () => env.CMS_RPC.fetchContentsByTag(tagIDs, offsetStr, limitStr),
    defaultResult,
    skipCache: true,
    listTotal: { totalKey: generateContentsWithTagsTotalKey(tagIDs), offset: offset ?? 0, limit: limit ?? 10 },
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

// マンガのリスト取得。seriesID 指定時はそのシリーズのマンガのみ取得する
async function getBandeDessineeOrigin(offset?: number, limit?: number, seriesID?: string) {
  const { env } = await getCloudflareContext({ async: true })
  const isLocal = getLocalEnv() === 'local'
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const query: Record<string, string> =
    seriesID !== undefined
      ? { offset: offsetStr, limit: limitStr, series_id: seriesID }
      : { offset: offsetStr, limit: limitStr }
  const defaultResult = { bandeDessinees: [], total: 0 }

  return createCachedAPIFunction<{ bandeDessinees: bandeDessineeResult[]; total: number }>({
    cacheKey:
      seriesID !== undefined
        ? generateBandeDessineeBySeriesKey(seriesID, offsetStr, limitStr)
        : generateBandeDessineeKey(offsetStr, limitStr),
    cacheTTL: CacheTTL.bandeDessinee,
    cacheStore: env.CMS_CACHE,
    fetcher: isLocal
      ? () => createLocalFetcher('/api/cms/bande_dessinees', query, defaultResult)
      : () => env.CMS_RPC.fetchBandeDessinees(offsetStr, limitStr, seriesID ?? null),
    defaultResult,
    // 存在しないシリーズIDや範囲外ページによる空結果のキーがKVに溜まらないよう、結果ありのときだけ保存する
    shouldCache: (res) => res.bandeDessinees.length > 0,
    listTotal: { totalKey: generateBandeDessineeTotalKey(seriesID), offset: offset ?? 0, limit: limit ?? 10 },
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
    // 範囲外ページによる空結果のキーがKVに溜まらないよう、結果ありのときだけ保存する
    shouldCache: (res) => res.ateliers.length > 0,
    listTotal: { totalKey: generateAtelierTotalKey(), offset: offset ?? 0, limit: limit ?? 10 },
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
  getAdjacentContents,
  getSecretMeta,
  getCMSContentsWithTags,
  getTags,
  getInfo,
  getStatic,
  getBandeDessinee,
  getBandeDessineeByID,
  getAteliers,
  getAtelierByID,
}
