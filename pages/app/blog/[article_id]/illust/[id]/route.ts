// ブログのイラストURLを共有した場合、イラストの詳細ページにリダイレクトする

import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const path = url.pathname

  const illustID = path.split('/')[4] // パスからイラストIDを取得
  console.log(illustID)

  // イラストの詳細ページにリダイレクト
  return Response.redirect(new URL(`/illust/detail/${illustID}`, request.url), 302)
}
