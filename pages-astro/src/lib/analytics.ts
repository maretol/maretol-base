import { env } from 'cloudflare:workers'
import { cachedRead } from './cached_read'

// アクセス解析（Cloudflare Web Analytics の beacon と Microsoft Clarity）の設定。
// タグは本番だけに出す（src/components/shell/AnalyticsScripts.astro）

// Cloudflare Web Analytics のサイトトークン（現行 pages/app/layout.tsx と同じ値）
export const CF_BEACON_TOKEN = 'e7ad45139e61492b95a8686432f438e4'

// Clarity のプロジェクト ID。Secrets Store から isolate ごとに 1 回だけ読む。読めないときは null（Clarity を出さずに描画を続ける）
export const getClarityID = cachedRead<string>('CLARITY_ID', async () => {
  const id = await env.CLARITY_ID.get()
  // HTML に埋め込むので、英数字以外が混ざった値は使わない
  return id && /^[A-Za-z0-9]+$/.test(id) ? id : null
})

// Clarity の公式スニペット。ID は英数字だけであることを getClarityID() で確かめている
export function claritySnippet(id: string): string {
  return (
    '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};' +
    't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;' +
    'y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})' +
    `(window,document,"clarity","script","${id}");`
  )
}
