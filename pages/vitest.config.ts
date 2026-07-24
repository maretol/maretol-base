import { defineConfig } from 'vitest/config'

// pages ワークスペースのユニットテスト設定。
// React/Next に依存しない純関数（lib 配下）を node 環境でテストする。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
