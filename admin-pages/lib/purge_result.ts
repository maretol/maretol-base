// 保存後の遷移先に、公開サイト（Astro 版）のキャッシュ削除に失敗したことを付ける。
// パージの失敗は保存の失敗にせず、遷移先の画面で知らせる（astro_design.md 4.4）
export function withPurgeResult(url: string, purged: boolean): string {
  if (purged) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}purge_failed=1`
}

// 新規作成後の遷移先（作成したコンテンツの編集ページ）。作成したこと・付随処理の報告（info）と警告（warning）・
// パージの結果をクエリで渡し、編集ページが保存結果の初期状態を組み立てる（lib/form-state.ts の SaveActionState）
export function createdURL(editPath: string, result: { purged: boolean; info?: string; warning?: string }): string {
  const params = new URLSearchParams({ saved: '1' })
  if (result.info) {
    params.set('info', result.info)
  }
  if (result.warning) {
    params.set('warning', result.warning)
  }
  return withPurgeResult(`${editPath}?${params}`, result.purged)
}
