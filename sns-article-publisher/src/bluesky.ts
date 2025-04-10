import { AtpAgent, RichText } from '@atproto/api'

type BlueSkyAuthInfo = {
  username: string
  password: string
}

async function PostBlueSky(authInfo: BlueSkyAuthInfo, post: string): Promise<void> {
  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

  const richText = new RichText({ text: post })
  await richText.detectFacets(agent)

  await agent.login({ identifier: authInfo.username, password: authInfo.password })
  await agent.post({
    text: richText.text,
    facets: richText.facets,
  })

  console.log(`BlueSky post: ${post}`)
}

export default PostBlueSky

export { BlueSkyAuthInfo }
