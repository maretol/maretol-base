import Link from 'next/link'
import { CACHE_GROUPS } from '@/lib/cache'

// 保存はできたが、公開サイトのキャッシュ削除に失敗したときの表示。キャッシュ管理からの手動パージで回復する
export function PurgeFailedNotice() {
  return (
    <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
      公開サイトのキャッシュ削除に失敗しました。公開サイトに反映されていない場合は、
      <Link href="/cache" className="underline">
        キャッシュ管理
      </Link>
      で「{CACHE_GROUPS.blog_meta.label}」をパージしてください
    </p>
  )
}
