/**
 * 公開サイト（pages-astro）の Workers Cache のタグパージ（astro_design.md 4.4 参照）
 *
 * Workers Cache は他の Worker からパージできないため、Service Binding（ASTRO_PAGES）経由で
 * 公開サイトの RPC メソッドを呼び、公開サイト自身にパージさせる
 *
 * - 保存 1 回につき呼び出しは 1 回にし、必要なタグをまとめて渡す（パージにはレート制限がある）
 * - binding が無い環境（Astro 版へ切り替える前の本番・ローカル）では何もしない
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'

// パージできたか。binding が無くて何もしなかった場合も true（失敗ではない）
export async function purgeEdgeCache(tags: string[]): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true })
  if (!env.ASTRO_PAGES) {
    return true
  }

  try {
    // レート制限などで失敗しても例外にはならず success: false が返る
    const result = await env.ASTRO_PAGES.purgeTags(tags)
    if (!result.success) {
      console.error('Edge cache purge failed:', JSON.stringify({ tags, errors: result.errors }))
    }
    return result.success
  } catch (e) {
    console.error('Edge cache purge error:', e)
    return false
  }
}
