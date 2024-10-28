import React from 'react'
import type { Metadata, Viewport } from 'next'
import { M_PLUS_1 } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import FooterButtons from '@/components/small/footer'
import HeaderButtons from '@/components/small/header'
import Script from 'next/script'
import { getHostname } from '@/lib/env'
import { getHeaderImage, getOGPImage } from '@/lib/image'
import ClientImage from '@/components/small/client_image'

export const runtime = 'edge'

const fontMPlus1 = M_PLUS_1({
  subsets: ['latin'],
  variable: '--font-mplus1',
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
    images: [getOGPImage()],
  },
  openGraph: {
    title: 'Maretol Base',
    description: 'Maretolのホームページ | トップページ',
    type: 'website',
    url: getHostname(),
    siteName: 'Maretol Base',
    images: [getOGPImage()],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerImage = getHeaderImage()

  return (
    <html lang="ja" prefix="og: http://ogp.me/ns#">
      <Script
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "e7ad45139e61492b95a8686432f438e4"}'
      />
      <body
        className={cn('min-h-screen bg-background antialiased bg-gray-300', fontMPlus1.className, fontMPlus1.variable)}
      >
        <div className="flex justify-center pb-10" id="top">
          <div className="max-w-[1500px] w-full sm:mx-6">
            <div className="my-10">
              <div className="mb-2 pt-2">
                <Button variant={'link'} className="p-0" asChild>
                  <Link href="/">
                    <ClientImage src={headerImage} width={500} height={200} alt="Maretol Base" />
                  </Link>
                </Button>
              </div>
              <HeaderButtons />
            </div>
            {children}
            <div className="my-10">
              <footer className="text-center text-sm text-gray-500">
                <FooterButtons />
                <div>
                  © 2024 Maretol
                  <br />
                  DO NOT REPOST WITHOUT PERMISSION
                </div>
              </footer>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
