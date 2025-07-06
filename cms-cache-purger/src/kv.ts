import { generateContentKey } from 'cms-cache-key-gen'
import { Env } from './index'

async function deleteContentsCache(env: Env) {
  const list = await env.CMS_CACHE.list({ prefix: 'contents_' })
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
    await deleteContentsCache(env)
  }
}

async function deleteContentCache(env: Env, contentID: string) {
  const cacheKey = generateContentKey(contentID)
  await deleteCache(env, cacheKey)
}

async function deleteCache(env: Env, cacheKey: string) {
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (!cache) {
    // キャッシュがなかったのでパス
    return
  }
  await env.CMS_CACHE.delete(cacheKey)
}

export { deleteContentsCache, deleteContentCache, deleteCache }
