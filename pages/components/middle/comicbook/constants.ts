/**
 * ゾーン検出の比率定数
 * マウス位置によるページ送りゾーンの境界を定義
 */
export const ZONE_RATIO = {
  /** 次ページゾーンの境界（左から1/3） */
  NEXT: 1 / 3,
  /** 前ページゾーンの境界（左から2/3） */
  PREV: 2 / 3,
} as const

/**
 * レイアウト高さの定数
 */
export const LAYOUT = {
  /** メインコンテナの高さ */
  MAIN_HEIGHT: 'h-[95svh]',
  /** ビューワーエリアの最大高さ */
  VIEWER_HEIGHT: 'max-h-[96%]',
  /** フッターコントローラーの高さ */
  FOOTER_HEIGHT: 'h-[4%]',
} as const

/**
 * Swiper設定の定数
 */
export const SWIPER = {
  /** 事前読み込みするスライド数（前後） */
  LAZY_PRELOAD: 4,
} as const

/**
 * LocalStorage書き込みのデバウンス時間（ミリ秒）
 */
export const DEBOUNCE_DELAY = 500
