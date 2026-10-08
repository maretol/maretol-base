import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { LoaderCircleIcon } from 'lucide-react'
import { getIllustIDFromPath, ILLUST_LIST_PATH, ILLUST_LIST_TITLE } from '@/lib/illust'
import { setupShareCopy } from '@/lib/share_copy'

// イラストの drawer。一覧や記事の上に重ねて表示し、URL も詳細の URL（/illust/detail/{id}）に変える（astro_design.md 決定 13）。
// - 詳細へのリンクのクリックを横取りし、pushState で URL を変えて開く。中身は詳細ページを取得し、
//   その中の [data-illust-detail] の要素を差し込む
// - 開いているかどうかは URL だけで決める。閉じる操作は、このドキュメントで履歴を進めていれば history.back()、
//   詳細の URL を直接開いていれば（再読み込みを含む）一覧の URL への pushState。drawer は別のページとして扱うので、
//   閉じたあとの戻るで開き直す。戻る・進むでも閉じたり開き直したりする
// - 詳細の URL を直接開いたとき（JS が動く前を含む）は、サーバーが描画した中身（children）を固定の枠で出し、
//   hydration 後に同じ中身をアニメーションなしで drawer に移す。閉じる途中は直前の中身を出し続ける
// - URL の形（/illust/detail/{id}）は lib/illust.ts で決める。末尾のスラッシュは Worker が 301 で外すので、ここに届く URL は正規形

// 自分で pushState した履歴の印。閉じるときに history.back() でよいかの判定に使う。
// 値はドキュメントごとに変える。pushState で開いたあとに再読み込みすると history.state は残るが、その履歴は前のドキュメントが
// 積んだもので、戻る先は一覧とは限らない（記事やトップから開いた場合）。印が自分のものでなければ直接開いたときと同じ扱いにする
const STATE_KEY = 'illustDrawer'
const DOCUMENT_TOKEN = Math.random().toString(36).slice(2)
const FRAGMENT_SELECTOR = '[data-illust-detail]'
// 中身にある閉じるボタン（JS が動かないときのために一覧へのリンクになっている）
const CLOSE_SELECTOR = 'a[data-illust-drawer-close]'
// drawer で開かずに通常の遷移にするリンク
const NO_DRAWER_ATTRIBUTE = 'data-no-drawer'

// 固定の枠と drawer で同じ見た目にする
const PANEL_CLASS = 'fixed inset-y-0 right-0 z-50 flex h-auto w-full flex-col border-l bg-gray-100 md:w-3/4'
const OVERLAY_CLASS = 'fixed inset-0 z-50 bg-black/50'
const LINK_BUTTON_CLASS =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80'

type Fragment =
  { status: 'loading' } | { status: 'loaded'; html: string; title: string } | { status: 'error'; href: string }
type Snapshot = {
  // 開いているイラストの ID。URL が詳細の URL のときだけ開いているとみなす
  openID: string | null
  // drawer に出す中身の ID。閉じる途中（openID は null）も、閉じるアニメーションの間は直前の中身を出し続ける
  contentID: string | null
  // contentID の中身
  fragment: Fragment | null
  // このドキュメントで一度でも閉じたか。詳細の URL を直接開いたときの最初の表示にだけアニメーションを付けないために使う
  closedOnce: boolean
}

// 取得した詳細。ページを離れるまで持つ
const fragments = new Map<string, Fragment>()
const listeners = new Set<() => void>()
let snapshot: Snapshot | null = null
let lastOpenID: string | null = null
let closedOnce = false
const serverSnapshots = new Map<string | null, Snapshot>()

// 開いているイラストの ID。URL が詳細の URL のときだけ開いているとみなす
function getOpenID(): string | null {
  return getIllustIDFromPath(location.pathname)
}

function computeSnapshot(): Snapshot {
  const openID = getOpenID()
  if (openID === null) {
    closedOnce = true
  } else {
    lastOpenID = openID
  }
  const contentID = openID ?? lastOpenID
  return { openID, contentID, fragment: contentID ? (fragments.get(contentID) ?? null) : null, closedOnce }
}

function getSnapshot(): Snapshot {
  return (snapshot ??= computeSnapshot())
}

