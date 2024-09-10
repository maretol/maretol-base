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
  async fetch(request, env, ctx): Promise<Response> {
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

    switch (pathname) {
      case '/cms_data/get_contents':
        const offset = parseInt(offsetStr)
        const limit = parseInt(limitStr)
        const contents = await getContents(cmsApiKey, offset, limit)
        contents.contents.forEach((c) => {
          c.parsed_content = parse(c.content)
        })
        return Response.json(contents)

      case '/cms_data/get_content':
        if (tagIDsStr !== undefined) {
          const tagIDs = tagIDsStr.split('+')
          const offset = parseInt(offsetStr)
          const limit = parseInt(limitStr)
          const contents = await getContentsByTag(cmsApiKey, tagIDs, offset, limit)
          contents.contents.forEach((c) => {
            c.parsed_content = parse(c.content)
          })
          return Response.json(contents)
        } else {
          const content = await getContent(cmsApiKey, articleID, draftKey)
          content.parsed_content = parse(content.content)
          return Response.json(content)
        }
      case '/cms_data/get_tags':
        const tags = await getTags(cmsApiKey)
        return Response.json(tags)

      case '/cms_data/get_info':
        const info = await getInfo(cmsApiKey)
        info.forEach((i) => {
          i.parsed_content = parse(i.main_text)
        })
        return Response.json(info)

      default:
        return new Response('ok', { status: 200 })
    }
  },
} satisfies ExportedHandler<Env>
