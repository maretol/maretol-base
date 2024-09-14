import { unstable_noStore } from 'next/cache'

export function getTimeNoCache() {
  unstable_noStore()
  return new Date().toISOString()
}

export function getTime() {
  return new Date().toISOString()
}
