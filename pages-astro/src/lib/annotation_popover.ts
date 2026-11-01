// 注釈のマーカー（cms-data-fetcher の parse.ts が出す sup.annotation-marker）の popover の開閉。
// マーカーのリンクは脚注（components/article/Annotations.astro）へ飛ぶ役なので、popover はクリックではなく
// ホバー（マウス・ペン）、キーボードのフォーカス、タッチの長押しで開く。閉じるのは、ホバーとフォーカスが外れたとき、
// 脚注へ飛ぶクリック、Esc、マーカー（リンクと popover）の外側のクリックやタップ。
// popover は manual にしてある。auto だと、長押しの途中で開いた popover が指を離したとき（pointerup）に
// 外側のクリックとみなされて閉じてしまうので、Esc と外側のクリックで閉じる処理はここで持つ。
// share_copy.ts と同じく document でイベントを受けるので、あとから差し込まれた HTML
// （islands/IllustDrawer.tsx が差し込むイラストの詳細）の中のマーカーでも動く。
// Annotations.astro の script と drawer の island の両方から呼ばれるので、登録は 1 回にする

// 長押しと判定するまでの時間（ミリ秒）
const LONG_PRESS_MS = 500
// 長押しの途中でここまで指が動いたらスクロールとみなして取り消す（px）
const LONG_PRESS_MOVE_LIMIT = 10
// ホバーが外れてから閉じるまでの猶予（ミリ秒）。ポインタを popover の上へ動かせるようにする（WCAG 1.4.13）
const HOVER_LEAVE_DELAY_MS = 150
// マーカーと popover の間隔（px）
const GAP = 4
// popover と画面の端の間隔（px）
const EDGE = 8

const MARKER_SELECTOR = '.annotation-marker'
const LINK_SELECTOR = `${MARKER_SELECTOR} > a`

type Rect = { top: number; bottom: number; left: number }
type Size = { width: number; height: number }

// popover を置く位置（画面に対する座標）。マーカーの左端に揃えて下に出し、下に収まらなければ上に出す。
// 左右は画面の端から EDGE だけ内側に収める
export function computePopoverPosition(anchor: Rect, popover: Size, viewport: Size): { top: number; left: number } {
  const left = Math.max(EDGE, Math.min(anchor.left, viewport.width - popover.width - EDGE))
  const below = anchor.bottom + GAP
  const fitsBelow = below + popover.height + EDGE <= viewport.height
  const top = fitsBelow ? below : Math.max(EDGE, anchor.top - GAP - popover.height)
  return { top, left }
}

function linkOf(target: EventTarget | null): HTMLAnchorElement | null {
  return target instanceof Element ? target.closest<HTMLAnchorElement>(LINK_SELECTOR) : null
}

function markerOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(MARKER_SELECTOR) : null
}

// id ではなく同じマーカーの中から探す。drawer が差し込んだ詳細と下のページで番号（id）が重なっても取り違えない
function popoverOf(link: HTMLAnchorElement): HTMLElement | null {
  return link.parentElement?.querySelector<HTMLElement>('[popover]') ?? null
}

// 開いている popover。Esc や外側のタップでブラウザが閉じることもあるので、使うときは :popover-open を確かめる
let current: HTMLElement | null = null

function place(popover: HTMLElement): void {
  const link = popover.parentElement?.querySelector('a')
  if (!link) {
    return
  }
  // 前回の位置が残っていると右端で幅が縮んだまま測ってしまうので、左上に戻してから測る
  popover.style.left = '0px'
  popover.style.top = '0px'
  const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
  const { top, left } = computePopoverPosition(link.getBoundingClientRect(), popover.getBoundingClientRect(), viewport)
  popover.style.left = `${left}px`
  popover.style.top = `${top}px`
}

function show(link: HTMLAnchorElement): void {
  const popover = popoverOf(link)
  if (!popover) {
    return
  }
  // 開くのは 1 つだけ
  if (current !== popover) {
    hide()
  }
  if (!popover.matches(':popover-open')) {
    popover.showPopover()
  }
  current = popover
  place(popover)
}

