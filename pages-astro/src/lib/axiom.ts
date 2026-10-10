import { env } from 'cloudflare:workers'

// Axiom へのログ送信（astro_design.md 5 章「ログと解析」）
// - 送信はレスポンスを待たせない（waitUntil）
// - Secrets Store（AXIOM_ENDPOINT / AXIOM_APITOKEN）は isolate ごとに 1 回だけ読み、リクエストごとに await しない（#1303）
// - 送信に失敗してもページには影響させず、Workers Logs に残すだけにする
// - 開発サーバー（astro dev）は Worker のエントリ（src/worker.ts）を通らないので、ここには来ない

// Axiom に送るイベント。type で種類を区別する（access_log / degraded_page / render_error）
export type LogEvent = { type: string; timestamp: string } & Record<string, unknown>

type AxiomConfig = { endpoint: string; apiToken: string }

// 読み取り中の Promise を持ち、isolate の寿命の間は読み直さない
let config: Promise<AxiomConfig | null> | undefined

function getConfig(): Promise<AxiomConfig | null> {
  config ??= loadConfig()
  return config
}

async function loadConfig(): Promise<AxiomConfig | null> {
  try {
    const [endpoint, apiToken] = await Promise.all([env.AXIOM_ENDPOINT.get(), env.AXIOM_APITOKEN.get()])
    if (!endpoint || !apiToken) {
      // 設定の不備は次のリクエストでも変わらないので、読み直さない
      console.error('[lib/axiom.ts] AXIOM_ENDPOINT / AXIOM_APITOKEN is not set')
      return null
    }
    return { endpoint, apiToken }
  } catch (e) {
    // 一時的な失敗（Secrets Store の障害など）は、次のリクエストで読み直す
    config = undefined
    console.error('[lib/axiom.ts] failed to read the Axiom secrets', e)
    return null
  }
}

// 送信を続けさせるための waitUntil。Hono の c.executionCtx と Worker の ctx のどちらでも渡せるよう、waitUntil だけを求める
type Background = Pick<ExecutionContext, 'waitUntil'>

// イベントを Axiom に送る。送信はバックグラウンドで続け、呼び出し元は待たない
export function sendLogs(ctx: Background, events: LogEvent[]): void {
  ctx.waitUntil(deliver(events))
}

async function deliver(events: LogEvent[]): Promise<void> {
  try {
    const axiom = await getConfig()
    if (axiom === null) {
      return
    }
    const response = await fetch(axiom.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${axiom.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    })
    if (!response.ok) {
      console.error('[lib/axiom.ts] send failed', { status: response.status, body: await response.text() })
    }
  } catch (e) {
    console.error('[lib/axiom.ts] send failed', e)
  }
}

// ページ単位のイベントに共通の項目
export function pageEvent(type: string, url: URL, fields: Record<string, unknown>): LogEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    host: url.host,
    path: url.pathname,
    search: url.search,
    ...fields,
  }
}
