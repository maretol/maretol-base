import React from 'react'
import type { Metadata, Viewport } from 'next'
import { M_PLUS_1, SUSE } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import Script from 'next/script'
import { getHostname } from '@/lib/env'
import { getDefaultOGPImageURL, getOGPImageURL } from '@/lib/image'

const fontMPlus1 = M_PLUS_1({
  subsets: ['latin'],
  variable: '--font-mplus1',
  display: 'swap',
  preload: false,
})

export const fontTitle = SUSE({
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
  return (
    <html lang="ja" prefix="og: http://ogp.me/ns#">
      <Script
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "e7ad45139e61492b95a8686432f438e4"}'
      />
      <body
        className={cn(
          'min-h-screen antialiased bg-gray-300',
          fontMPlus1.className,
          fontMPlus1.variable,
          fontTitle.variable
        )}
      >
        {children}
        <div>{drawer}</div>
      </body>
    </html>
  )
}
