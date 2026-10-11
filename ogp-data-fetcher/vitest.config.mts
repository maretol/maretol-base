import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Workers のグローバル（HTMLRewriter）を Node で代用する
    setupFiles: ['./test/setup.ts'],
  },
})
