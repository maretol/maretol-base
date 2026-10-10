// 1 リクエストの中で起きたことを Axiom に送るイベントの形と、その記録先（astro_design.md 5 章「ログと解析」）。
// 記録先は Astro.locals。Hono のミドルウェア（getFetchState(c).locals）と Astro のページ（Astro.locals）は同じオブジェクトを見るので、
// どちらからでも同じ配列に届く。送信は src/mw/observe.ts がレスポンスの確定後に 1 回だけ行う（配送は src/lib/axiom.ts）

// type で種類を区別する（access_log / degraded_page / render_error / middleware_error）
export type LogEvent = { type: string; timestamp: string } & Record<string, unknown>

export function createEvent(type: string, fields: Record<string, unknown>): LogEvent {
  return { type, timestamp: new Date().toISOString(), ...fields }
}

export function recordLogEvent(locals: App.Locals, event: LogEvent): void {
  ;(locals.logEvents ??= []).push(event)
}

// 例外を送る形にする
export function describeError(error: unknown): { error: string; stack?: string } {
  if (error instanceof Error) {
    return { error: `${error.name}: ${error.message}`, stack: error.stack }
  }
  return { error: String(error) }
}
