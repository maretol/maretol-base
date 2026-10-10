import type { ParsedContent } from 'api-types'

// 一覧に出す記事の抜粋で描画するブロック数。先頭からこの数だけを描画する
const SAMPLE_BLOCK_COUNT = 6

export function getSampleBlocks(contents: ParsedContent[]): ParsedContent[] {
  return contents.slice(0, SAMPLE_BLOCK_COUNT)
}
