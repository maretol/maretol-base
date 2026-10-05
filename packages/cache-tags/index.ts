// 公開サイト（pages-astro）がレスポンスに付ける Cache-Tag と、admin-pages が保存時・手動パージでパージするタグの対応。
// 付ける側とパージする側でタグの文字列がずれると「パージは成功したのに消えない」状態になるため、両方がここを参照する。
// 設計は astro_design.md の 4.2（タグ）と 4.3（保存操作・手動パージとパージするタグ）

export const cacheTag = {
  // 全ページ。固定文言など共通要素の変更時にパージする
  layout: 'layout',
  // ブログ系の全ページ
  blog: 'blog',
  // 記事の一覧を含むページと、前後記事を表示する記事詳細
  blogList: 'list:blog',
  post: (articleID: string) => `post:${articleID}`,
  tag: (tagID: string) => `tag:${tagID}`,
  // about / contact / secret
  info: 'info',
  comicList: 'list:comics',
  comic: (comicID: string) => `comic:${comicID}`,
  series: (seriesID: string) => `series:${seriesID}`,
  illustList: 'list:illust',
  illust: (illustID: string) => `illust:${illustID}`,
} as const

// admin の保存操作ごとにパージするタグ
export const purgeTags = {
  // 記事詳細は前後記事を表示するので list:blog を持つ。記事を保存するとブログ系はほぼ全ページが対象になる
  blogContent: (articleID: string) => [cacheTag.post(articleID), cacheTag.blogList],
  blogTags: () => [cacheTag.blog],
  info: () => [cacheTag.info],
  static: () => [cacheTag.layout],
  comic: (comicID: string) => [cacheTag.comic(comicID), cacheTag.comicList],
  illust: (illustID: string) => [cacheTag.illust(illustID), cacheTag.illustList],
}

// admin の手動パージ（キャッシュ管理のページ）で、グループごとにパージするタグ。
// 保存時より粗く、種類ごとにまとめて消す（保存時のパージに失敗したときの回復と、D1 を直接編集したあとの反映に使う）。
// ページに付けるタグを変えたら、ここのタグがそのページに届くかを確かめる
export const manualPurgeTags = {
  // イラストカードや漫画カードを埋め込んだページにも、list:illust / list:comics を付けている
  illust: () => [cacheTag.illustList],
  comic: () => [cacheTag.comicList],
  blog: () => [cacheTag.blog],
  // タグ・info・固定文言。固定文言は全ページに出るので、全ページを対象にする
  blogMeta: () => [cacheTag.layout],
  all: () => [cacheTag.layout],
}

// パージの結果。レート制限などで失敗しても例外にはならず success: false になる
export type PurgeResult = { success: boolean; errors: { code: number; message: string }[] }

// 公開サイトの default entrypoint が持つ RPC メソッド。admin-pages が Service Binding 経由で呼ぶ（astro_design.md 4.4）
export interface PurgeRPC {
  purgeTags(tags: string[]): Promise<PurgeResult>
}
