import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.maretol.xyz'],
  },
}

if (process.env.NODE_ENV === 'development') {
  await initOpenNextCloudflareForDev()
}

export default nextConfig
