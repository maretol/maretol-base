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

  // cacheに有無を確認する
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
    // 成功時はcacheに保存する。devのときは60秒（最短）
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

  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'

  const cacheKey = generateContentsKey(offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { contents: contentsAPIResult[]; total: number }
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/get_contents', {
      offset: offsetStr,
      limit: limitStr,
    })
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return { contents: [], total: 0 }
    }
    const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }
    if (!data) {
      return { contents: [], total: 0 }
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as { contents: contentsAPIResult[]; total: number }
  }
  const res = await env.CMS_RPC.fetchContents(offsetStr, limitStr)

  // cacheに保存する
  const expirationTtl = CacheTTL.contents
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

  return res as { contents: contentsAPIResult[]; total: number }
}

// 特定のブログコンテンツの取得
async function getCMSContentOrigin(articleID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })

  const cacheKey = generateContentKey(articleID)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache && !draftKey) {
    // draftKeyがある場合はキャッシュを使わない
    const data = JSON.parse(cache) as contentsAPIResult
    return data
  }

  if (getLocalEnv() === 'local') {
    const query: Record<string, string> =
      draftKey !== undefined ? { article_id: articleID, draftKey } : { article_id: articleID }
    const request = await cmsFetcher('/api/cms/get_content', query)
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return {} as contentsAPIResult
    }
    const data = (await res.json()) as contentsAPIResult
    if (!data) {
      return {} as contentsAPIResult
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as contentsAPIResult
  }

  const res = await env.CMS_RPC.fetchContent(articleID, draftKey || null)

  // draftKeyがある場合はキャッシュを使わないため
  if (draftKey) {
    return res as contentsAPIResult
  }

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.content
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

  return res as contentsAPIResult
}

// タグを指定してコンテンツを取得
async function getCMSContentsWithTagsOrigin(tagIDs: string[], offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })

  // tagIDsをソートしてキャッシュのキーにしてcacheの有無を確認
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const cacheKey = generateContentsWithTagsKey(tagIDs, offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { contents: contentsAPIResult[]; total: number }
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/get_contents_with_tags', {
      tag_id: tagIDs.join('+'),
      offset: offsetStr,
      limit: limitStr,
    })
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return { contents: [], total: 0 }
    }
    const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }
    if (!data) {
      return { contents: [], total: 0 }
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as { contents: contentsAPIResult[]; total: number }
  }

  const res = await env.CMS_RPC.fetchContentsByTag(tagIDs, offsetStr, limitStr)

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.contentsWithTags
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

  return res as { contents: contentsAPIResult[]; total: number }
}

// タグの一覧取得
async function getTagsOrigin() {
  const { env } = await getCloudflareContext({ async: true })

  // cacheに有無を確認する
  const cacheKey = generateTagsKey()
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as categoryAPIResult[]
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/get_tags')
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return []
    }
    const data = (await res.json()) as categoryAPIResult[]
    if (!data) {
      return []
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as categoryAPIResult[]
  }

  const res = await env.CMS_RPC.fetchTags()

  // cacheに保存する
  // 有効期間は1時間
  const expirationTtl = dev ? 60 : CacheTTL.tags
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

  return res as categoryAPIResult[]
}

// 特定のページの詳細情報取得
async function getInfoOrigin() {
  const { env } = await getCloudflareContext({ async: true })

  // cacheに有無を確認する
  const cacheKey = generateInfoKey()
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as infoAPIResult[]
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/get_info')
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return []
    }
    const data = (await res.json()) as infoAPIResult[]
    if (!data) {
      return []
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as infoAPIResult[]
  }

  const res = await env.CMS_RPC.fetchInfo()
  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.info
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

  return res as infoAPIResult[]
}

async function getStaticOrigin() {
  const { env } = await getCloudflareContext({ async: true })

  // cacheに有無を確認する
  const cacheKey = generateStaticDataKey()
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as staticAPIResult
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/get_static')
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return {} as staticAPIResult
    }
    const data = (await res.json()) as staticAPIResult
    if (!data) {
      return {} as staticAPIResult
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as staticAPIResult
  }

  const res = await env.CMS_RPC.fetchStatic()
  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.static
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

  return res as staticAPIResult
}

