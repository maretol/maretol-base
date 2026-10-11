import { STATUS_LABEL, statusOptions, type ContentStatus } from '@/lib/status'

type Props = {
  // 編集中の行の値。新規は undefined
  current?: ContentStatus
  // 行の published_at。これが有ると「下書き」は選べない（一度公開したものは下書きに戻せない。lib/status.ts）
  publishedAt?: string | null
  // 新規作成時の初期値
  defaultStatus?: ContentStatus
  className?: string
  children?: React.ReactNode
}

// 公開状態のセレクト。選択肢は行の状態で出し分け、意味の説明を添える。
// サーバー側でも同じ規則で検証するので（statusTransitionError）、ここは入力を楽にするための出し分け
export function StatusSelect({ current, publishedAt = null, defaultStatus = 'DRAFT', className, children }: Props) {
  const options = statusOptions(publishedAt, current)
  return (
    <div>
      <label className="block text-sm font-medium">公開状態</label>
      <select
        name="status"
        defaultValue={current ?? defaultStatus}
        className={className ?? 'mt-1 rounded-md border border-gray-300 p-2 text-sm'}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-400">
        {publishedAt
          ? '公開済みのコンテンツは下書きに戻せません。公開サイトから外すには「非公開」を選びます'
          : '下書きは公開前だけ選べます。公開したあとに公開サイトから外すには「非公開」を選びます'}
      </p>
      {children}
    </div>
  )
}
