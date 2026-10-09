import type { ViewerSettings } from './types'

// 閲覧者の設定の保存先。現行サイトと同じキー・形で localStorage に持つので、保存済みの設定を引き継ぐ。
// useSyncExternalStore で読む（サーバーと hydration では既定値）
const STORAGE_KEY = 'page_option'
// 書き込みをまとめる時間（ミリ秒）
const SAVE_DELAY = 500

export const defaultSettings: ViewerSettings = {
  mode_static: false,
  controller_visible: false,
  controller_disabled: false,
}

let current: ViewerSettings | null = null
let saveTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function read(): ViewerSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

export function subscribeSettings(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function getSettings(): ViewerSettings {
  return (current ??= read())
}

export function getServerSettings(): ViewerSettings {
  return defaultSettings
}

export function updateSettings(patch: Partial<ViewerSettings>): void {
  current = { ...getSettings(), ...patch }
  for (const listener of listeners) {
    listener()
  }
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    } catch (e) {
      console.error('[comic-viewer/settings.ts] failed to save settings', e)
    }
  }, SAVE_DELAY)
}
