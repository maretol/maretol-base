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
