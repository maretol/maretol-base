import { getCloudflareContext } from '@opennextjs/cloudflare'
import { SNSPostForm } from './sns-form'

export const dynamic = 'force-dynamic'

export default async function SNSPost() {
  const { env } = await getCloudflareContext({ async: true })
  const enabled = env.SNS_NOTIFY_ENABLED === 'true'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SNS投稿</h1>
        <p className="mt-1 text-sm text-gray-500">
          連携済みのSNS（Twitter/X・Bluesky・Misskey・Nostr）へ同じ文面をそのまま投稿します。URLの組み立てやUTMパラメータの付与は行いません
        </p>
      </div>

      {!enabled && (
        <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          この環境ではSNS投稿が無効化されています（SNS_NOTIFY_ENABLED が true
          ではありません）。送信してもSNSには投稿されません
        </p>
      )}

      <SNSPostForm />
    </div>
  )
}
