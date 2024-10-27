import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.maretol.xyz'],
  },
  webpack: (config, option) => {
    if (!option.dev) {
      config.externals.push({
        'cms-data-fetcher': 'cms-data-fetcher',
        'ogp-data-fetcher': 'ogp-data-fetcher',
      })
    }
    return config
  },
}

if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform()
}

export default nextConfig
