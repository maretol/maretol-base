import type {
  adjacentContentsResult,
  atelierResult,
  bandeDessineeResult,
  categoryAPIResult,
  contentsAPIResult,
  infoAPIResult,
  staticAPIResult,
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

// ブログ記事の一覧と総件数。範囲外の offset では空の一覧と総件数が返る
export async function getCMSContents(
  offset: number,
  limit: number,
): Promise<{ contents: contentsAPIResult[]; total: number }> {
  return (await env.CMS_RPC.fetchContents(offset.toString(), limit.toString())) as {
    contents: contentsAPIResult[]
    total: number
  }
}

// タグで絞り込んだブログ記事の一覧と総件数
export async function getCMSContentsWithTags(
  tagIDs: string[],
  offset: number,
  limit: number,
): Promise<{ contents: contentsAPIResult[]; total: number }> {
  return (await env.CMS_RPC.fetchContentsByTag(tagIDs, offset.toString(), limit.toString())) as {
    contents: contentsAPIResult[]
    total: number
  }
}

// ブログのタグ（カテゴリ）の一覧
export async function getTags(): Promise<categoryAPIResult[]> {
  return (await env.CMS_RPC.fetchTags()) as categoryAPIResult[]
}

// 固定文言（サイドバーの About / Profile など）
export async function getStatic(): Promise<staticAPIResult> {
  return (await env.CMS_RPC.fetchStatic()) as staticAPIResult
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

// info（about / contact / artifact などの固定ページ）の一覧。
// 1 回の描画の中では取得を 1 回にまとめる（制作物カードが複数あると、カードごとに全件の取得とパースが走るため）。
// 取得中の Promise を locals に置いて共有する。リクエストをまたぐキャッシュは持たない
export function getInfo(locals: App.Locals): Promise<infoAPIResult[]> {
  return (locals.info ??= fetchInfo())
}

async function fetchInfo(): Promise<infoAPIResult[]> {
  return (await env.CMS_RPC.fetchInfo()) as infoAPIResult[]
}

// 漫画の一覧と総件数
export async function getBandeDessinees(
  offset: number,
  limit: number,
): Promise<{ bandeDessinees: bandeDessineeResult[]; total: number }> {
  return (await env.CMS_RPC.fetchBandeDessinees(offset.toString(), limit.toString())) as {
    bandeDessinees: bandeDessineeResult[]
    total: number
  }
}

// イラストの一覧と総件数
export async function getAteliers(
  offset: number,
  limit: number,
): Promise<{ ateliers: atelierResult[]; total: number }> {
  return (await env.CMS_RPC.fetchAteliers(offset.toString(), limit.toString())) as {
    ateliers: atelierResult[]
    total: number
  }
}

// 特定の漫画。fetcher は「存在しない」とそれ以外の失敗を区別せずに例外を投げる
export async function getBandeDessineeByID(contentID: string, draftKey?: string): Promise<bandeDessineeResult> {
  return (await env.CMS_RPC.fetchBandeDessinee(contentID, draftKey ?? null)) as bandeDessineeResult
}

// 特定のイラスト。fetcher は「存在しない」とそれ以外の失敗を区別せずに例外を投げる
export async function getAtelierByID(contentID: string, draftKey?: string): Promise<atelierResult> {
  return (await env.CMS_RPC.fetchAtelier(contentID, draftKey ?? null)) as atelierResult
}
