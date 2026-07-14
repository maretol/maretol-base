export type PageState = {
  id: string // モード間で共通の論理ページID。モード切替時の表示位置の復元とReactのkeyに使う
  position: 'left' | 'right' | 'center' // 見開き時の視覚上の配置。rightが先に読むページ、centerは表紙・裏表紙
  src: string | null // null = 見開き整列用の空白スライド
}

export type PageOption = {
  mode_static: boolean // モード固定
  controller_visible: boolean // コントローラー表示
  controller_disabled: boolean // コントローラー無効
}

export const initPageOption: PageOption = {
  mode_static: false,
  controller_visible: false,
  controller_disabled: false,
}
