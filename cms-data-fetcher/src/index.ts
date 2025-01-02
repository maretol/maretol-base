/**
 * CMSのHTMLにある程度従ったテキストを投げ込むとそれらをJSONでパースして返す処理
 */

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

export interface Env {
  API_KEY: string
  CMS_API_KEY: string
  CMS_API_KEY_BD: string
}

export default {
  async fetch(request: Request, env, ctx): Promise<Response> {
    // APIキーの認証
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== env.API_KEY) {
      return new Response('internal server error', { status: 500 })
    }

    const url = new URL(request.url)
    const searchParams = url.searchParams
    const pathname = url.pathname

    const cmsApiKey = env.CMS_API_KEY
    const cmsApiKey_bd = env.CMS_API_KEY_BD

    const offsetStr = searchParams.get('offset') || '0'
    const limitStr = searchParams.get('limit') || '10'
    const tagIDsStr = searchParams.get('tag_id') || undefined
    const articleID = searchParams.get('article_id') || ''
    const contentID = searchParams.get('content_id') || ''
    const draftKey = searchParams.get('draftKey') || undefined

    if (pathname.includes('/cms/get_contents_with_tag')) {
      // タグで絞り込んで記事一覧を取得
      if (tagIDsStr === undefined) {
        return Response.json({ contents: [], total: 0 })
      }
      const tagIDs = tagIDsStr.split('+')
      const offset = parseInt(offsetStr)
      const limit = parseInt(limitStr)
      const contents = await getContentsByTag(cmsApiKey, tagIDs, offset, limit)
      contents.contents.forEach((c) => {
        const parsed = parse(c.content)
        c.parsed_content = parsed.contents_array
        c.table_of_contents = parsed.table_of_contents
      })
      return Response.json(contents)
    } else if (pathname.includes('/cms/get_contents')) {
      // 通常の記事一覧での取得
      const offset = parseInt(offsetStr)
      const limit = parseInt(limitStr)
      const contents = await getContents(cmsApiKey, offset, limit)
      contents.contents.forEach((c) => {
        const parsed = parse(c.content)
        c.parsed_content = parsed.contents_array
        c.table_of_contents = parsed.table_of_contents
      })
      return Response.json(contents)
    } else if (pathname.includes('/cms/get_content')) {
      // 単独の記事を取得
      const content = await getContent(cmsApiKey, articleID, draftKey)
      const parsed = parse(content.content)
      content.parsed_content = parsed.contents_array
      content.table_of_contents = parsed.table_of_contents
      return Response.json(content)
    } else if (pathname.includes('/cms/get_tags')) {
      // タグ一覧を取得
      const tags = await getTags(cmsApiKey)
      return Response.json(tags)
    } else if (pathname.includes('/cms/get_info')) {
      // 固定ページ・一部の特殊なページを取得
      const info = await getInfo(cmsApiKey)
      info.forEach((i) => {
        const parsed = parse(i.main_text)
        i.parsed_content = parsed.contents_array
        i.table_of_contents = parsed.table_of_contents
      })
      return Response.json(info)
    } else if (pathname.includes('/cms/bande_dessinee')) {
      if (contentID === '') {
        // マンガの指定がない場合offsetとlimitで一覧を取得
        const offset = parseInt(offsetStr)
        const limit = parseInt(limitStr)
        const contents = await getBandeDessinees(cmsApiKey_bd, offset, limit)
        contents.bandeDessinees.forEach((bd) => {
          const parsed = parse(bd.description)
          bd.parsed_description = parsed.contents_array
          bd.table_of_contents = parsed.table_of_contents
        })
        return Response.json(contents)
      } else {
        // マンガの指定がある場合そのマンガを取得
        const content = await getBandeDessinee(cmsApiKey_bd, contentID)
        const parsed = parse(content.description)
        content.parsed_description = parsed.contents_array
        content.table_of_contents = parsed.table_of_contents
        return Response.json(content)
      }
    } else {
      return new Response('ok', { status: 200 })
    }
  },
} satisfies ExportedHandler<Env>