// マンガのリスト取得
async function getBandeDessineeOrigin(offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })

  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const cacheKey = generateBandeDessineeKey(offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { bandeDessinees: bandeDessineeResult[]; total: number }
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/bande_dessinees', {
      offset: offsetStr,
      limit: limitStr,
    })
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return { bandeDessinees: [], total: 0 }
    }
    const data = (await res.json()) as { bandeDessinees: bandeDessineeResult[]; total: number }
    if (!data) {
      return { bandeDessinees: [], total: 0 }
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as { bandeDessinees: bandeDessineeResult[]; total: number }
  }

  try {
    const res = await env.CMS_RPC.fetchBandeDessinees(offsetStr, limitStr)
    // cacheに保存する
    const expirationTtl = dev ? 60 : CacheTTL.bandeDessinee
    await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

    return res as { bandeDessinees: bandeDessineeResult[]; total: number }
  } catch (e) {
    console.error('Error fetching bandeDessinees:', e)
    throw new Error('Error fetching bandeDessinees')
  }
}

// 単一のマンガ情報取得
async function getBandeDessineeByIDOrigin(contentID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })

  const cacheKey = generateBandeDessineeContentKey(contentID)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache && !draftKey) {
    // draftKeyがある場合はキャッシュを使わない
    const data = JSON.parse(cache) as bandeDessineeResult
    return data
  }

  if (getLocalEnv() === 'local') {
    const query: Record<string, string> =
      draftKey !== undefined ? { content_id: contentID, draftKey } : { content_id: contentID }
    const request = await cmsFetcher('/api/cms/bande_dessinee', query)
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return {} as bandeDessineeResult
    }
    const data = (await res.json()) as bandeDessineeResult
    if (!data) {
      return {} as bandeDessineeResult
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as bandeDessineeResult
  }

  try {
    const res = await env.CMS_RPC.fetchBandeDessinee(contentID, draftKey || null)

    // draftKeyがある場合はキャッシュを使わない
    if (draftKey) {
      return res as bandeDessineeResult
    }

    // cacheに保存する
    const expirationTtl = dev ? 60 : CacheTTL.bandeDessineeByID
    await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

    return res as bandeDessineeResult
  } catch (e) {
    console.error('Error fetching bandeDessinee:', e)
    throw new Error('Error fetching bandeDessinee')
  }
}

async function getAteliersOrigin(offset?: number, limit?: number) {
  const { env } = await getCloudflareContext({ async: true })
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'

  const cacheKey = generateAtelierKey(offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { ateliers: atelierResult[]; total: number }
    return data
  }

  if (getLocalEnv() === 'local') {
    const request = await cmsFetcher('/api/cms/atelier', {
      offset: offsetStr,
      limit: limitStr,
    })
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return { ateliers: [], total: 0 } as { ateliers: atelierResult[]; total: number }
    }
    const data = (await res.json()) as { ateliers: atelierResult[]; total: number }
    if (!data) {
      return {} as { ateliers: atelierResult[]; total: number }
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as { ateliers: atelierResult[]; total: number }
  }

  try {
    const res = await env.CMS_RPC.fetchAteliers(offsetStr, limitStr)

    // cacheに保存する
    const expirationTtl = dev ? 60 : CacheTTL.atelier
    await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

    return res as { ateliers: atelierResult[]; total: number }
  } catch (e) {
    console.error('Error fetching atelier:', e)
    throw new Error('Error fetching atelier')
  }
}

async function getAtelierByIDOrigin(contentID: string, draftKey?: string) {
  const { env } = await getCloudflareContext({ async: true })

  const cacheKey = generateAtelierContentKey(contentID)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache && !draftKey) {
    // draftKeyがある場合はキャッシュを使わない
    const data = JSON.parse(cache) as atelierResult
    return data
  }

  if (getLocalEnv() === 'local') {
    const query: Record<string, string> =
      draftKey !== undefined ? { content_id: contentID, draftKey } : { content_id: contentID }
    const request = await cmsFetcher('/api/cms/atelier', query)
    const res = await fetch(request, { cache: 'no-store' })
    if (!res.ok) {
      return {} as atelierResult
    }
    const data = (await res.json()) as atelierResult
    if (!data) {
      return {} as atelierResult
    }

    await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 })

    return data as atelierResult
  }

  try {
    const res = await env.CMS_RPC.fetchAtelier(contentID, draftKey || null)

    // draftKeyがある場合はキャッシュを使わない
    if (draftKey) {
      return res as atelierResult
    }

    // cacheに保存する
    const expirationTtl = dev ? 60 : CacheTTL.atelierByID
    await env.CMS_CACHE.put(cacheKey, JSON.stringify(res), { expirationTtl })

    return res as atelierResult
  } catch (e) {
    console.error('Error fetching atelier by ID:', e)
    throw new Error('Error fetching atelier by ID')
  }
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
