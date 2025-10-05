/**
 * Next.jsのインターセプティングルート（Intercepting Routes）用のdrawerファイル
 * @see https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes
 *
 * (.)detail/[id] は同階層の detail/[id] ルートをインターセプトする設定。
 * イラスト一覧ページ(/illust)からイラスト詳細へ遷移する際に、
 * ページ全体を遷移せずdrawerで表示するために使用。
 *
 * 実装は共通コンポーネントを再エクスポートすることで重複を避けている。
 */
import IllustDrawerClient from '@/components/drawers/illust-drawer-client'

export default IllustDrawerClient
