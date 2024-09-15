import { getRequestContext } from '@cloudflare/next-on-pages'
import { categoryAPIResult, contentsAPIResult, infoAPIResult, OGPResult } from 'api-types'

async function getOGPData(targetURL: string) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/ogp')
  url.searchParams.set('target', targetURL)

  const ogpAPIKey = env.OGP_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': ogpAPIKey }, method: 'GET' })

  const res = await fetch(request)
  const data = (await res.json()) as OGPResult

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

  const res = await fetch(request)
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

  const res = await fetch(request)
  const data = (await res.json()) as contentsAPIResult

  return data
}

async function getCMSContentsWithTags(tagIDs: string[], offset?: number, limit?: number) {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_content')
  url.searchParams.set('tag_id', tagIDs.join('+'))
  if (offset) url.searchParams.set('offset', offset?.toString() || '0')
  if (limit) url.searchParams.set('limit', limit?.toString() || '10')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request)
  const data = (await res.json()) as { contents: contentsAPIResult[]; total: number }

  return data
}

async function getTags() {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_tags')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request)
  const data = (await res.json()) as categoryAPIResult[]

  return data
}

async function getInfo() {
  const { env } = getRequestContext()
  const host = env.HOST
  const url = new URL(host + '/api/cms/get_info')

  const cmsAPIKey = env.CMS_FETCHER_API_KEY

  const request = new Request(url, { headers: { 'x-api-key': cmsAPIKey }, method: 'GET' })

  const res = await fetch(request)
  const data = (await res.json()) as infoAPIResult[]

  return data
}

export { getOGPData, getCMSContents, getCMSContent, getCMSContentsWithTags, getTags, getInfo }
