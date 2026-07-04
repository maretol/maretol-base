import { defineConfig, devices, type ReporterDescription } from '@playwright/test'
import { requireBaseURL } from './lib/constants'

// base URL は E2E_BASE_URL から取得（未設定なら requireBaseURL が throw して即時停止）。
const baseURL = requireBaseURL()

const isCI = !!process.env.CI

// レポータ: 常に list + HTML。CI では GitHub アノテーションも付与する。
const reporter: ReporterDescription[] = isCI
  ? [['list'], ['html', { open: 'never' }], ['github']]
  : [['list'], ['html', { open: 'never' }]]

export default defineConfig({
  testDir: './tests',
  // デプロイ反映待ち（readiness）をテスト本体の前に実行する。
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  // CI 前提の余裕を持ったタイムアウト。無限待機を避ける。
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // 一時的なネットワーク/描画遅延を自動リトライで吸収（ローカルは 0）。
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // 初期は Chromium のみ。外部デプロイ済み URL 対象のため webServer は使用しない。
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
