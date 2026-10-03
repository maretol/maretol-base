import type { adjacentContentsResult, contentsAPIResult } from 'api-types'
import { cmsRPC } from './bindings'

// cms-data-fetcher の RPC を呼ぶ薄い関数。データのキャッシュは持たない（HTML をエッジでキャッシュする。astro_design.md 5 章）

// fetcher は存在しない ID に対して「... not found: {id}」というメッセージの例外を投げる
function isNotFoundError(e: unknown): boolean {
  return e instanceof Error && / not found: /.test(e.message)
}

// 特定のブログ記事。存在しないときは null。
// それ以外の失敗（D1 の一時的な障害など）は例外のまま上げる。null にすると 404 として扱われ、エッジにキャッシュされてしまうため
export async function getCMSContent(articleID: string, draftKey?: string): Promise<contentsAPIResult | null> {
  try {
    const content = await cmsRPC().fetchContent(articleID, draftKey ?? null)
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
    return await cmsRPC().fetchAdjacentContents(articleID)
  } catch (e) {
    console.error(`[lib/api/cms.ts] fetchAdjacentContents failed: ${articleID}`, e)
    return null
  }
}
