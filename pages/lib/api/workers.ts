import { getCloudflareContext } from '@opennextjs/cloudflare'
import { bandeDessineeResult, categoryAPIResult, contentsAPIResult, infoAPIResult, OGPResult } from 'api-types'
import { getNodeEnv } from '../env'
import {
  generateBandeDessineeContentKey,
  generateBandeDessineeKey,
  generateContentKey,
  generateContentsKey,
  generateContentsWithTagsKey,
  generateInfoKey,
  generateTagsKey,
} from 'cms-cache-key-gen'
import { cache } from 'react'

// const revalidateTime = 0 // 無効にする。どうやらnext.jsのバグを踏んでいるっぽい
const dev = getNodeEnv() === 'development'

const DAY = 60 * 60 * 24
const HOUR = 60 * 60

const CacheTTL = {
  ogpData: 3 * DAY, // OGPデータの保持
  contents: 15 * DAY, // トップページなどのブログコンテンツリスト
  content: 10 * DAY, // 特定のブログコンテンツ
  contentsWithTags: 10 * DAY, // タグ指定のブログコンテンツリスト
  tags: 30 * DAY, // タグリスト
  info: 30 * DAY, // 特定ページ（静的ページ）の情報。変更が少ないためキャッシュ長め
  bandeDessinee: 12 * HOUR, // マンガリスト。更新少なめなのでとりあえず12時間。今後更新を増やしたらキャッシュ破棄を実装する
  bandeDessineeByID: 12 * HOUR, // マンガの詳細情報。更新少なめなのでとりあえず12時間。今後更新を増やしたらキャッシュ破棄を実装する
}

const getOGPData = cache(getOGPDataOrigin)
const getCMSContents = cache(getCMSContentsOrigin)
const getCMSContent = cache(getCMSContentOrigin)
const getCMSContentsWithTags = cache(getCMSContentsWithTagsOrigin)
const getTags = cache(getTagsOrigin)
const getInfo = cache(getInfoOrigin)
const getBandeDessinee = cache(getBandeDessineeOrigin)
const getBandeDessineeByID = cache(getBandeDessineeByIDOrigin)

// OGPデータの取得
async function getOGPDataOrigin(targetURL: string) {
  const { env } = getCloudflareContext()

  // cacheに有無を確認する
  const cache = await env.OGP_FETCHER_CACHE.get(targetURL)
  if (cache) {
    const data = JSON.parse(cache) as OGPResult
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/ogp')
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

  // 成功時はcacheに保存する。devのときは60秒（最短）
  const expirationTtl = dev ? 60 : CacheTTL.ogpData
  await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(data), { expirationTtl })

  return data
}

// ブログの更新リストの取得
async function getCMSContentsOrigin(offset?: number, limit?: number) {
  const { env } = getCloudflareContext()

  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'

  const cacheKey = generateContentsKey(offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { contents: contentsAPIResult[]; total: number }
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_contents')
  url.searchParams.set('offset', offsetStr)
  url.searchParams.set('limit', limitStr)

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  // cacheに保存する
  const expirationTtl = CacheTTL.contents
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

// 特定のブログコンテンツの取得
async function getCMSContentOrigin(articleID: string, draftKey?: string) {
  const { env } = getCloudflareContext()

  const cacheKey = generateContentKey(articleID)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache && !draftKey) {
    // draftKeyがある場合はキャッシュを使わない
    const data = JSON.parse(cache) as contentsAPIResult
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_content')
  url.searchParams.set('article_id', articleID)
  if (draftKey) url.searchParams.set('draftKey', draftKey)

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as contentsAPIResult

  // draftKeyがある場合はキャッシュを使わないため
  if (draftKey) {
    return data
  }

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.content
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

// タグを指定してコンテンツを取得
async function getCMSContentsWithTagsOrigin(tagIDs: string[], offset?: number, limit?: number) {
  const { env } = getCloudflareContext()

  // tagIDsをソートしてキャッシュのキーにしてcacheの有無を確認
  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const cacheKey = generateContentsWithTagsKey(tagIDs, offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { contents: contentsAPIResult[]; total: number }
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_contents_with_tag')
  url.searchParams.set('tag_id', tagIDs.join('+'))
  url.searchParams.set('offset', offsetStr)
  url.searchParams.set('limit', limitStr)

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.contentsWithTags
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

// タグの一覧取得
async function getTagsOrigin() {
  const { env } = getCloudflareContext()

  // cacheに有無を確認する
  const cacheKey = generateTagsKey()
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as categoryAPIResult[]
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_tags')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as categoryAPIResult[]

  // cacheに保存する
  // 有効期間は1時間
  const expirationTtl = dev ? 60 : CacheTTL.tags
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

// 特定のページの詳細情報取得
async function getInfoOrigin() {
  const { env } = getCloudflareContext()

  // cacheに有無を確認する
  const cacheKey = generateInfoKey()
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as infoAPIResult[]
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_info')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as infoAPIResult[]

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.info
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

// マンガのリスト取得
async function getBandeDessineeOrigin(offset?: number, limit?: number) {
  const { env } = getCloudflareContext()

  const offsetStr = offset?.toString() || '0'
  const limitStr = limit?.toString() || '10'
  const cacheKey = generateBandeDessineeKey(offsetStr, limitStr)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache) {
    const data = JSON.parse(cache) as { bandeDessinees: bandeDessineeResult[]; total: number }
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/bande_dessinee')
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as { bandeDessinees: bandeDessineeResult[]; total: number }

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.bandeDessinee
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

// 単一のマンガ情報取得
async function getBandeDessineeByIDOrigin(contentID: string, draftKey?: string) {
  const { env } = getCloudflareContext()

  const cacheKey = generateBandeDessineeContentKey(contentID)
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (cache && !draftKey) {
    // draftKeyがある場合はキャッシュを使わない
    const data = JSON.parse(cache) as bandeDessineeResult
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/bande_dessinee')
  url.searchParams.set('content_id', contentID)
  url.searchParams.set('draftKey', draftKey || 'undefined')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as bandeDessineeResult

  // draftKeyがある場合はキャッシュを使わない
  if (draftKey) {
    return data
  }

  // cacheに保存する
  const expirationTtl = dev ? 60 : CacheTTL.bandeDessineeByID
  await env.CMS_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl })

  return data
}

export {
  getOGPData,
  getCMSContents,
  getCMSContent,
  getCMSContentsWithTags,
  getTags,
  getInfo,
  getBandeDessinee,
  getBandeDessineeByID,
}
