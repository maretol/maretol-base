import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Node で動く純粋な関数のテスト（lib/rss.ts など）。Worker のバインディングに触るコードは対象にしない。
// テストは src の外の test/ に置く（ほかのワークスペースと同じ）
export default defineConfig({
  resolve: {
    // tsconfig.json の paths と同じ別名。Vite は tsconfig の paths を読まないのでここでも定義する
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.spec.ts'],
  },
})
