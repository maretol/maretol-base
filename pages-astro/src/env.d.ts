declare namespace App {
  interface Locals {
    // 404 ページへ rewrite するときに、元のページから渡すキャッシュの扱い
    notFound?: {
      // 付与する Cache-Tag。記事が公開されたときに 404 のキャッシュも一緒に消すために使う
      tags?: string[]
      noStore?: boolean
    }
  }
}
