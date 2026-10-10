import { env } from 'cloudflare:workers'
import { cachedRead } from './cached_read'
import type { LogEvent } from './log'

// Axiom への配送（astro_design.md 5 章「ログと解析」）
// - 1 リクエストのイベントをまとめて 1 回の POST で送る。呼ぶのは src/mw/observe.ts だけ
// - 送信はレスポンスを待たせない（waitUntil）。ctx は呼び出し元が渡す
// - 送信に失敗してもページには影響させず、Workers Logs に残すだけにする
// - 開発サーバー（astro dev）は Worker のエントリ（src/worker.ts）を通らないので、ここには来ない

type AxiomConfig = { endpoint: string; apiToken: string }

// Secrets Store は isolate ごとに 1 回だけ読む
const getConfig = cachedRead<AxiomConfig>('AXIOM_ENDPOINT / AXIOM_APITOKEN', async () => {
  const [endpoint, apiToken] = await Promise.all([env.AXIOM_ENDPOINT.get(), env.AXIOM_APITOKEN.get()])
  return endpoint && apiToken ? { endpoint, apiToken } : null
})

// 送信を続けさせるための waitUntil。Hono の c.executionCtx と Worker の ctx のどちらでも渡せるよう、waitUntil だけを求める
type Background = Pick<ExecutionContext, 'waitUntil'>

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
