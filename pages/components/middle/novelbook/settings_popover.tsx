import { memo } from 'react'
import { SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NovelOption, WritingDirection } from './types'

type NovelSettingsPopoverProps = {
  novelOption: NovelOption
  onChangeDirection: (direction: WritingDirection) => void
}

function NovelSettingsPopover({ novelOption, onChangeDirection }: NovelSettingsPopoverProps) {
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
            id="novel_direction"
            className="data-[state=checked]:bg-blue-900"
            checked={novelOption.direction === 'vertical'}
            onCheckedChange={(checked) => onChangeDirection(checked ? 'vertical' : 'horizontal')}
          />
          <Label htmlFor="novel_direction">縦書きで表示する</Label>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default memo(NovelSettingsPopover)
