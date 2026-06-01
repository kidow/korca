import { CircleHelp } from 'lucide-react'
import { useState } from 'react'
import type { NestedRepoScanResult } from '../../../../shared/types'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

function formatTimeout(timeoutMs: number): string {
  if (timeoutMs >= 1000 && timeoutMs % 1000 === 0) {
    return `${timeoutMs / 1000}초`
  }
  return `${timeoutMs}ms`
}

export function nestedRepoScanLimitText(scan: NestedRepoScanResult): string {
  const automaticStops = [`폴더 깊이 ${scan.maxDepth}단계`, `저장소 ${scan.maxRepos}개`]
  if (scan.timeoutMs !== null) {
    automaticStops.push(formatTimeout(scan.timeoutMs))
  }
  return `스캔은 ${automaticStops.join(' 또는 ')} 이후 중지됩니다. 미리 중지하고 지금까지 찾은 저장소를 가져올 수 있습니다.`
}

export function NestedRepoScanLimitNotice({ scan }: { scan: NestedRepoScanResult }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const detailsText = nestedRepoScanLimitText(scan)

  return (
    <div
      className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
      onPointerEnter={() => setDetailsOpen(true)}
      onPointerLeave={() => setDetailsOpen(false)}
      onFocusCapture={() => setDetailsOpen(true)}
      onBlurCapture={() => setDetailsOpen(false)}
    >
      <span>{scan.stopped ? '스캔이 일찍 중지되었습니다.' : '부분 스캔 결과를 표시하는 중입니다.'}</span>
      <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="중첩 저장소 스캔 제한"
            aria-expanded={detailsOpen}
            title={detailsText}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={(event) => {
              event.stopPropagation()
              setDetailsOpen(true)
            }}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          sideOffset={4}
          className="max-w-[260px] px-3 py-2 text-xs leading-5 text-pretty"
          // Why: this popover opens on hover, so default focus-on-open would
          // yank focus off the dialog every time the pointer grazes the icon.
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {detailsText}
        </PopoverContent>
      </Popover>
    </div>
  )
}
