import { env } from 'cloudflare:workers'
import type { OGPResult } from 'api-types'
import { ogpRPC } from './bindings'

// OGP データを保持する秒数
const OGP_CACHE_TTL = 3 * 24 * 60 * 60

// リンクカード用の OGP データ。KV の読み書きに失敗しても取得は続ける
export async function getOGPData(targetURL: string): Promise<OGPResult> {
  try {
    const cached = await env.OGP_FETCHER_CACHE.get(targetURL)
    if (cached) {
      return JSON.parse(cached) as OGPResult
    }
  } catch (e) {
    console.error(`[lib/api/ogp.ts] Cache get error for key ${targetURL}:`, e)
  }

  try {
    const res = (await ogpRPC().fetchOGPData(targetURL)) as OGPResult
    try {
      await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(res), { expirationTtl: OGP_CACHE_TTL })
    } catch (e) {
      console.error(`[lib/api/ogp.ts] Cache put error for key ${targetURL}:`, e)
    }
    return res
  } catch (e) {
    console.error('[lib/api/ogp.ts] OGP fetch error:', e)
    return { success: false } as OGPResult
  }
}
