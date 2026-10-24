import { defineConfig } from 'vitest/config'

// Node で動く純粋な関数のテスト（lib/rss.ts など）。Worker のバインディングに触るコードは対象にしない
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
