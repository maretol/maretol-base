import { STATUS_LABEL, statusOptions, type ContentStatus } from '@/lib/status'

type Props = {
  // 編集中の行の status。新規は undefined
  current?: ContentStatus
  // 新規作成時の初期値
  defaultStatus?: ContentStatus
  className?: string
  children?: React.ReactNode
}

// 公開状態のセレクト。選択肢は保存前の行の status から遷移できるものだけにし、意味の説明を添える。
// サーバー側でも同じ規則で検証するので（statusTransitionError）、ここは入力を楽にするための出し分け
export function StatusSelect({ current, defaultStatus = 'DRAFT', className, children }: Props) {
  const options = statusOptions(current)
  const unpublished = current === undefined || current === 'DRAFT'
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
        {unpublished
          ? '下書きは公開前だけ選べます。公開したあとに公開サイトから外すには「非公開」を選びます'
          : '公開済みのコンテンツは下書きに戻せません。公開サイトから外すには「非公開」を選びます'}
      </p>
      {children}
    </div>
  )
}
