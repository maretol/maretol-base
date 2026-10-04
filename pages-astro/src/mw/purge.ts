import type { PurgeResult } from 'cache-tags'

// 1 回の呼び出しで受け付けるタグ数の上限。保存 1 回ぶんのタグは数個なので、桁違いの要求は弾く
const MAX_TAGS = 100

// Workers Cache のタグパージ。呼び出した entrypoint のキャッシュにしか届かないので、default entrypoint の ctx を渡すこと
export async function purgeByTags(ctx: ExecutionContext, tags: unknown): Promise<PurgeResult> {
  if (!isTagList(tags)) {
    return { success: false, errors: [{ code: 400, message: 'invalid tags' }] }
  }
  if (!ctx.cache) {
    // ローカル開発など Workers Cache が無い環境。消すものが無いので成功として返す
    return { success: true, errors: [] }
  }

  // 制限に達しても例外にはならず success: false が返る。そのまま呼び出し元へ返して判断させる
  const result = await ctx.cache.purge({ tags })
  if (!result.success) {
    console.error('[purge] failed', JSON.stringify({ tags, errors: result.errors }))
  }
  return { success: result.success, errors: result.errors }
}

function isTagList(tags: unknown): tags is string[] {
  return (
    Array.isArray(tags) &&
    tags.length > 0 &&
    tags.length <= MAX_TAGS &&
    tags.every((tag) => typeof tag === 'string' && tag !== '')
  )
}
