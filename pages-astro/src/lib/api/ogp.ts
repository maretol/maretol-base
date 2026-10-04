import { env, waitUntil } from 'cloudflare:workers'
import type { OGPResult } from 'api-types'

// OGP データを保持する秒数
const OGP_CACHE_TTL = 3 * 24 * 60 * 60
// 取得失敗を保持する秒数。リンク先が落ちている・応答しない間、描画のたびに取りに行かないための短い保持
const FAILURE_CACHE_TTL = 10 * 60
// 取得の待ち時間。リンク先が応答しないときにリンクカードの描画を待たせ続けないための上限
const FETCH_TIMEOUT_MS = 5 * 1000

// 取得失敗の記録。現行サイト（pages）も同じ KV を OGPResult として読むので、OGPResult として読める形にしておく
type CachedOGP = Partial<OGPResult> & { success: boolean; fetch_failed?: boolean }

// リンクカード用の OGP データ。取得できなかったとき（例外・タイムアウト）は null。
// リンク先に OGP が無いだけの場合は success: false の結果が返る
export async function getOGPData(targetURL: string): Promise<OGPResult | null> {
  // KV の読み書きに失敗しても取得は続ける
  try {
    const cached = await env.OGP_FETCHER_CACHE.get(targetURL)
    if (cached) {
      const data = JSON.parse(cached) as CachedOGP
      return data.fetch_failed ? null : (data as OGPResult)
    }
  } catch (e) {
    console.error(`[lib/api/ogp.ts] Cache get error for key ${targetURL}:`, e)
  }

  const fetching = (env.OGP_RPC.fetchOGPData(targetURL) as Promise<OGPResult>).catch((e) => {
    console.error(`[lib/api/ogp.ts] OGP fetch error for ${targetURL}:`, e)
    return null
  })
  // 取得と KV への保存は、待ち時間を超えても最後まで続ける。応答が遅いだけのリンク先は、遅れて返った結果が KV に入り、次回の描画で使える。
  // 保存の完了はレスポンスに必要ないので待たない
  waitUntil(fetching.then((result) => saveCache(targetURL, result)))

  return withTimeout(fetching, FETCH_TIMEOUT_MS).catch((e) => {
    console.error(`[lib/api/ogp.ts] OGP fetch timeout for ${targetURL}:`, e)
    return null
  })
}

// KV への保存。取得できなかったときは、失敗の記録を短く保持する。保存に失敗しても取得結果はそのまま使う
async function saveCache(targetURL: string, result: OGPResult | null): Promise<void> {
  const value: CachedOGP = result ?? { success: false, fetch_failed: true }
  try {
    await env.OGP_FETCHER_CACHE.put(targetURL, JSON.stringify(value), {
      expirationTtl: result ? OGP_CACHE_TTL : FAILURE_CACHE_TTL,
    })
  } catch (e) {
    console.error(`[lib/api/ogp.ts] Cache put error for key ${targetURL}:`, e)
  }
}

// RPC は途中で打ち切れないので、待つのをやめるだけにする（呼び出し自体は続く）
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const { promise: timeout, reject } = Promise.withResolvers<never>()
  const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}
