import { generateContentKey } from 'cms-cache-key-gen'
import { Env } from './index'

async function deleteCacheByPrefix(env: Env, prefix: string) {
  const list = await env.CMS_CACHE.list({ prefix: prefix })
  // すべての contents_ から始まるキーを削除する
  const deleteKeys = await Promise.all(
    list.keys.map(async (key) => {
      await env.CMS_CACHE.delete(key.name)
      return key.name
    })
  )
  deleteKeys.forEach((key) => {
    console.log(`Deleted: ${key}`)
  })

  if (list.list_complete === false) {
    // キャッシュがまだある場合は再帰的に削除する
    await deleteCacheByPrefix(env, prefix)
  }
}

async function deleteCache(env: Env, cacheKey: string) {
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (!cache) {
    // キャッシュがなかったのでパス
    return
  }
  await env.CMS_CACHE.delete(cacheKey)
}

export { deleteCacheByPrefix, deleteCache }
