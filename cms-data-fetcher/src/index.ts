/**
 * CMSのHTMLにある程度従ったテキストを投げ込むとそれらをJSONでパースして返す処理
 */

import { bandeDessineeResult, categoryAPIResult, contentsAPIResult, infoAPIResult } from 'api-types'
import {
  getBandeDessinee,
  getBandeDessinees,
  getContent,
  getContents,
  getContentsByTag,
  getInfo,
  getTags,
} from './micro_cms'
import { parse } from './parse'
import { WorkerEntrypoint } from 'cloudflare:workers'

export interface Env {
  API_KEY: string
  CMS_API_KEY: string
  CMS_API_KEY_BD: string
}

export default class CMSDataFetcher extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const env = this.env

    // APIキーの認証
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== env.API_KEY) {
      return new Response('internal server error', { status: 500 })
    }

    const url = new URL(request.url)
    const searchParams = url.searchParams
    const pathname = url.pathname

    const offset = searchParams.get('offset') || undefined
    const limit = searchParams.get('limit') || undefined
    const tagIDsStr = searchParams.get('tag_id')?.split('+') || []
    const articleID = searchParams.get('article_id')
    const contentID = searchParams.get('content_id')
    const draftKey = searchParams.get('draftKey') || undefined

    if (pathname.includes('/cms/get_contents_with_tag')) {
      // タグで絞り込んで記事一覧を取得
      const contents = await this.fetchContentsByTag(tagIDsStr, offset, limit)
      return Response.json(contents)
    } else if (pathname.includes('/cms/get_contents')) {
      // 通常の記事一覧での取得
      const contents = await this.fetchContents(offset, limit)
      return Response.json(contents)
    } else if (pathname.includes('/cms/get_content')) {
      // 単独の記事を取得
      if (articleID === null) {
        return new Response('articleID is empty', { status: 400 })
      }
      const content = await this.fetchContent(articleID, draftKey)
      return Response.json(content)
    } else if (pathname.includes('/cms/get_tags')) {
      // タグ一覧を取得
      const tags = await this.fetchTags()
      return Response.json(tags)
    } else if (pathname.includes('/cms/get_info')) {
      // 固定ページ・一部の特殊なページを取得
      const info = await this.fetchInfo()
      return Response.json(info)
    } else if (pathname.includes('/cms/bande_dessinee')) {
      if (contentID === '' || contentID === null) {
        // マンガの指定がない場合offsetとlimitで一覧を取得
        const contents = await this.fetchBandeDessinees(offset, limit)
        return Response.json(contents)
      } else {
        // マンガの指定がある場合そのマンガを取得
        const content = await this.fetchBandeDessinee(contentID, draftKey)
        return Response.json(content)
      }
    } else {
      return new Response('ok', { status: 200 })
    }
  }

  async fetchContentsByTag(
    tagIDs: string[],
    offset?: string,
    limit?: string
  ): Promise<{ contents: contentsAPIResult[]; total: number }> {
    const apiKey = this.env.CMS_API_KEY
    if (tagIDs === null) {
      return { contents: [], total: 0 }
    }
    const offsetNum = parseOffset(offset)
    const limitNum = parseLimit(limit)
    const contents = await getContentsByTag(apiKey, tagIDs, offsetNum, limitNum)
    contents.contents.forEach((c) => {
      const parsed = parse(c.content)
      c.parsed_content = parsed.contents_array
      c.table_of_contents = parsed.table_of_contents
    })
    return JSON.parse(JSON.stringify(contents))
  }

  async fetchContents(offset?: string, limit?: string): Promise<{ contents: contentsAPIResult[]; total: number }> {
    const apiKey = this.env.CMS_API_KEY
    const offsetNum = parseOffset(offset)
    const limitNum = parseLimit(limit)
    const contents = await getContents(apiKey, offsetNum, limitNum)
    contents.contents.forEach((c) => {
      const parsed = parse(c.content)
      c.parsed_content = parsed.contents_array
      c.table_of_contents = parsed.table_of_contents
    })
    return JSON.parse(JSON.stringify(contents))
  }

  async fetchContent(articleID: string, draftKey?: string): Promise<contentsAPIResult> {
    const apiKey = this.env.CMS_API_KEY
    const parsedDraftKey = draftKey === null ? undefined : draftKey
    const content = await getContent(apiKey, articleID, parsedDraftKey)
    const parsed = parse(content.content)
    content.parsed_content = parsed.contents_array
    content.table_of_contents = parsed.table_of_contents
    return JSON.parse(JSON.stringify(content))
  }

  async fetchTags(): Promise<categoryAPIResult[]> {
    const apiKey = this.env.CMS_API_KEY
    const tags = await getTags(apiKey)
    return JSON.parse(JSON.stringify(tags))
  }

  async fetchInfo(): Promise<infoAPIResult[]> {
    const apiKey = this.env.CMS_API_KEY
    const info = await getInfo(apiKey)
    info.forEach((i) => {
      const parsed = parse(i.main_text)
      i.parsed_content = parsed.contents_array
      i.table_of_contents = parsed.table_of_contents
    })
    return JSON.parse(JSON.stringify(info))
  }

  async fetchBandeDessinees(
    offset?: string,
    limit?: string
  ): Promise<{ bandeDessinees: bandeDessineeResult[]; total: number }> {
    const apiKey = this.env.CMS_API_KEY_BD
    const offsetNum = parseOffset(offset)
    const limitNum = parseLimit(limit)

    try {
      const contents = await getBandeDessinees(apiKey, offsetNum, limitNum)
      contents.bandeDessinees.forEach((bd) => {
        const parsed = parse(bd.description)
        bd.parsed_description = parsed.contents_array
        bd.table_of_contents = parsed.table_of_contents
      })
      return JSON.parse(JSON.stringify(contents))
    } catch (e) {
      console.error('Error fetching bandeDessinees:', e)
      throw new Error('Error fetching bandeDessinees')
    }
  }

  async fetchBandeDessinee(contentID: string, draftKey?: string): Promise<bandeDessineeResult> {
    const apiKey = this.env.CMS_API_KEY_BD
    if (contentID === null) {
      throw new Error('contentID is empty')
    }
    try {
      const content = await getBandeDessinee(apiKey, contentID, draftKey || undefined)
      const parsed = parse(content.description)
      content.parsed_description = parsed.contents_array
      content.table_of_contents = parsed.table_of_contents
      return JSON.parse(JSON.stringify(content))
    } catch (e) {
      console.error('Error fetching bandeDessinee:', e)
      throw new Error('Error fetching bandeDessinee')
    }
  }
}

function parseOffset(offset: string | undefined): number {
  if (offset === undefined) {
    return 0
  }
  const parsedOffset = parseInt(offset)
  if (isNaN(parsedOffset)) {
    return 0
  }
  return parsedOffset
}

function parseLimit(limit: string | undefined): number {
  if (limit === undefined) {
    return 10
  }
  const parsedLimit = parseInt(limit)
  if (isNaN(parsedLimit)) {
    return 10
  }
  return parsedLimit
}
