import { getRequestContext } from '@cloudflare/next-on-pages'
import { bandeDessineeResult, categoryAPIResult, contentsAPIResult, infoAPIResult, OGPResult } from 'api-types'
import { getLocalEnv, getNodeEnv } from '../env'
import { cache } from 'react'

// const revalidateTime = 0 // 無効にする。どうやらnext.jsのバグを踏んでいるっぽい
const dev = getNodeEnv() === 'development'

const getOGPData = cache(getOGPDataOrigin)
const getCMSContents = cache(getCMSContentsOrigin)
const getCMSContent = cache(getCMSContentOrigin)
const getCMSContentsWithTags = cache(getCMSContentsWithTagsOrigin)
const getTags = cache(getTagsOrigin)
const getInfo = cache(getInfoOrigin)
const getBandeDessinee = cache(getBandeDessineeOrigin)
const getBandeDessineeByID = cache(getBandeDessineeByIDOrigin)

async function getOGPDataOrigin(targetURL: string) {
  const { env } = getRequestContext()

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

  // 成功時はcacheに保存する
  // 有効期限は3日。devのときは1秒
  const expirationTtl = dev ? 1 : 60 * 60 * 24 * 3
  await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(data), { expirationTtl })

  return data
}

async function getCMSContentsOrigin(offset?: number, limit?: number) {
  const { env } = getRequestContext()

  const cache = await env.CMS_CACHE.get(`contents_${offset}_${limit}`)
  if (cache) {
    const data = JSON.parse(cache) as { contents: contentsAPIResult[]; total: number }
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_contents')
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  // cacheに保存する
  // 有効期間は30分。長く保持すると、記事の更新が反映されないため
  await env.CMS_CACHE.put(`contents_${offset}_${limit}`, JSON.stringify(data), { expirationTtl: 60 * 30 })

  return data
}

async function getCMSContentOrigin(articleID: string, draftKey?: string) {
  const { env } = getRequestContext()

  const cache = await env.CMS_CACHE.get(`content_${articleID}`)
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
  // 公開日から3日以内の場合は1分、それ以降は1日
  const now = new Date()
  const publishedAt = new Date(data.publishedAt)
  const diff = now.getTime() - publishedAt.getTime()
  const expirationTtl = diff < 1000 * 60 * 60 * 24 * 3 ? 60 : 60 * 60 * 24
  await env.CMS_CACHE.put(`content_${articleID}`, JSON.stringify(data), { expirationTtl })

  return data
}

async function getCMSContentsWithTagsOrigin(tagIDs: string[], offset?: number, limit?: number) {
  const { env } = getRequestContext()

  // tagIDsをソートしてキャッシュのキーにしてcacheの有無を確認
  tagIDs = tagIDs.sort()
  const cache = await env.CMS_CACHE.get(`contents_with_tags_${tagIDs.join('_')}_${offset}_${limit}`)
  if (cache) {
    const data = JSON.parse(cache) as { contents: contentsAPIResult[]; total: number }
    return data
  }

  const host = env.HOST
  const url = new URL(host + '/api/cms/get_contents_with_tag')
  url.searchParams.set('tag_id', tagIDs.join('+'))
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { cache: 'no-store' })
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  // cacheに保存する
  // 有効期間は1分。長く保持すると、記事の更新が反映されないため
  await env.CMS_CACHE.put(`contents_with_tags_${tagIDs.join('_')}_${offset}_${limit}`, JSON.stringify(data), {
    expirationTtl: 60,
  })

  return data
}

async function getTagsOrigin() {
  const { env } = getRequestContext()

  // cacheに有無を確認する
  const cache = await env.CMS_CACHE.get('tags')
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
  await env.CMS_CACHE.put('tags', JSON.stringify(data), { expirationTtl: 60 * 60 })

  return data
}

async function getInfoOrigin() {
  const { env } = getRequestContext()

  // cacheに有無を確認する
  const cache = await env.CMS_CACHE.get('info')
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
  // 有効期間は1日
  await env.CMS_CACHE.put('info', JSON.stringify(data), { expirationTtl: 60 * 60 * 24 })

  return data
}

async function getBandeDessineeOrigin(offset?: number, limit?: number) {
  const { env } = getRequestContext()

  const cache = await env.CMS_CACHE.get(`bande_dessinee_${offset}_${limit}`)
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
  // 有効期間は5分
  await env.CMS_CACHE.put(`bande_dessinee_${offset}_${limit}`, JSON.stringify(data), { expirationTtl: 60 * 5 })

  return data
}

async function getBandeDessineeByIDOrigin(contentID: string, draftKey?: string) {
  const { env } = getRequestContext()

  const cache = await env.CMS_CACHE.get(`bande_dessinee_${contentID}`)
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
  // 有効期間は更新日時から1日以内の場合は1分、それ以降は1日
  const now = new Date()
  const updatedAt = new Date(data.updatedAt)
  const diff = now.getTime() - updatedAt.getTime()
  const expirationTtl = diff < 1000 * 60 * 60 * 24 ? 60 : 60 * 60 * 24
  await env.CMS_CACHE.put(`bande_dessinee_${contentID}`, JSON.stringify(data), { expirationTtl })

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
