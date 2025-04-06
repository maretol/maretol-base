import crypto from 'node:crypto'

type NostrAuthInfo = {
  privateKey: string
  publicKey: string
}

async function PostNostrKind1(authInfo: NostrAuthInfo, message: string) {
  const postRelays = [
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://yabu.me',
    'wss://r.kojira.io',
    'wss://nrelay-jp.c-stellar.net',
    'wss://nostr.fediverse.jp',
  ]

  const pubKey = authInfo.publicKey
  const createdAt = Math.floor(Date.now() / 1000)
  const idBase = [0, pubKey.toLowerCase(), createdAt, 1, [], message]

  const signer = crypto.createHash('sha256')
  const id = signer.update(JSON.stringify(idBase)).digest('hex')

  const kind1 = {
    content: message,
    kind: 1,
    tags: [],
    created_at: createdAt,
    pubkey: authInfo.publicKey,
    id: id,
    sig: 'your_signature_here',
  }

  const sockets = postRelays.map((url) => new WebSocket(url))
  sockets.forEach((socket) => {
    socket.send('kind:1')
    socket.close()
  })
}
