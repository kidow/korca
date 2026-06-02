import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import type { ClaudeUsageDailyPoint } from '../../../../shared/claude-usage-types'

function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }
  return value.toLocaleString()
}

function getDailyTotal(entry: ClaudeUsageDailyPoint): number {
  return entry.inputTokens + entry.outputTokens + entry.cacheReadTokens + entry.cacheWriteTokens
}

function getMaxDailyTotal(daily: ClaudeUsageDailyPoint[]): number {
  let max = 1
  // Why: all-time usage histories can exceed V8's argument limit if spread
  // into Math.max, even though the chart only renders the last 10 days.
  for (const entry of daily) {
    max = Math.max(max, getDailyTotal(entry))
  }
  return max
}

type ClaudeUsageDailyChartProps = {
  daily: ClaudeUsageDailyPoint[]
}

export function ClaudeUsageDailyChart({ daily }: ClaudeUsageDailyChartProps): React.JSX.Element {
  const maxDailyTotal = getMaxDailyTotal(daily)

  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">일별 사용량</h4>
        <p className="text-xs text-muted-foreground">
          일별 입력, 출력, 캐시 읽기, 캐시 쓰기 합계입니다.
        </p>
      </div>
      <div className="grid h-56 grid-cols-10 items-end gap-3">
        {daily.slice(-10).map((entry) => {
          const total = getDailyTotal(entry)
          const segments = [
            {
              key: 'cache-write',
              label: '캐시 쓰기',
              value: entry.cacheWriteTokens,
              className: 'bg-fuchsia-500/70'
            },
            {
              key: 'cache-read',
              label: '캐시 읽기',
              value: entry.cacheReadTokens,
              className: 'bg-amber-500/70'
            },
            {
              key: 'output',
              label: '출력',
              value: entry.outputTokens,
              className: 'bg-emerald-500/80'
            },
            { key: 'input', label: '입력', value: entry.inputTokens, className: 'bg-sky-500/80' }
          ]
          return (
            <div key={entry.day} className="flex h-full min-w-0 flex-col justify-end gap-2">
              <span className="text-center text-[11px] text-muted-foreground">
                {formatTokens(total)}
              </span>
              <div className="flex min-h-0 flex-1 items-end justify-center">
                <div className="flex h-full w-full max-w-12 overflow-hidden rounded-t-sm bg-muted/60">
                  <div className="flex h-full w-full flex-col justify-end">
                    {segments.map((segment) =>
                      segment.value > 0 ? (
                        <TooltipProvider key={segment.key} delayDuration={120}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={segment.className}
                                style={{ height: `${(segment.value / maxDailyTotal) * 100}%` }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={8}>
                              <div className="text-xs">
                                <div>{entry.day}</div>
                                <div>
                                  {segment.label}: {segment.value.toLocaleString()} tokens
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
              <span className="text-center text-[11px] text-muted-foreground">
                {entry.day.slice(5)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-sky-500/80" />
          입력
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500/80" />
          출력
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-500/70" />
          캐시 읽기
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-fuchsia-500/70" />
          캐시 쓰기
        </span>
      </div>
    </section>
  )
}
