/**
 * Next.jsの並列ルーティング（Parallel Routes）で必要なdefault.tsxファイル
 * @see https://nextjs.org/docs/app/building-your-application/routing/parallel-routes#defaultjs
 *
 * 並列ルートスロット（@drawer等）が定義されている場合、
 * そのスロットがアクティブでない状態でページ遷移した際に表示されるフォールバックコンポーネント。
 * 通常は何も表示しないためnullを返す。
 */
export default function Default() {
  return null
}