// サーバーと hydration では、詳細の URL を直接開いたときだけ開いた状態にする。同じ値を返し続ける必要があるので ID ごとに持つ
function getServerSnapshot(initialID: string | null): Snapshot {
  let cached = serverSnapshots.get(initialID)
  if (!cached) {
    cached = { openID: initialID, contentID: initialID, fragment: null, closedOnce: false }
    serverSnapshots.set(initialID, cached)
  }
  return cached
}

function notify(): void {
  snapshot = computeSnapshot()
  for (const listener of listeners) {
    listener()
  }
}

// 詳細ページを取得し、drawer に差し込む部分を取り出す
async function loadFragment(id: string, href: string): Promise<void> {
  fragments.set(id, { status: 'loading' })
  notify()
  try {
    const response = await fetch(href, { headers: { Accept: 'text/html' } })
    if (!response.ok) {
      throw new Error(`status ${response.status}`)
    }
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
    const detail = doc.querySelector<HTMLElement>(FRAGMENT_SELECTOR)
    if (!detail) {
      throw new Error('fragment not found')
    }
    fragments.set(id, { status: 'loaded', html: detail.outerHTML, title: detail.dataset.title ?? '' })
  } catch (e) {
    console.error('[islands/IllustDrawer.tsx] fetch failed:', href, e)
    fragments.set(id, { status: 'error', href })
  }
  notify()
}

// 取得済みならそのまま開き、まだなら（失敗していれば取り直して）開く。サーバーが描画した中身を使う ID は取得しない
function openFragment(id: string, href: string, initialID: string | null): void {
  const fragment = fragments.get(id)
  if (id !== initialID && (!fragment || fragment.status === 'error')) {
    void loadFragment(id, href)
  } else {
    notify()
  }
}

// 閉じている途中（history.back() を呼んでから popstate が届くまで）かどうか。
// この間は URL がまだ変わらず drawer も開いたままなので、Esc の連打などで履歴を 2 つ戻らないようにする
let closing = false

function closeDrawer(): void {
  if (closing) {
    return
  }
  if (history.state?.[STATE_KEY] === DOCUMENT_TOKEN) {
    closing = true
    history.back()
    return
  }
  // 詳細の URL を直接開いたとき（再読み込みを含む）は、戻る先が一覧ではないので、一覧の URL へ進んで閉じる。
  // JS が動かないときの閉じるボタン（一覧へのリンク）と同じく履歴が 1 つ増え、戻ると詳細が開き直す
  history.pushState(null, '', ILLUST_LIST_PATH)
  notify()
}

// 詳細へのリンクのクリックと、戻る・進むを購読する。どちらも URL（開いているかどうか）を変えるので、変わったことを React に知らせる
function subscribeStore(onChange: () => void, initialID: string | null): () => void {
  // 閉じたあとの title。詳細の URL を直接開いたページは一覧の URL になるので一覧の title にする
  const closedTitle = initialID === null ? document.title : ILLUST_LIST_TITLE
  const listener = () => {
    onChange()
    const { openID, fragment } = getSnapshot()
    if (openID === null) {
      document.title = closedTitle
    } else if (fragment?.status === 'loaded') {
      document.title = fragment.title
    }
  }
  const onClick = (e: MouseEvent) => {
    // 新しいタブで開く操作などはブラウザに任せる
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }
    const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || (link.target && link.target !== '_self') || link.origin !== location.origin) {
      return
    }
    if (link.matches(CLOSE_SELECTOR)) {
      e.preventDefault()
      closeDrawer()
      return
    }
    const id = getIllustIDFromPath(link.pathname)
    // ページ内のアンカー（注釈など）は横取りしない
    if (!id || link.hash || link.hasAttribute(NO_DRAWER_ATTRIBUTE)) {
      return
    }
    e.preventDefault()
    history.pushState({ [STATE_KEY]: DOCUMENT_TOKEN }, '', link.href)
    openFragment(id, link.pathname + link.search, initialID)
  }
  const onPopState = () => {
    closing = false
    const id = getOpenID()
    if (id) {
      openFragment(id, location.pathname + location.search, initialID)
      return
    }
    // 詳細の URL を直接開いたページが描画できるのは、詳細と一覧（背景の 1 ページ目）だけ。
    // 再読み込みの前に別のページ（記事やトップ）から pushState で開いていた場合、Chrome はその履歴もこのドキュメントの
    // ものとして扱い、戻るとページを描き直さずに URL だけが変わる。そのときは、その URL のページを読み込み直す
    if (initialID !== null && location.pathname + location.search !== ILLUST_LIST_PATH) {
      location.reload()
      return
    }
    notify()
  }
  // bfcache から復元されたときも閉じる途中の印を戻す。history.back() が別のドキュメントへの遷移になった場合、
  // 進むで戻ってくるとこのページは bfcache から復元されて popstate が届かず、closing が立ったまま閉じられなくなる
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) {
      closing = false
    }
  }
  listeners.add(listener)
  document.addEventListener('click', onClick)
  window.addEventListener('popstate', onPopState)
  window.addEventListener('pageshow', onPageShow)
  // 中身にあるコピーのボタンを動かす（components/article/ShareSection.astro）
  setupShareCopy()
  return () => {
    listeners.delete(listener)
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onPopState)
    window.removeEventListener('pageshow', onPageShow)
  }
}

