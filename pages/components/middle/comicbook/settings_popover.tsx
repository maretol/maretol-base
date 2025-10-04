import { memo } from 'react'
import { SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PageOption } from './types'

type ComicSettingsPopoverProps = {
  pageOption: PageOption
  mode: 'single' | 'double'
  onChangeControllerVisible: (value: boolean) => void
  onChangeControllerDisabled: (value: boolean) => void
  onChangeModeStatic: (value: boolean) => void
}

function ComicSettingsPopover(props: ComicSettingsPopoverProps) {
  const { pageOption, mode, onChangeControllerVisible, onChangeControllerDisabled, onChangeModeStatic } = props

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-full">
          <SettingsIcon className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="controller_visible"
            className="data-[state=checked]:bg-blue-900"
            checked={pageOption.controller_visible}
            onCheckedChange={onChangeControllerVisible}
          />
          <Label htmlFor="controller_visible">ページ送りボタンを見やすくする</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="controller_disabled"
            className="data-[state=checked]:bg-blue-900"
            checked={pageOption.controller_disabled}
            onCheckedChange={onChangeControllerDisabled}
          />
          <Label htmlFor="controller_disabled">ページ送りボタンを非表示にする</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="mode"
            className="data-[state=checked]:bg-blue-900"
            checked={pageOption.mode_static}
            onCheckedChange={onChangeModeStatic}
          />
          {mode === 'double' && <Label htmlFor="mode">見開き表示で固定する</Label>}
          {mode === 'single' && <Label htmlFor="mode">単ページ表示で固定する</Label>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default memo(ComicSettingsPopover)
