import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// 設計は astro_design.md を参照
export default defineConfig({
  site: 'https://www.maretol.xyz',
  // 全ルートをリクエスト時に描画する。静的にするページだけ個別に prerender = true を付ける
  output: 'server',
  adapter: cloudflare({
    // astro:assets の画像最適化は使わない（/cdn-cgi/image/ の URL を自前で組み立てる）。
    // 既定の 'cloudflare-binding' はアダプタが IMAGES という名前の Images binding を注入し、R2 の IMAGES と衝突する
    imageService: 'passthrough',
  }),
  // セッションは使わない（SESSION 用の KV を作らせない。Set-Cookie を返すとキャッシュされなくなる）
  session: false,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      optimizeDeps: {
        // 開発サーバーが最初のリクエストの途中で依存を最適化し直すと、React が二重に読み込まれて Island の描画が失敗する。
        // 起動時に最適化を済ませておく
        include: ['@lucide/astro', 'lucide-react'],
      },
    },
  },
})
