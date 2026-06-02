import { ArrowLeft, Bell } from 'lucide-react'

import { useAppStore } from '@/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActivityUnreadCount } from './useActivityUnreadCount'

export function ActivityTitlebarControls(): React.JSX.Element {
  const unreadCount = useActivityUnreadCount(true, 'agent-events')
  const closeActivityPage = useAppStore((s) => s.closeActivityPage)

  return (
    <div className="flex h-full min-w-0 flex-1 items-center gap-3 border-l border-border px-3">
      <div
        className="flex min-w-0 items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Why: Activity hides the worktree sidebar (full-page surface), so the
            sidebar's nav row isn't available as the back path. This Back button
            설정의 onBack 패턴을 따르는 전용 종료 경로입니다. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={closeActivityPage}
              aria-label="에이전트 닫기"
            >
              <ArrowLeft className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            에이전트 닫기
          </TooltipContent>
        </Tooltip>
        <Bell className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-medium">에이전트</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
          읽지 않음 {unreadCount}
        </Badge>
      </div>
    </div>
  )
}
