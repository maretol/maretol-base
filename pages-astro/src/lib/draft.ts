// 下書きプレビューの draftKey を URL のクエリから読む。無いときと空のときは undefined
export function getDraftKey(url: URL): string | undefined {
  return url.searchParams.get('draftKey') || undefined
}

// 下書きプレビュー（draftKey 付きの URL）で開いているとき、ページ内のリンクにも draftKey を引き継ぐ。
// draftKey が無ければパスをそのまま返す
export function withDraftKey(path: string, draftKey?: string | null): string {
  return draftKey ? `${path}?draftKey=${encodeURIComponent(draftKey)}` : path
}
