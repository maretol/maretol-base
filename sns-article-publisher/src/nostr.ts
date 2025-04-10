import { finalizeEvent, verifyEvent } from 'nostr-tools/pure'
import { nip19, SimplePool } from 'nostr-tools'

type NostrAuthInfo = {
  nsec: string
}

async function PostNostrKind1(authInfo: NostrAuthInfo, message: string) {
  const secretKey = parseNsec(authInfo.nsec)
  const postRelays = getRelays()

  const kind1 = finalizeEvent(
    {
      content: message,
      kind: 1,
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    },
    secretKey
  )

  const isGood = verifyEvent(kind1)
  if (!isGood) {
    console.error('Event verification failed')
    return
  }

  console.log(kind1)
  const pool = new SimplePool()
  try {
    await Promise.all(
      pool.publish(postRelays, kind1).map(async (p) => {
        const result = await p
        if (result !== '' && result !== undefined) {
          console.error(result)
        }
      })
    )
  } catch (error) {
    console.error('Error publishing to relays:', error)
  } finally {
    pool.close(postRelays)
    pool.destroy()
  }
}

function getRelays() {
  return [
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://yabu.me',
    'wss://r.kojira.io',
    'wss://nrelay-jp.c-stellar.net',
    'wss://nostr.fediverse.jp',
  ]
}

function parseNsec(nsec: string): Uint8Array {
  const nip19Result = nip19.decode(nsec)
  if (!nip19Result) {
    console.error('Invalid nsec')
    throw new Error('Invalid nsec')
  }
  const { data: secretKey, type } = nip19Result
  if (type !== 'nsec') {
    console.error('Invalid ntype')
    throw new Error('Invalid ntype')
  }
  return secretKey
}

export default PostNostrKind1

export { NostrAuthInfo }
