// 下書きプレビュー（draftKey 付きの URL）で開いているとき、ページ内のリンクにも draftKey を引き継ぐ。
// draftKey が無ければパスをそのまま返す
export function withDraftKey(path: string, draftKey?: string | null): string {
  return draftKey ? `${path}?draftKey=${encodeURIComponent(draftKey)}` : path
}
