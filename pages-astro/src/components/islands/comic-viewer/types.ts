// ビューワに渡す漫画の情報。Astro のページ（pages/comics/[id].astro）が bandeDessineeResult から作る。
// island の props は JSON になるので、必要なものだけを平らにして渡す
export type ComicViewerData = {
  id: string
  // ページの画像の置き場所（contents_url から index.json を除いたもの）
  baseURL: string
  filename: string
  firstPage: number
  lastPage: number
  format: string
  cover: string | null
  backCover: string | null
  // 本文 1 ページ目が見開きのどちら側か
  firstLeftRight: 'left' | 'right'
  // シリーズ作品のときだけ末尾に案内を出す。nextID は配信側で公開済みの巻に限られている
  seriesID: string | null
  nextID: string | null
}

export type ViewMode = 'single' | 'double'

// 末尾の案内スライドの内容。シリーズ作品のときだけ作られ、nextID が null なら「現在の最新話」の案内になる
export type SeriesGuide = {
  seriesID: string
  nextID: string | null
}

// 1 スライド分の状態
// id: モード間で共通の論理ページ ID。モード切替時の表示位置の復元と React の key に使う
// position: 見開き時の視覚上の配置。right が先に読むページ、center は表紙・裏表紙
export type PageState =
  | { kind: 'page'; id: string; position: 'left' | 'right' | 'center'; src: string }
  // 見開き整列用の空白スライド
  | { kind: 'blank'; id: string; position: 'left' | 'right' }
  // 本編の末尾に置く案内スライド（次の話へ / 現在の最新話）
  | { kind: 'guide'; id: string; position: 'right'; guide: SeriesGuide }

// ページ送り操作の付随情報
// repeat: キー押しっぱなしのリピートによる操作。通常のページ送りは連続して進めるが、末尾の案内スライドでは次の話への遷移に使わない
export type PageTurnOptions = {
  repeat?: boolean
}

export type PageTurnAction = (options?: PageTurnOptions) => void

// 閲覧者の設定。localStorage に保存する（現行サイトと同じキー・形なので、保存済みの設定を引き継ぐ）
export type ViewerSettings = {
  mode_static: boolean // モード固定
  controller_visible: boolean // ページ送りボタンを見やすくする
  controller_disabled: boolean // ページ送りボタンを非表示にする
}