function subscribeNothing(): () => void {
  return () => {}
}

type Props = {
  // 詳細の URL を直接開いたときの、そのイラストの ID。children にサーバーが描画した詳細が入る
  initialID?: string | null
  children?: ReactNode
}

export default function IllustDrawer({ initialID = null, children }: Props) {
  const subscribe = useCallback((onChange: () => void) => subscribeStore(onChange, initialID), [initialID])
  const { openID, contentID, fragment, closedOnce } = useSyncExternalStore(subscribe, getSnapshot, () =>
    getServerSnapshot(initialID),
  )
  // hydration が終わるまでは、サーバーと同じ固定の枠を出す（drawer の中身は portal で描画されるので、サーバーでは描画されない）
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

  if (!hydrated) {
    return initialID === null ? null : (
      <>
        <div className={OVERLAY_CLASS} />
        <div className={PANEL_CLASS}>
          <div className="overflow-auto">{children}</div>
        </div>
      </>
    )
  }

  const content =
    contentID === initialID ? (
      children
    ) : fragment?.status === 'loaded' ? (
      <div dangerouslySetInnerHTML={{ __html: fragment.html }} />
    ) : fragment?.status === 'error' ? (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <p>イラストを取得できませんでした</p>
        <a href={fragment.href} className={LINK_BUTTON_CLASS} {...{ [NO_DRAWER_ATTRIBUTE]: '' }}>
          詳細ページを開く
        </a>
        <a href={ILLUST_LIST_PATH} className={LINK_BUTTON_CLASS} data-illust-drawer-close>
          閉じる
        </a>
      </div>
    ) : (
      <div className="flex h-dvh items-center justify-center">
        <LoaderCircleIcon className="h-12 w-12 animate-spin text-gray-500" aria-label="読み込み中" />
      </div>
    )

  // 詳細の URL を直接開いたときは、固定の枠から drawer への切り替えなので、最初の表示には開くアニメーションを付けない。
  // vaul の defaultOpen は使わない。defaultOpen は data-vaul-animate="false"（animation: none）で開くアニメーションを止めるが、
  // 再有効化が ref の書き換えだけで DOM の属性は次の再描画まで変わらず、最初の pointerdown（isDragging の更新）の再描画で
  // 属性が true になった瞬間に、止めていた開くアニメーションが走る（閉じ位置へ飛んでから開き直す）。属性はここで決めて渡す
  const animate = closedOnce || initialID === null ? 'true' : 'false'

  return (
    <Drawer.Root direction="right" open={openID !== null} onOpenChange={(open) => !open && closeDrawer()}>
      <Drawer.Portal>
        <Drawer.Overlay className={OVERLAY_CLASS} data-vaul-animate={animate} />
        {/* 中身の説明文は無いので Description は置かない。aria-describedby を外して Radix の警告を止める */}
        <Drawer.Content
          className={`${PANEL_CLASS} outline-none`}
          aria-describedby={undefined}
          data-vaul-animate={animate}
        >
          <Drawer.Title className="sr-only">イラストの詳細</Drawer.Title>
          <div className="overflow-auto">{content}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
