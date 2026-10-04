import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { getImageSources } from '@/lib/image'

// 記事画像のモーダル。記事の上に重ねて表示し、URL も画像の URL（/blog/{id}/image/{base64url}）に変える。
// - 画像のリンク（a.x-blog-image）のクリックを横取りし、pushState で URL を変えてモーダルを開く
// - 閉じる操作は履歴を 1 つ戻す。戻るボタンでも閉じ、進むボタンで開き直す
// - JS が動く前のクリックや、画像の URL を直接開いた場合は、サーバーが記事の該当画像の位置へ戻す

const LINK_SELECTOR = 'a.x-blog-image'
// 履歴の state に持たせるキー。値は画像のアンカー id（data URL は大きいので state には入れない）
const STATE_KEY = 'imageModal'
// モーダルで表示する幅（CSS px）の上限
const MODAL_WIDTH = 1920

type ModalImage = { src: string; srcSet?: string }

function imageOf(link: HTMLAnchorElement): ModalImage | null {
  // 自サイトの画像は、画面いっぱいに出せる大きさの派生を要求する
  const originalSrc = link.dataset.imageSrc
  if (originalSrc) {
    const sources = getImageSources(originalSrc, MODAL_WIDTH, {
      maxDisplayWidth: MODAL_WIDTH,
      sourceWidth: Number(link.dataset.imageWidth) || undefined,
    })
    return { src: sources.src, srcSet: sources.srcset }
  }
  // 引用画像は記事に埋め込まれている data URL をそのまま使う
  const img = link.querySelector('img')
  return img ? { src: img.currentSrc || img.src } : null
}

function findImage(anchorID: string): ModalImage | null {
  const link = document.getElementById(anchorID)?.querySelector<HTMLAnchorElement>(LINK_SELECTOR)
  return link ? imageOf(link) : null
}

export default function ImageModal() {
  const [image, setImage] = useState<ModalImage | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // 新しいタブで開く操作などはブラウザに任せる
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>(LINK_SELECTOR) : null
      const anchorID = link?.parentElement?.id
      const next = link ? imageOf(link) : null
      if (!link || !anchorID || !next) {
        return
      }
      e.preventDefault()
      history.pushState({ [STATE_KEY]: anchorID }, '', link.href)
      setImage(next)
    }
    // 戻る・進むで、履歴の state に合わせて開閉する
    const onPopState = (e: PopStateEvent) => {
      const anchorID: unknown = e.state?.[STATE_KEY]
      setImage(typeof anchorID === 'string' ? findImage(anchorID) : null)
    }
    document.addEventListener('click', onClick)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  // 閉じるときは履歴を戻す。URL が記事に戻り、popstate で実際に閉じる
  const close = () => history.back()

  return (
    <Dialog.Root open={image !== null} onOpenChange={(open) => !open && close()} modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex h-full max-h-full w-full max-w-full translate-x-[-50%] translate-y-[-50%] items-center justify-center shadow-lg duration-200">
          <Dialog.Title className="sr-only">画像</Dialog.Title>
          <Dialog.Description className="sr-only">画像を表示しています</Dialog.Description>
          <div
            className="relative flex h-full w-full items-center justify-center p-2"
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            {image && (
              <img
                src={image.src}
                srcSet={image.srcSet}
                alt=""
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            )}
          </div>
          <Dialog.Close className="absolute right-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-8 w-8" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
