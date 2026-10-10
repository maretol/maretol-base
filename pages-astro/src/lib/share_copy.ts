// タイトルと URL をクリップボードへコピーするボタン（components/article/ShareSection.astro）の動作。
// island にせず document でクリックを受けるので、あとから差し込まれた HTML
// （islands/IllustDrawer.tsx が差し込むイラストの詳細）の中のボタンでも動く。
// ShareSection の script と drawer の island の両方から呼ばれるので、登録は 1 回にする

// コピーしたことを示す時間（ミリ秒）
const COPIED_DURATION = 1000

let installed = false

export function setupShareCopy(): void {
  if (installed) {
    return
  }
  installed = true
  document.addEventListener('click', (e) => {
    const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button[data-share-copy]') : null
    const text = button?.dataset.shareText
    if (!button || !text) {
      return
    }
    void navigator.clipboard.writeText(text)
    // コピーしたことをアイコンで示す。アイコンの切り替えは data-copied の有無で CSS が行う
    button.dataset.copied = ''
    setTimeout(() => delete button.dataset.copied, COPIED_DURATION)
  })
}
