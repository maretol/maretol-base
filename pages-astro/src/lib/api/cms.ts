import type {
  adjacentContentsResult,
  atelierResult,
  bandeDessineeResult,
  contentsAPIResult,
  infoAPIResult,
} from 'api-types'
import { env } from 'cloudflare:workers'

// cms-data-fetcher の RPC を呼ぶ薄い関数。データのキャッシュは持たない（HTML をエッジでキャッシュする。astro_design.md 5 章）

// fetcher は存在しない ID に対して「... not found: {id}」というメッセージの例外を投げる
function isNotFoundError(e: unknown): boolean {
  return e instanceof Error && / not found: /.test(e.message)
}

// 特定のブログ記事。存在しないときは null。
// それ以外の失敗（D1 の一時的な障害など）は例外のまま上げる。null にすると 404 として扱われ、エッジにキャッシュされてしまうため
export async function getCMSContent(articleID: string, draftKey?: string): Promise<contentsAPIResult | null> {
  try {
    const content = await env.CMS_RPC.fetchContent(articleID, draftKey ?? null)
    return content?.id ? (content as contentsAPIResult) : null
  } catch (e) {
    if (isNotFoundError(e)) {
      return null
    }
    throw e
  }
}

// 前後記事。取得に失敗したら null（記事本体は表示するが、呼び出し側でキャッシュを避ける）
export async function getAdjacentContents(articleID: string): Promise<adjacentContentsResult | null> {
  try {
    return await env.CMS_RPC.fetchAdjacentContents(articleID)
  } catch (e) {
    console.error(`[lib/api/cms.ts] fetchAdjacentContents failed: ${articleID}`, e)
    return null
  }
}

// info（about / contact / artifact などの固定ページ）の一覧
export async function getInfo(): Promise<infoAPIResult[]> {
  return (await env.CMS_RPC.fetchInfo()) as infoAPIResult[]
}

// 特定の漫画。fetcher は「存在しない」とそれ以外の失敗を区別せずに例外を投げる
export async function getBandeDessineeByID(contentID: string, draftKey?: string): Promise<bandeDessineeResult> {
  return (await env.CMS_RPC.fetchBandeDessinee(contentID, draftKey ?? null)) as bandeDessineeResult
}

// 特定のイラスト。fetcher は「存在しない」とそれ以外の失敗を区別せずに例外を投げる
export async function getAtelierByID(contentID: string, draftKey?: string): Promise<atelierResult> {
  return (await env.CMS_RPC.fetchAtelier(contentID, draftKey ?? null)) as atelierResult
}
