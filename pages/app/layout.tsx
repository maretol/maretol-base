import React from 'react'
import type { Metadata, Viewport } from 'next'
import { M_PLUS_1, SUSE } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import Script from 'next/script'
import { getEnv, getHostname, getLocalEnv } from '@/lib/env'
import { getDefaultOGPImageURL, getOGPImageURL } from '@/lib/image'
import { getClarityID } from '@/lib/api/secrets'

const fontMPlus1 = M_PLUS_1({
  subsets: ['latin'],
  variable: '--font-mplus1',
  display: 'swap',
  preload: false,
})

const fontSuse = SUSE({
  subsets: ['latin'],
  variable: '--font-suse',
  display: 'swap',
  preload: false,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
}

export const metadata: Metadata = {
  title: 'Maretol Base',
  description: 'Maretolのホームページ',
  twitter: {
    title: 'Maretol Base',
    description: 'Maretolのホームページ | トップページ',
    card: 'summary',
    creator: '@maretol',
    site: '@maretol',
    images: [getOGPImageURL(getDefaultOGPImageURL())],
  },
  openGraph: {
    title: 'Maretol Base',
    description: 'Maretolのホームページ | トップページ',
    type: 'website',
    url: getHostname(),
    siteName: 'Maretol Base',
    images: [getOGPImageURL(getDefaultOGPImageURL())],
  },
}

export default async function RootLayout({ children, drawer }: { children: React.ReactNode; drawer: React.ReactNode }) {
  const isPrd = getLocalEnv() !== 'local' && getEnv() !== 'STG'
  const clarityID = await getClarityID()

  return (
    <html lang="ja" prefix="og: http://ogp.me/ns#">
      <Script
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "e7ad45139e61492b95a8686432f438e4"}'
      />
      <Script type="text/javascript">
        {isPrd &&
          clarityID &&
          `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityID}");
              `}
      </Script>
      <body
        className={cn(
          'min-h-screen antialiased bg-gray-300',
          fontMPlus1.className,
          fontMPlus1.variable,
          fontSuse.variable
        )}
      >
        {children}
        <div>{drawer}</div>
      </body>
    </html>
  )
}
