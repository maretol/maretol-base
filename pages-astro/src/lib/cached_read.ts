// isolate の寿命の間、値を 1 回だけ読んで使い回す（Secrets Store など、デプロイ中は変わらない値のため。リクエストごとに await しない。#1303）。
// 読めなかったとき（例外、または null）は null を返し、しばらく（RETRY_AFTER_MS）は読み直さない。
// 失敗の直後に読み直し続けないのは、障害の間にすべての描画が読み取りを待たされるのを避けるため
const RETRY_AFTER_MS = 60 * 1000

export function cachedRead<T>(name: string, read: () => Promise<T | null>): () => Promise<T | null> {
  // 読み取り中、または読み終えた Promise
  let pending: Promise<T | null> | undefined
  // 直近の失敗の時刻。成功したら undefined に戻す
  let failedAt: number | undefined

  async function run(): Promise<T | null> {
    try {
      const value = await read()
      if (value === null) {
        console.error(`[lib/cached_read.ts] ${name} is not set`)
      }
      failedAt = value === null ? Date.now() : undefined
      return value
    } catch (e) {
      console.error(`[lib/cached_read.ts] failed to read ${name}`, e)
      failedAt = Date.now()
      return null
    }
  }

  return () => {
    const retry = failedAt !== undefined && Date.now() - failedAt >= RETRY_AFTER_MS
    if (pending === undefined || retry) {
      failedAt = undefined
      pending = run()
    }
    return pending
  }
}
