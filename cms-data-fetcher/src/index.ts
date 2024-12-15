/**
 * CMSのHTMLにある程度従ったテキストを投げ込むとそれらをJSONでパースして返す処理
 */

import { getContent, getContents, getContentsByTag, getInfo, getTags } from './micro_cms'
import { parse } from './parse'

export interface Env {
  API_KEY: string
  CMS_API_KEY: string
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
    const offsetStr = searchParams.get('offset') || '0'
    const limitStr = searchParams.get('limit') || '10'
    const tagIDsStr = searchParams.get('tag_id') || undefined
    const articleID = searchParams.get('article_id') || ''
    const draftKey = searchParams.get('draftKey') || undefined

    if (pathname.includes('/cms/get_contents_with_tag')) {
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
      const content = await getContent(cmsApiKey, articleID, draftKey)
      const parsed = parse(content.content)
      content.parsed_content = parsed.contents_array
      content.table_of_contents = parsed.table_of_contents
      return Response.json(content)
    } else if (pathname.includes('/cms/get_tags')) {
      const tags = await getTags(cmsApiKey)
      return Response.json(tags)
    } else if (pathname.includes('/cms/get_info')) {
      const info = await getInfo(cmsApiKey)
      info.forEach((i) => {
        const parsed = parse(i.main_text)
        i.parsed_content = parsed.contents_array
        i.table_of_contents = parsed.table_of_contents
      })
      return Response.json(info)
    } else {
      return new Response('ok', { status: 200 })
    }
  },
} satisfies ExportedHandler<Env>
