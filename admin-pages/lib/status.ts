// コンテンツの公開状態（blog / comic / illust / info 共通。cms_design.md の status カラム）
export type ContentStatus = 'PUBLISH' | 'DRAFT' | 'CLOSED'

export const STATUS_LABEL: Record<ContentStatus, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

const VALID_STATUS: readonly ContentStatus[] = ['PUBLISH', 'DRAFT', 'CLOSED']

// フォームの値を status にする。想定外の値は下書き扱い（公開サイトに出さない側に倒す）
export function parseStatus(value: string): ContentStatus {
  return (VALID_STATUS as readonly string[]).includes(value) ? (value as ContentStatus) : 'DRAFT'
}

// 公開状態の遷移規則（issue #1404）。保存前の行の status から、保存後に選べる status（同じ状態のまま保存するのを含む）
// - DRAFT → PUBLISH。「下書き」は公開前の原稿で、公開する前に非公開にはしない
// - PUBLISH ⇄ CLOSED。「非公開」は公開済みを閉じたもので、一度公開したコンテンツは下書きに戻せない
// 判定は status だけで行う。published_at は初公開日時の記録であって、状態の判断には使わない
const NEXT_STATUSES: Record<ContentStatus, readonly ContentStatus[]> = {
  DRAFT: ['PUBLISH', 'DRAFT'],
  PUBLISH: ['PUBLISH', 'CLOSED'],
  CLOSED: ['PUBLISH', 'CLOSED'],
}

export function statusTransitionError(current: ContentStatus, next: ContentStatus): string | undefined {
  if (NEXT_STATUSES[current].includes(next)) {
    return undefined
  }
  return next === 'DRAFT'
    ? '一度公開したコンテンツは下書きに戻せません。公開サイトから外す場合は「非公開」を選んでください'
    : '公開前のコンテンツは非公開にできません。公開するまでは「下書き」のままにしてください'
}

// 公開状態のセレクトに出す選択肢。新規（current 無し）は下書きの行と同じ 公開 / 下書き
export function statusOptions(current: ContentStatus = 'DRAFT'): readonly ContentStatus[] {
  return NEXT_STATUSES[current]
}
