import Link from 'next/link'
import { CACHE_GROUPS } from '@/lib/cache-groups'

type Props = {
  // 編集中のフォームの中に出すときは true。行内の小さい表示にし、キャッシュ管理は別タブで開く（遷移すると編集中の本文が消えるため）
  inline?: boolean
}

// 保存はできたが、公開サイトのキャッシュ削除に失敗したときの表示。キャッシュ管理からの手動パージで回復する
export function PurgeFailedNotice({ inline = false }: Props) {
  const message = (
    <>
      公開サイトのキャッシュ削除に失敗しました。公開サイトに反映されていない場合は、
      {inline ? (
        <a href="/cache" target="_blank" rel="noopener noreferrer" className="underline">
          キャッシュ管理
        </a>
      ) : (
        <Link href="/cache" className="underline">
          キャッシュ管理
        </Link>
      )}
      で「{CACHE_GROUPS.blog_meta.label}」をパージしてください
    </>
  )

  if (inline) {
    return <span className="text-xs text-yellow-800">{message}</span>
  }
  return <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">{message}</p>
}
