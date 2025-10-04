import { useCallback, useEffect, useRef, useState } from 'react'
import { PageOption, initPageOption } from '@/components/middle/comicbook/types'
import { DEBOUNCE_DELAY } from '@/components/middle/comicbook/constants'

const STORAGE_KEY = 'page_option'

export function usePageOptions() {
  const [pageOption, setPageOption] = useState<PageOption>(initPageOption)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const opt = localStorage.getItem(STORAGE_KEY)
    if (opt) {
      setPageOption(JSON.parse(opt))
    }
  }, [])

  const saveToLocalStorage = useCallback((newOption: PageOption) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOption))
    }, DEBOUNCE_DELAY)
  }, [])

  const changeControllerVisible = useCallback(
    (controller_visible: boolean) => {
      setPageOption((prev) => {
        const newOption = { ...prev, controller_visible }
        saveToLocalStorage(newOption)
        return newOption
      })
    },
    [saveToLocalStorage]
  )

  const changeModeStatic = useCallback(
    (mode_static: boolean) => {
      setPageOption((prev) => {
        const newOption = { ...prev, mode_static }
        saveToLocalStorage(newOption)
        return newOption
      })
    },
    [saveToLocalStorage]
  )

  const changeControllerDisabled = useCallback(
    (controller_disabled: boolean) => {
      setPageOption((prev) => {
        const newOption = { ...prev, controller_disabled }
        saveToLocalStorage(newOption)
        return newOption
      })
    },
    [saveToLocalStorage]
  )

  return {
    pageOption,
    changeControllerVisible,
    changeModeStatic,
    changeControllerDisabled,
  }
}
