import { Buffer } from 'node:buffer'
import { env, waitUntil } from 'cloudflare:workers'
import { sha256Hex } from '@/lib/hex'

// 引用画像（外部サイトの画像）をサーバー側で取得し、data URL にして返す。
// 閲覧者のブラウザから引用元へ直接リクエストさせないためと、引用元が消えても一定期間表示を保つため。
// 呼ぶのは Server Island（components/blocks/CiteImageContent.astro）だけで、記事本体の描画からは呼ばない（記事の表示を引用元の応答で待たせない）。
// Worker の中でだけ動く（cloudflare:workers を使うので、ブラウザ側の island からは import できない）。ブラウザには data URL を埋めた HTML だけが届く

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const CACHE_KEY_PREFIX = 'cite:'
// 取得できた画像を保持する秒数
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60
// 取得失敗を表すキャッシュ値の prefix。data URL と区別できればよいので理由を続けて入れる
const FAILURE_VALUE_PREFIX = 'error:'
// 取り直しても直らない失敗のキャッシュ値の prefix。FAILURE_VALUE_PREFIX で始まる形にして、失敗かどうかの判定は prefix 1 つで済ませる
const PERMANENT_FAILURE_VALUE_PREFIX = `${FAILURE_VALUE_PREFIX}permanent:`
// 取得失敗を保持する秒数。引用元が落ちている・応答しない間、描画のたびに取りに行かないための短い保持
const FAILURE_CACHE_TTL = 10 * 60
// 外部への fetch の待ち時間。引用元が応答しないときに island の描画を待たせ続けないための上限
const FETCH_TIMEOUT_MS = 5 * 1000
// 取得する画像の上限。画像は data URL（base64 で約 4/3 倍）にして HTML に埋め込むので、そのまま全閲覧者が受け取る HTML の大きさになる。
// 描画中は画像の全量を何重にもメモリに持つ（mw/cache.ts が本文を最後まで読む）ことにもなるので、小さく抑える。
// これを超える画像は取得を打ち切って失敗扱いにする。KV の値の上限（25MiB）には data URL にしても十分収まる
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

// 取得の結果。失敗のうち permanent は、取り直しても直らないもの（引用元が画像を消した・拒否している、未対応の形式、大きすぎる画像など）。
// それ以外の失敗（タイムアウト、引用元の一時的な障害など）は、時間をおけば直る可能性がある
export type CiteImageResult = { ok: true; dataURL: string } | { ok: false; permanent: boolean }

type DownloadFailure = { reason: string; permanent: boolean }

export async function fetchCiteImage(url: string): Promise<CiteImageResult> {
  // KV のキーは 512B までなので、URL そのものではなくハッシュをキーにする
  const cacheKey = CACHE_KEY_PREFIX + (await sha256Hex(url))

  try {
    const cached = await env.IMAGE_CACHE.get(cacheKey)
    if (cached) {
      if (!cached.startsWith(FAILURE_VALUE_PREFIX)) {
        return { ok: true, dataURL: cached }
      }
      // 直近で失敗しているときは、負キャッシュの間は取りに行かない
      return { ok: false, permanent: cached.startsWith(PERMANENT_FAILURE_VALUE_PREFIX) }
    }
  } catch (e) {
    console.error(`[lib/api/cite_image.ts] Cache get error for ${url}:`, e)
  }

  const downloaded = await downloadImage(url)
  if ('dataURL' in downloaded) {
    saveCache(cacheKey, downloaded.dataURL, IMAGE_CACHE_TTL)
    return { ok: true, dataURL: downloaded.dataURL }
  }
  // 失敗の理由は負キャッシュの値に残す
  console.error(`[lib/api/cite_image.ts] Image fetch failed for ${url}: ${downloaded.reason}`)
  const prefix = downloaded.permanent ? PERMANENT_FAILURE_VALUE_PREFIX : FAILURE_VALUE_PREFIX
  saveCache(cacheKey, prefix + downloaded.reason, FAILURE_CACHE_TTL)
  return { ok: false, permanent: downloaded.permanent }
}

// 画像を取得して data URL にする。取得できなかったときは、理由と、取り直しても直らない失敗かどうかを返す
async function downloadImage(url: string): Promise<{ dataURL: string } | DownloadFailure> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    const contentType = response.headers.get('content-type')
    const contentLength = Number(response.headers.get('content-length'))
    if (!response.ok) {
      return { reason: `status ${response.status}`, permanent: isPermanentStatus(response.status) }
    }
    if (!contentType || !SUPPORTED_FORMATS.some((format) => contentType.startsWith(format))) {
      return { reason: `unsupported content-type ${contentType}`, permanent: true }
    }
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      // Content-Length が分かるときは本文を読む前に弾く
      return { reason: `too large ${contentLength} bytes`, permanent: true }
    }
    // Content-Length がない・偽っているケースに備えて、読みながら上限を超えた時点で打ち切る
    const bytes = await readBodyWithLimit(response, MAX_IMAGE_BYTES)
    if (bytes === null) {
      return { reason: `exceeded ${MAX_IMAGE_BYTES} bytes while reading`, permanent: true }
    }
    if (bytes.byteLength === 0) {
      return { reason: 'empty body', permanent: true }
    }
    return { dataURL: `data:${contentType};base64,${bytes.toString('base64')}` }
  } catch (e) {
    // タイムアウト（TimeoutError）や接続失敗もここに来る。時間をおけば直る可能性がある
    return { reason: e instanceof Error ? `${e.name}: ${e.message}` : String(e), permanent: false }
  }
}

// 4xx は、引用元が画像を消した・拒否している場合で、取り直しても直らない。
// 408（タイムアウト）と 429（リクエスト過多）は 4xx でも一時的なもの。5xx は引用元の一時的な障害として扱う
function isPermanentStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}

// KV への保存。書き込みの完了はレスポンスに必要ないので待たない。保存に失敗しても取得結果はそのまま返す
function saveCache(cacheKey: string, value: string, expirationTtl: number): void {
  waitUntil(
    env.IMAGE_CACHE.put(cacheKey, value, { expirationTtl }).catch((e) => {
      console.error(`[lib/api/cite_image.ts] Cache put error for key ${cacheKey}:`, e)
    }),
  )
}

// 本文を読み進めながら合計サイズを数え、上限を超えたら読むのをやめて null を返す
async function readBodyWithLimit(response: Response, limit: number): Promise<Buffer | null> {
  if (!response.body) {
    return Buffer.alloc(0)
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}