function hide(): void {
  if (current?.matches(':popover-open')) {
    current.hidePopover()
  }
  current = null
}

// 画面に対する固定の位置に置いているので、スクロールとリサイズでマーカーに追従させる
function follow(): void {
  if (current?.matches(':popover-open')) {
    place(current)
  }
}

let installed = false

export function setupAnnotationPopover(): void {
  if (installed) {
    return
  }
  installed = true
  // popover 未対応のブラウザでは何もしない。CSS が popover を隠すので、注釈文は脚注で読める
  if (typeof HTMLElement.prototype.showPopover !== 'function') {
    return
  }

  // ホバー。タッチはタップのときにも pointerover が来るので除く（脚注へ飛んだあとに開いたまま残る）
  let hideTimer: number | undefined
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch' || !markerOf(e.target)) {
      return
    }
    window.clearTimeout(hideTimer)
    const link = linkOf(e.target)
    if (link) {
      show(link)
    }
  })
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') {
      return
    }
    const marker = markerOf(e.target)
    // マーカーのリンクと popover の間の移動では閉じない
    if (!marker || (e.relatedTarget instanceof Node && marker.contains(e.relatedTarget))) {
      return
    }
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hide, HOVER_LEAVE_DELAY_MS)
  })

  // キーボードのフォーカス。マウスのクリックや脚注の ↩ で戻ったときのフォーカス（:focus-visible にならない）では開かない
  document.addEventListener('focusin', (e) => {
    const link = linkOf(e.target)
    if (link?.matches(':focus-visible')) {
      show(link)
    }
  })
  document.addEventListener('focusout', (e) => {
    if (linkOf(e.target)) {
      hide()
    }
  })

  // タッチの長押し
  let pressed: { link: HTMLAnchorElement; x: number; y: number; timer: number } | null = null
  // 長押しで開いたあとに来る click を 1 回だけ止めて、脚注へ飛ばないようにする。
  // click が来ない端末で残らないよう、次の pointerdown で必ず戻す
  let suppressClick = false
  const cancelPress = () => {
    if (!pressed) {
      return
    }
    window.clearTimeout(pressed.timer)
    pressed = null
  }
  const completePress = () => {
    if (!pressed) {
      return
    }
    const { link } = pressed
    cancelPress()
    suppressClick = true
    show(link)
  }
  document.addEventListener('pointerdown', (e) => {
    suppressClick = false
    cancelPress()
    // マーカー（リンクと popover）の外側を押したら閉じる
    if (current && !current.parentElement?.contains(e.target instanceof Node ? e.target : null)) {
      hide()
    }
    const link = linkOf(e.target)
    if (!link || e.pointerType !== 'touch') {
      return
    }
    pressed = { link, x: e.clientX, y: e.clientY, timer: window.setTimeout(completePress, LONG_PRESS_MS) }
  })
  document.addEventListener('pointermove', (e) => {
    if (pressed && Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > LONG_PRESS_MOVE_LIMIT) {
      cancelPress()
    }
  })
  document.addEventListener('pointerup', cancelPress)
  document.addEventListener('pointercancel', cancelPress)
  // Android はリンクの長押しでコンテキストメニューを出す。長押しの途中なら代わりに popover を開く
  document.addEventListener('contextmenu', (e) => {
    if (!pressed || linkOf(e.target) !== pressed.link) {
      return
    }
    e.preventDefault()
    completePress()
  })

  document.addEventListener('click', (e) => {
    if (!linkOf(e.target)) {
      return
    }
    if (suppressClick) {
      suppressClick = false
      e.preventDefault()
      return
    }
    // 脚注へ飛ぶので閉じる（キーボードの Enter では pointer のイベントが来ない）
    hide()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide()
    }
  })

  document.addEventListener('scroll', follow, { capture: true, passive: true })
  window.addEventListener('resize', follow)
}
