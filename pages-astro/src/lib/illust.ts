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
