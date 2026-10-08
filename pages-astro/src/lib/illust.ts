// イラストの画像のどこを切り出して見せるか（object_position）に対応する class。
// Tailwind が検出できるよう、class は文字列のまま持つ
const objectPositionClass: Record<string, string> = {
  left: 'object-left',
  right: 'object-right',
  top: 'object-top',
  bottom: 'object-bottom',
  center: 'object-center',
}

export function getObjectPositionClass(objectPosition: string): string {
  return objectPositionClass[objectPosition] ?? 'object-center'
}

// イラストの一覧と詳細のページの title。
// drawer の island（ブラウザ側）も document.title に使うので、lib/site.ts（cloudflare:workers に依存する）ではなくここに置く
export const ILLUST_LIST_TITLE = 'Illustrations | Maretol Base'

export function getIllustDetailTitle(title: string): string {
  return `Illustration: ${title} | Maretol Base`
}

// イラストの一覧と詳細のパス。詳細の URL を組み立てる側（カード・サイドバー・共有 URL）と、
// URL から開いているイラストの ID を読む側（drawer の island）で、URL の形をここだけで決める。
// 末尾のスラッシュは astro.config.ts の trailingSlash で付かない形に揃えているので、ここでは受け付けない
export const ILLUST_LIST_PATH = '/illust'
const ILLUST_DETAIL_PATH = /^\/illust\/detail\/([^/]+)$/

export function illustDetailPath(illustID: string): string {
  return `${ILLUST_LIST_PATH}/detail/${illustID}`
}

export function getIllustIDFromPath(pathname: string): string | null {
  return pathname.match(ILLUST_DETAIL_PATH)?.[1] ?? null
}
