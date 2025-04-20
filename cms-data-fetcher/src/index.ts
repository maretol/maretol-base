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
import { MicroCMSContentId, MicroCMSDate } from 'microcms-js-sdk'
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

    const offset = searchParams.get('offset')
    const limit = searchParams.get('limit')
    const tagIDsStr = searchParams.get('tag_id')
    const articleID = searchParams.get('article_id')
    const contentID = searchParams.get('content_id')
    const draftKey = searchParams.get('draftKey')

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
        const content = await this.fetchBandeDessinee(contentID)
        return Response.json(content)
      }
    } else {
      return new Response('ok', { status: 200 })
    }
  }

  async fetchContentsByTag(
    tagIDsStr: string | null,
    offset: number | string | null,
    limit: number | string | null
  ): Promise<{ contents: (contentsAPIResult & MicroCMSContentId & MicroCMSDate)[]; total: number }> {
    const apiKey = this.env.CMS_API_KEY
    if (tagIDsStr === null) {
      return { contents: [], total: 0 }
    }
    const tagIDs = tagIDsStr.split('+')
    const offsetNum = parseOffset(offset)
    const limitNum = parseLimit(limit)
    const contents = await getContentsByTag(apiKey, tagIDs, offsetNum, limitNum)
    contents.contents.forEach((c) => {
      const parsed = parse(c.content)
      c.parsed_content = parsed.contents_array
      c.table_of_contents = parsed.table_of_contents
    })
    return contents
  }

  async fetchContents(
    offset: number | string | null,
    limit: number | string | null
  ): Promise<{ contents: (contentsAPIResult & MicroCMSContentId & MicroCMSDate)[]; total: number }> {
    const apiKey = this.env.CMS_API_KEY
    const offsetNum = parseOffset(offset)
    const limitNum = parseLimit(limit)
    const contents = await getContents(apiKey, offsetNum, limitNum)
    contents.contents.forEach((c) => {
      const parsed = parse(c.content)
      c.parsed_content = parsed.contents_array
      c.table_of_contents = parsed.table_of_contents
    })
    return contents
  }

  async fetchContent(
    articleID: string | null,
    draftKey: string | null
  ): Promise<contentsAPIResult & MicroCMSContentId & MicroCMSDate> {
    const apiKey = this.env.CMS_API_KEY
    if (articleID === null) {
      throw new Error('articleID is null')
    }
    const parsedDraftKey = draftKey === null ? undefined : draftKey
    const content = await getContent(apiKey, articleID, parsedDraftKey)
    const parsed = parse(content.content)
    content.parsed_content = parsed.contents_array
    content.table_of_contents = parsed.table_of_contents
    return content
  }

  async fetchTags(): Promise<(categoryAPIResult & MicroCMSContentId & MicroCMSDate)[]> {
    const apiKey = this.env.CMS_API_KEY
    const tags = await getTags(apiKey)
    return tags
  }

  async fetchInfo(): Promise<(infoAPIResult & MicroCMSContentId & MicroCMSDate)[]> {
    const apiKey = this.env.CMS_API_KEY
    const info = await getInfo(apiKey)
    info.forEach((i) => {
      const parsed = parse(i.main_text)
      i.parsed_content = parsed.contents_array
      i.table_of_contents = parsed.table_of_contents
    })
    return info
  }

  async fetchBandeDessinees(
    offset: number | string | null,
    limit: number | string | null
  ): Promise<{ bandeDessinees: (bandeDessineeResult & MicroCMSContentId & MicroCMSDate)[]; total: number }> {
    const apiKey = this.env.CMS_API_KEY_BD
    const offsetNum = parseOffset(offset)
    const limitNum = parseLimit(limit)
    const contents = await getBandeDessinees(apiKey, offsetNum, limitNum)
    contents.bandeDessinees.forEach((bd) => {
      const parsed = parse(bd.description)
      bd.parsed_description = parsed.contents_array
      bd.table_of_contents = parsed.table_of_contents
    })
    return contents
  }

  async fetchBandeDessinee(contentID: string | null): Promise<bandeDessineeResult & MicroCMSContentId & MicroCMSDate> {
    const apiKey = this.env.CMS_API_KEY_BD
    if (contentID === null) {
      throw new Error('contentID is empty')
    }
    const content = await getBandeDessinee(apiKey, contentID)
    const parsed = parse(content.description)
    content.parsed_description = parsed.contents_array
    content.table_of_contents = parsed.table_of_contents
    return content
  }
}

function parseOffset(offset: number | string | null): number {
  if (offset === null) {
    return 0
  }
  if (typeof offset === 'number') {
    return offset
  }
  const parsedOffset = parseInt(offset)
  if (isNaN(parsedOffset)) {
    return 0
  }
  return parsedOffset
}

function parseLimit(limit: number | string | null): number {
  if (limit === null) {
    return 10
  }
  if (typeof limit === 'number') {
    return limit
  }
  const parsedLimit = parseInt(limit)
  if (isNaN(parsedLimit)) {
    return 10
  }
  return parsedLimit
}
