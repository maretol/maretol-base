import { SNSPostTextResult } from 'api-types'
import { SNSTarget } from './utm'

// 投稿する SNS。false のものは投稿せず、結果にも含めない（Mastodon は未対応）
const TARGET: Record<SNSTarget, boolean> = {
  twitter: true,
  bluesky: true,
  misskey: true,
  nostr: true,
}

// 1 つの SNS への投稿。run は投稿 1 回分で、失敗は reject で伝える
export type PostTask = { target: SNSTarget; run: () => Promise<unknown> }

// 有効な SNS へ並列に投稿し、SNS ごとの成否を tasks の順に返す（issue #1320）
// 4 つの SNS は互いに独立している。直列に待つと、応答しないホストが 1 つあるだけで
// waitUntil の予算（30 秒）を使い切り、残りの SNS が試行されないまま Worker が終わる
export async function postToTargets(
  tasks: PostTask[],
  enabled: Record<SNSTarget, boolean> = TARGET
): Promise<SNSPostTextResult[]> {
  const enabledTasks = tasks.filter((task) => {
    if (!enabled[task.target]) {
      console.log(`skip ${task.target}`)
      return false
    }
    return true
  })
  // 1 つの失敗で戻らず、全部の確定を待つ。waitUntil に渡した Promise が先に reject すると、
  // まだ投稿中の他の SNS を待たずに Worker が終わることがある
  const settled = await Promise.allSettled(
    enabledTasks.map(async (task) => {
      console.log(`post to ${task.target}`)
      await task.run()
    })
  )
  return settled.map((result, i) => {
    const target = enabledTasks[i].target
    if (result.status === 'fulfilled') {
      return { target, success: true }
    }
    console.error(`Error posting to ${target}:`, result.reason)
    return { target, success: false, error: errorMessage(result.reason) }
  })
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
