export type SinglePageState = {
  position: 'left' | 'right' | 'center'
  src: string
}

export type DoublePageState = {
  position: 'left' | 'right' | 'center' | 'pair'
  src: string | { left: string; right: string }
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
