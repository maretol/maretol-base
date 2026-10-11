import { HTMLRewriter as WasmHTMLRewriter } from 'html-rewriter-wasm'

type Handlers = Parameters<WasmHTMLRewriter['on']>[1]

// 入力をこの大きさに分けて渡し、テキストがチャンクに分かれて届く状況を再現する
const WRITE_CHUNK_BYTES = 8

// Workers のグローバル HTMLRewriter を html-rewriter-wasm（同じ lol-html）で代用する。
// on() で受けた handler を transform() のときに wasm 側へ渡し、出力は Response の body に流す
class HTMLRewriterShim {
  private handlers: [string, Handlers][] = []

  on(selector: string, handlers: Handlers): this {
    this.handlers.push([selector, handlers])
    return this
  }

  transform(response: Response): Response {
    const handlers = this.handlers
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        // 出力チャンクは wasm のメモリへの参照なので、保持するためにコピーする
        const rewriter = new WasmHTMLRewriter((chunk) => controller.enqueue(chunk.slice()))
        for (const [selector, handler] of handlers) {
          rewriter.on(selector, handler)
        }
        try {
          const input = new Uint8Array(await response.arrayBuffer())
          for (let offset = 0; offset < input.length; offset += WRITE_CHUNK_BYTES) {
            await rewriter.write(input.subarray(offset, offset + WRITE_CHUNK_BYTES))
          }
          await rewriter.end()
        } finally {
          rewriter.free()
        }
        controller.close()
      },
    })
    return new Response(body)
  }
}

// vi.stubGlobal だと各テストの vi.unstubAllGlobals() で外れてしまうので、直接グローバルに置く
Object.assign(globalThis, { HTMLRewriter: HTMLRewriterShim })
