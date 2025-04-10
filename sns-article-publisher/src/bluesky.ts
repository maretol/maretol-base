import { AtpAgent } from '@atproto/api'

type BlueSkyAuthInfo = {
  username: string
  password: string
}

async function PostBlueSky(authInfo: BlueSkyAuthInfo, post: string): Promise<void> {
  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

  console.log(authInfo)
  await agent.login({ identifier: authInfo.username, password: authInfo.password })
  await agent.post({
    text: post,
    visibility: 'public',
  })

  console.log(`BlueSky post: ${post}`)
}

export default PostBlueSky

export { BlueSkyAuthInfo }
