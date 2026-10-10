import { requireBaseURL, SITE_LOGO_ALT } from './lib/constants'

// デプロイ反映待ち（readiness）。
// テスト本体の実行前に、トップページ（/）が 2xx で応答し、共通シェルの既知マーカー（ヘッダーロゴの alt）を
// 含むまでポーリングして待機する。対象は Astro 版の staging（maretol-base-v4-stg）。
// ページは Workers Cache にヒットすれば Worker を起動せずに返るので、前のデプロイが残したエントリで通らないように、
// 実行ごとに違う値の UTM クエリを付けてキャッシュを外す（UTM はどのルートでも残り、キャッシュのキーに含まれる。astro_design.md 4.5）。
// ミスしたリクエストは本文まで描画してから返るので、応答が返れば今の Worker が起動して描画できたことになる。

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
  // キャッシュのキーを実行ごとに変える。GitHub Actions では run の ID、ローカルでは実行時刻
  const runId = process.env.GITHUB_RUN_ID ?? String(Date.now())
  const target = new URL(`/?utm_source=e2e&utm_content=${runId}`, baseURL).toString()
  await waitForStagingReady({
    url: target,
    marker: SITE_LOGO_ALT,
    intervalMs: READINESS_INTERVAL_MS,
    timeoutMs: READINESS_TIMEOUT_MS,
  })
}
