// コンテンツの公開状態（blog / comic / illust / info 共通。cms_design.md の status カラム）
export type ContentStatus = 'PUBLISH' | 'DRAFT' | 'CLOSED'

export const STATUS_LABEL: Record<ContentStatus, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

const VALID_STATUS: readonly ContentStatus[] = ['PUBLISH', 'DRAFT', 'CLOSED']

export function parseStatus(value: string, fallback: ContentStatus = 'DRAFT'): ContentStatus {
  return (VALID_STATUS as readonly string[]).includes(value) ? (value as ContentStatus) : fallback
}

// 一度公開したコンテンツ（published_at あり）は下書きに戻せない（issue #1404）。
// 公開サイトから外すのは「非公開」（CLOSED）だけで、遷移は DRAFT → PUBLISH と PUBLISH ⇄ CLOSED に限る。
// 「下書き」は公開前の原稿、「非公開」は公開済みを閉じたもの、と意味を一本にするため
export function statusTransitionError(
  current: { published_at: string | null },
  next: ContentStatus
): string | undefined {
  if (current.published_at !== null && next === 'DRAFT') {
    return '一度公開したコンテンツは下書きに戻せません。公開サイトから外す場合は「非公開」を選んでください'
  }
  return undefined
}

// 公開状態のセレクトに出す選択肢。未公開（新規・published_at が null）は 公開 / 下書き、公開済みは 公開 / 非公開。
// 想定外の組み合わせの既存行（公開済みで DRAFT など）があっても編集できるよう、現在の status は常に含める
export function statusOptions(
  publishedAt: string | null | undefined,
  current: ContentStatus | undefined
): ContentStatus[] {
  const options: ContentStatus[] = publishedAt ? ['PUBLISH', 'CLOSED'] : ['PUBLISH', 'DRAFT']
  if (current && !options.includes(current)) {
    options.push(current)
  }
  return options
}
