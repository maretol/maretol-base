import { requireBaseURL, SITE_LOGO_ALT } from './lib/constants'

// デプロイ反映待ち（readiness）。
// テスト本体の実行前に、既存トップページ（/）へ正常応答（2xx）かつ共通シェルの既知マーカーが
// 返るまでポーリングして待機する。App Router のストリーミング SSR により、CMS 本文が
// suspend 中でもシェル（ヘッダー/フッター）を含む 2xx が即時返るため、既存ページでも
// 安定した疎通判定点になる。

const READINESS_INTERVAL_MS = 5_000
const READINESS_TIMEOUT_MS = 180_000

interface ReadinessOptions {
  url: string
  marker: string
  intervalMs: number
  timeoutMs: number
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function probeOnce(url: string, marker: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
      return false
    }
    const body = await res.text()
    return body.includes(marker)
  } catch {
    // 接続不可・DNS 未伝播などは未達として扱い、リトライを続ける。
    return false
  }
}

async function waitForStagingReady(options: ReadinessOptions): Promise<void> {
  const { url, marker, intervalMs, timeoutMs } = options
  const deadline = Date.now() + timeoutMs

  // 規定間隔でポーリングし、2xx かつマーカー確認で成功。タイムアウトで throw。
  for (;;) {
    if (await probeOnce(url, marker)) {
      // eslint-disable-next-line no-console
      console.log(`[readiness] staging is ready: ${url}`)
      return
    }
    if (Date.now() >= deadline) {
      throw new Error(`[readiness] staging did not become ready within ${timeoutMs}ms: ${url}`)
    }
    await sleep(intervalMs)
  }
}

export default async function globalSetup(): Promise<void> {
  const baseURL = requireBaseURL()
  const target = new URL('/', baseURL).toString()
  await waitForStagingReady({
    url: target,
    marker: SITE_LOGO_ALT,
    intervalMs: READINESS_INTERVAL_MS,
    timeoutMs: READINESS_TIMEOUT_MS,
  })
}
