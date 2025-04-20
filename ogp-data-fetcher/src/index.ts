/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import ogs from 'open-graph-scraper-lite'
import { OGPResult } from 'api-types'
import { fetchAndGetHTMLText } from './fetcher'
import { WorkerEntrypoint } from 'cloudflare:workers'

export interface Env {
  API_KEY: string
}

export default class OGPDataFetcher extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const env = this.env
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== env.API_KEY) {
      return new Response('internal server error', { status: 500 })
    }

    const url = new URL(request.url)
    const searchParams = url.searchParams
    const target = searchParams.get('target')
    if (target === null) {
      return new Response('Bad Request', { status: 400 })
    }

    try {
      const responseBody = await this.fetchOGPData(target)
      return Response.json(responseBody)
    } catch (e) {
      console.error(e)
      const responseBody = {
        success: false,
      } as OGPResult
      return Response.json(responseBody)
    }
  }

  async fetchOGPData(target: string): Promise<OGPResult> {
    const { title, text } = await fetchAndGetHTMLText(target)

    const options = {
      html: text,
      onlyGetOpenGraphInfo: true,
    }
    const data = await ogs(options)

    const ogp = data.result
    const status = ogp.success
    const ogTitle = ogp.ogTitle || title
    const description = ogp.ogDescription || ''
    let image = ogp.ogImage?.[0].url || ''
    const ogURL = ogp.ogUrl || ''
    const sitename = ogp.ogSiteName || ''

    // image が相対パスで設定されていた場合、ogURLのドメインを付与する
    if (image.startsWith('/')) {
      const url = new URL(target)
      image = url.origin + image
    }

    const responseBody = {
      success: status,
      header_title: title,
      og_title: ogTitle,
      og_description: description,
      og_image: image,
      og_url: ogURL,
      og_site_name: sitename,
    } as OGPResult
    return responseBody
  }
}
