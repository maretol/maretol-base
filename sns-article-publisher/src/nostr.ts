import { finalizeEvent, verifyEvent } from 'nostr-tools/pure'
import { nip19, SimplePool } from 'nostr-tools'
import type { Event } from 'nostr-tools/pure'

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
    throw new Error('Nostr event verification failed')
  }

  console.log(kind1)
  const pool = new SimplePool()
  try {
    await publishToRelays(pool, postRelays, kind1)
  } finally {
    pool.close(postRelays)
    pool.destroy()
  }
}

// リレーごとの publish は接続失敗・タイムアウト・OK=false で reject する
// Promise.all で待つと最初の 1 件の reject で抜けて finally が全接続を閉じ、
// まだ OK を待っている他リレーへの送信まで中断されるため、allSettled で全リレーの結果を待つ
async function publishToRelays(pool: Pick<SimplePool, 'publish'>, relays: string[], event: Event) {
  const results = await Promise.allSettled(pool.publish(relays, event))

  let successCount = 0
  results.forEach((result, i) => {
    const relay = relays[i]
    if (result.status === 'fulfilled') {
      successCount++
      // resolve 値はリレーからの OK メッセージの理由(通常は空文字)
      console.log(`Published to ${relay}${result.value ? `: ${result.value}` : ''}`)
    } else {
      console.error(`Failed to publish to ${relay}:`, result.reason)
    }
  })

  if (successCount === 0) {
    throw new Error(`Failed to publish to all ${relays.length} nostr relays`)
  }
  console.log(`Published to ${successCount}/${relays.length} nostr relays`)
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

export { publishToRelays }
export type { NostrAuthInfo }
