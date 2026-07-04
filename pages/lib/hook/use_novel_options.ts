import { useCallback, useEffect, useRef, useState } from 'react'
import { NovelOption, WritingDirection, initNovelOption } from '@/components/middle/novelbook/types'
import { DEBOUNCE_DELAY } from '@/components/middle/novelbook/constants'

const STORAGE_KEY = 'novel_option'

// 小説リーダーの表示設定（縦書き/横書き）を localStorage へ永続化するフック。
// comic の usePageOptions を踏襲（init は useEffect で復元、保存はデバウンス）。
export function useNovelOptions() {
  const [novelOption, setNovelOption] = useState<NovelOption>(initNovelOption)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const opt = localStorage.getItem(STORAGE_KEY)
    if (!opt) {
      return
    }
    try {
      const parsed = JSON.parse(opt) as Partial<NovelOption>
      // 不正値（未知の direction 等）は既定（横書き）へフォールバックする
      const direction: WritingDirection = parsed.direction === 'vertical' ? 'vertical' : 'horizontal'
      setNovelOption({ direction })
    } catch {
      setNovelOption(initNovelOption)
    }
  }, [])

  const saveToLocalStorage = useCallback((newOption: NovelOption) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOption))
    }, DEBOUNCE_DELAY)
  }, [])

  const changeDirection = useCallback(
    (direction: WritingDirection) => {
      setNovelOption((prev) => {
        const newOption = { ...prev, direction }
        saveToLocalStorage(newOption)
        return newOption
      })
    },
    [saveToLocalStorage]
  )

  return {
    novelOption,
    changeDirection,
  }
}
