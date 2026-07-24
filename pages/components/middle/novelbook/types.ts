// 小説リーダーの表示設定の型。
// MVP では組版方向（縦書き/横書き）のみ。将来 fontSize 等を追加できる形にしておく。
export type WritingDirection = 'horizontal' | 'vertical'

export type NovelOption = {
  direction: WritingDirection
}

export const initNovelOption: NovelOption = {
  direction: 'horizontal', // 既定は横書き
}
