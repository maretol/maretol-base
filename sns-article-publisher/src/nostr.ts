import { finalizeEvent, type Event } from 'nostr-tools/pure'
import { nip19, SimplePool } from 'nostr-tools'

type NostrAuthInfo = {
  nsec: string
}

async function PostNostrKind1(authInfo: NostrAuthInfo, message: string) {
  const secretKey = parseNsec(authInfo.nsec)
  const postRelays = getRelays()

  // finalizeEvent が同じ鍵で署名するので verifyEvent による再検証はしない
  const kind1 = finalizeEvent(
    {
      content: message,
      kind: 1,
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    },
    secretKey
  )

  console.log(kind1)
  const pool = new SimplePool()
  try {
    await publishToRelays(pool, postRelays, kind1)
  } finally {
    // destroy が全リレー接続を close する
    pool.destroy()
  }
}

// リレーごとの publish は接続失敗・タイムアウト・OK=false で reject する
// Promise.all で待つと最初の 1 件の reject で抜けて finally が全接続を閉じ、
// まだ OK を待っている他リレーへの送信まで中断されるため、allSettled で全リレーの結果を待つ
async function publishToRelays(pool: Pick<SimplePool, 'publish'>, relays: string[], event: Event) {
  if (relays.length === 0) {
    throw new Error('No nostr relays configured')
  }

  const results = await Promise.allSettled(pool.publish(relays, event))

  const failures: string[] = []
  results.forEach((result, i) => {
    const relay = relays[i]
    if (result.status === 'fulfilled') {
      // resolve 値はリレーからの OK メッセージの理由(通常は空文字)
      console.log(`Published to ${relay}${result.value ? `: ${result.value}` : ''}`)
    } else {
      console.error(`Failed to publish to ${relay}:`, result.reason)
      failures.push(`${relay}: ${formatReason(result.reason)}`)
    }
  })

  const successCount = relays.length - failures.length
  if (successCount === 0) {
    // 呼び出し側(postText の結果など)で原因が分かるよう、リレーごとの理由をメッセージに含める
    throw new Error(`Failed to publish to all ${relays.length} nostr relays (${failures.join(', ')})`)
  }
  console.log(`Published to ${successCount}/${relays.length} nostr relays`)
}

function formatReason(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
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
    throw new Error('Invalid nsec')
  }
  const { data: secretKey, type } = nip19Result
  if (type !== 'nsec') {
    throw new Error('Invalid ntype')
  }
  return secretKey
}

export default PostNostrKind1

export { publishToRelays }
export type { NostrAuthInfo }
