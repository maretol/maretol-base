// 末尾の案内スライドの内容。シリーズ作品のときだけ作られ、nextIdがnullなら「現在の最新話」の案内になる
export type SeriesGuide = {
  seriesId: string
  nextId: string | null
}

// 1スライド分の状態
// id: モード間で共通の論理ページID。モード切替時の表示位置の復元とReactのkeyに使う
// position: 見開き時の視覚上の配置。rightが先に読むページ、centerは表紙・裏表紙
export type PageState =
  | { kind: 'page'; id: string; position: 'left' | 'right' | 'center'; src: string }
  // 見開き整列用の空白スライド
  | { kind: 'blank'; id: string; position: 'left' | 'right' }
  // 本編の末尾に置く案内スライド（次の話へ / 現在の最新話）
  | { kind: 'guide'; id: string; position: 'right'; guide: SeriesGuide }

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
