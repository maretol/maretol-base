import { getRequestContext } from '@cloudflare/next-on-pages'
import { bandeDessineeResult, categoryAPIResult, contentsAPIResult, infoAPIResult, OGPResult } from 'api-types'
import { getNodeEnv } from '../env'

const revalidateTime = getNodeEnv() === 'production' ? 60 : 0

async function getOGPData(targetURL: string) {
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

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  if (!res.ok) {
    return { success: false } as OGPResult
  }

  const data = (await res.json()) as OGPResult
  if (!data.success) {
    return data
  }

  // 成功時はcacheに保存する
  // 有効期限は3日
  await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 3 })

  return data
}

async function getCMSContents(offset?: number, limit?: number) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_contents')
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  return data
}

async function getCMSContent(articleID: string, draftKey?: string) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_content')
  url.searchParams.set('article_id', articleID)
  if (draftKey) url.searchParams.set('draftKey', draftKey)

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  const data = (await res.json()) as contentsAPIResult

  return data
}

async function getCMSContentsWithTags(tagIDs: string[], offset?: number, limit?: number) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_contents_with_tag')
  url.searchParams.set('tag_id', tagIDs.join('+'))
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  return data
}

async function getTags() {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_tags')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  const data = (await res.json()) as categoryAPIResult[]

  return data
}

async function getInfo() {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_info')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  const data = (await res.json()) as infoAPIResult[]

  return data
}

async function getBandeDessinee(offset?: number, limit?: number) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/bande_dessinee')
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request, { next: { revalidate: revalidateTime } })
  const data = (await res.json()) as { bandeDessinees: bandeDessineeResult[]; total: number }

  return data
}

async function getBandeDessineeByID(contentID: string, draftKey?: string) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/bande_dessinee')
  url.searchParams.set('content_id', contentID)
  url.searchParams.set('draftKey', draftKey || 'undefined')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  console.log('fetch start')
  const res = await fetch(request, { cache: 'no-store' })
  console.log('fetch finished')
  const data = (await res.json()) as bandeDessineeResult
  console.log('data set')

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
