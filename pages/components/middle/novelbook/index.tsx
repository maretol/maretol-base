'use client'

import { cn } from '@/lib/utils'
import { useNovelOptions } from '@/lib/hook/use_novel_options'
import NovelSettingsPopover from './settings_popover'

type NovelReaderProps = {
  // サーバ（RSC）でパース済みの安全な本文 HTML 文字列
  html: string
}

// 小説本文のテキストリーダー。
// 表示は既定で横書き、設定で縦書きへ切替できる。本文 HTML はサーバ生成済み（エスケープ済み）のため表示のみを担う。
export default function NovelReader({ html }: NovelReaderProps) {
  const { novelOption, changeDirection } = useNovelOptions()
  const isVertical = novelOption.direction === 'vertical'

  return (
    <div className="relative w-full">
      <div className="flex justify-end px-2">
        <NovelSettingsPopover novelOption={novelOption} onChangeDirection={changeDirection} />
      </div>
      <div
        lang="ja"
        className={cn(
          'novel-body px-4 py-6 sm:px-8',
          isVertical && 'novel-body--vertical [writing-mode:vertical-rl] max-h-[80svh] overflow-x-auto overflow-y-hidden'
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
