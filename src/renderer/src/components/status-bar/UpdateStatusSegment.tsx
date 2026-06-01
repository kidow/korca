import React from 'react'
import { AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '../../store'

// Why: always rendered (not gated by `statusBarItems`). When the update card
// is collapsed, this segment is the only way back to it — hiding it would
// strand the user with an orphaned download or install.
export function UpdateStatusSegment({
  iconOnly
}: {
  compact: boolean
  iconOnly: boolean
}): React.JSX.Element | null {
  const status = useAppStore((s) => s.updateStatus)
  const collapsed = useAppStore((s) => s.updateCardCollapsed)
  const setCollapsed = useAppStore((s) => s.setUpdateCardCollapsed)

  if (status.state !== 'downloading' && status.state !== 'downloaded' && status.state !== 'error') {
    return null
  }

  const segment = (() => {
    if (status.state === 'downloading') {
      const pct = Math.max(0, Math.min(100, Math.round(status.percent)))
      return {
        icon: <Download className="size-3 text-muted-foreground" />,
        label: `${pct}%`,
        tooltip: `Orca v${status.version} 다운로드 중… ${pct}%`,
        ariaLabel: `업데이트 다운로드 중, ${pct}퍼센트. 눌러서 펼치기.`
      }
    }
    if (status.state === 'downloaded') {
      return {
        icon: <CheckCircle2 className="size-3 text-emerald-500" />,
        label: '업데이트 준비됨',
        tooltip: `Orca v${status.version} 설치 준비 완료`,
        ariaLabel: '업데이트 설치 준비 완료. 눌러서 펼치기.'
      }
    }
    return {
      icon: <AlertCircle className="size-3 text-yellow-500" />,
      label: '업데이트 실패',
      tooltip: '업데이트 실패 - 눌러서 세부 정보 보기',
      ariaLabel: '업데이트 실패. 눌러서 펼치기.'
    }
  })()

  const handleClick = () => {
    setCollapsed(!collapsed)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 hover:bg-accent/70"
          aria-label={segment.ariaLabel}
          aria-expanded={!collapsed}
        >
          {segment.icon}
          {!iconOnly && <span className="text-[11px] tabular-nums">{segment.label}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {segment.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
