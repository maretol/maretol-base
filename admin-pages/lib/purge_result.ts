// 保存後の遷移先に、公開サイト（Astro 版）のキャッシュ削除に失敗したことを付ける。
// パージの失敗は保存の失敗にせず、遷移先の画面で知らせる（astro_design.md 4.4）
export function withPurgeResult(url: string, purged: boolean): string {
  if (purged) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}purge_failed=1`
}
