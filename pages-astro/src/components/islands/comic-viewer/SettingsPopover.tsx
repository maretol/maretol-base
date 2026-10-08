import { memo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Switch from '@radix-ui/react-switch'
import { SettingsIcon } from 'lucide-react'
import type { ViewerSettings, ViewMode } from './types'

// class は現行サイトの shadcn/ui の Button（ghost）/ Popover / Switch / Label と同じ
// （tailwind-merge をブラウザへ持ち込まないよう、結合済みの文字列で持つ）
const triggerClassName =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-full px-4 py-2'
const contentClassName =
  'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 space-y-2'
const switchClassName =
  'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-900 data-[state=unchecked]:bg-input'
const thumbClassName =
  'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
const labelClassName = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

type Props = {
  settings: ViewerSettings
  mode: ViewMode
  onChange: (patch: Partial<ViewerSettings>) => void
}

function SettingsPopover({ settings, mode, onChange }: Props) {
  const items: { key: keyof ViewerSettings; label: string }[] = [
    { key: 'controller_visible', label: 'ページ送りボタンを見やすくする' },
    { key: 'controller_disabled', label: 'ページ送りボタンを非表示にする' },
    { key: 'mode_static', label: mode === 'double' ? '見開き表示で固定する' : '単ページ表示で固定する' },
  ]

  return (
    <Popover.Root>
      <Popover.Trigger className={triggerClassName} aria-label="表示の設定">
        <SettingsIcon className="h-6 w-6" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" align="center" sideOffset={4} className={contentClassName}>
          {items.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Switch.Root
                id={key}
                className={switchClassName}
                checked={settings[key]}
                onCheckedChange={(checked) => onChange({ [key]: checked })}
              >
                <Switch.Thumb className={thumbClassName} />
              </Switch.Root>
              <label htmlFor={key} className={labelClassName}>
                {label}
              </label>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default memo(SettingsPopover)
