import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.maretol.xyz'],
  },
  webpack: (config, option) => {
    if (!option.dev && process.env.LOCAL !== 'local') {
      config.externals.push({
        'cms-data-fetcher': 'cms-data-fetcher',
        'ogp-data-fetcher': 'ogp-data-fetcher',
      })
    }
    return config
  },
}

if (process.env.NODE_ENV === 'development') {
  await initOpenNextCloudflareForDev()
}

export default nextConfig
