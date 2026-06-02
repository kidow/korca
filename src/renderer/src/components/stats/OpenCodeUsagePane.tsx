import { useEffect } from 'react'
import {
  Activity,
  Brain,
  Coins,
  DatabaseZap,
  FolderKanban,
  RefreshCw,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import type {
  OpenCodeUsageRange,
  OpenCodeUsageScope
} from '../../../../shared/opencode-usage-types'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { ClaudeUsageLoadingState } from './ClaudeUsageLoadingState'
import { CodexUsageDailyChart } from './CodexUsageDailyChart'
import { StatCard } from './StatCard'

const RANGE_OPTIONS: OpenCodeUsageRange[] = ['7d', '30d', '90d', 'all']
const SCOPE_OPTIONS: { value: OpenCodeUsageScope; label: string }[] = [
  { value: 'korca', label: 'Korca 작업 트리만' },
  { value: 'all', label: '로컬 OpenCode 사용량 전체' }
]
const RANGE_LABELS: Record<OpenCodeUsageRange, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  all: '전체 기간'
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }
  return value.toLocaleString()
}

function formatCost(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`
}

function formatUpdatedAt(timestamp: number | null): string {
  if (!timestamp) {
    return '아직 스캔하지 않음'
  }
  return `업데이트됨 ${new Date(timestamp).toLocaleString()}`
}

function formatSessionTime(timestamp: string): string {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp
  }
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function OpenCodeUsagePane(): React.JSX.Element {
  const scanState = useAppStore((state) => state.openCodeUsageScanState)
  const summary = useAppStore((state) => state.openCodeUsageSummary)
  const daily = useAppStore((state) => state.openCodeUsageDaily)
  const modelBreakdown = useAppStore((state) => state.openCodeUsageModelBreakdown)
  const projectBreakdown = useAppStore((state) => state.openCodeUsageProjectBreakdown)
  const recentSessions = useAppStore((state) => state.openCodeUsageRecentSessions)
  const scope = useAppStore((state) => state.openCodeUsageScope)
  const range = useAppStore((state) => state.openCodeUsageRange)
  const fetchOpenCodeUsage = useAppStore((state) => state.fetchOpenCodeUsage)
  const setOpenCodeUsageEnabled = useAppStore((state) => state.setOpenCodeUsageEnabled)
  const refreshOpenCodeUsage = useAppStore((state) => state.refreshOpenCodeUsage)
  const setOpenCodeUsageScope = useAppStore((state) => state.setOpenCodeUsageScope)
  const setOpenCodeUsageRange = useAppStore((state) => state.setOpenCodeUsageRange)
  const recordFeatureInteraction = useAppStore((state) => state.recordFeatureInteraction)

  useEffect(() => {
    void fetchOpenCodeUsage()
  }, [fetchOpenCodeUsage])

  const handleSetEnabled = (enabled: boolean): void => {
    recordFeatureInteraction('usage-tracking')
    void setOpenCodeUsageEnabled(enabled)
  }

  if (!scanState?.enabled) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">OpenCode 사용량 추적</h3>
            <p className="text-sm text-muted-foreground">
              로컬 OpenCode 사용 로그를 읽어 토큰, 모델, 세션 통계를 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={false}
            aria-label="OpenCode 사용량 분석 활성화"
            onClick={() => handleSetEnabled(true)}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted-foreground/30 transition-colors"
          >
            <span className="pointer-events-none block size-3.5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform" />
          </button>
        </div>
      </div>
    )
  }

  if (!summary && (scanState.isScanning || scanState.lastScanCompletedAt === null)) {
    return (
      <ClaudeUsageLoadingState
        title="OpenCode 사용량 추적"
        summaryCardCount={6}
        summaryGridClassName="md:grid-cols-3"
      />
    )
  }

  const hasAnyData = summary?.hasAnyOpenCodeData ?? scanState.hasAnyOpenCodeData

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">OpenCode 사용량 추적</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatUpdatedAt(scanState.lastScanCompletedAt)}
            {scanState.lastScanError ? ` • 마지막 스캔 오류: ${scanState.lastScanError}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <DropdownMenu>
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" aria-label="OpenCode 사용량 옵션">
                      <SlidersHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  필터
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>범위</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={scope}
                onValueChange={(value) => void setOpenCodeUsageScope(value as OpenCodeUsageScope)}
              >
                {SCOPE_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>기간</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={range}
                onValueChange={(value) => void setOpenCodeUsageRange(value as OpenCodeUsageRange)}
              >
                {RANGE_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option}>
                    {RANGE_LABELS[option]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void refreshOpenCodeUsage()}
                  disabled={scanState.isScanning}
                  aria-label="OpenCode 사용량 새로고침"
                >
                  <RefreshCw className={`size-3.5 ${scanState.isScanning ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                새로고침
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            type="button"
            role="switch"
            aria-checked={true}
            aria-label="OpenCode 사용량 분석 활성화"
            onClick={() => handleSetEnabled(false)}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-foreground transition-colors"
          >
            <span className="pointer-events-none block size-3.5 translate-x-4 rounded-full bg-background shadow-sm transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {SCOPE_OPTIONS.find((option) => option.value === scope)?.label} • {RANGE_LABELS[range]}
        </p>
      </div>

      {!hasAnyData ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-sm text-muted-foreground">
          이 범위에는 아직 로컬 OpenCode 사용량이 없습니다.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="입력 토큰"
              value={formatTokens(summary?.inputTokens ?? 0)}
              icon={<Sparkles className="size-4" />}
            />
            <StatCard
              label="출력 토큰"
              value={formatTokens(summary?.outputTokens ?? 0)}
              icon={<Activity className="size-4" />}
            />
            <StatCard
              label="캐시된 입력"
              value={formatTokens(summary?.cachedInputTokens ?? 0)}
              icon={<DatabaseZap className="size-4" />}
            />
            <StatCard
              label="추론 출력"
              value={formatTokens(summary?.reasoningOutputTokens ?? 0)}
              icon={<Brain className="size-4" />}
            />
            <StatCard
              label="세션 / 이벤트"
              value={`${(summary?.sessions ?? 0).toLocaleString()} / ${(summary?.events ?? 0).toLocaleString()}`}
              icon={<FolderKanban className="size-4" />}
            />
            <StatCard
              label="기록된 비용"
              value={formatCost(summary?.estimatedCostUsd ?? null)}
              icon={<Coins className="size-4" />}
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            비용은 보조 메시지가 기록된 경우 로컬 OpenCode 데이터베이스에서 가져옵니다.
          </p>

          <CodexUsageDailyChart daily={daily} />

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">모델별</h4>
                <p className="text-xs text-muted-foreground">
                  최다 모델: {summary?.topModel ?? '해당 없음'}
                </p>
              </div>
              <div className="space-y-3">
                {modelBreakdown.slice(0, 5).map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-foreground">{row.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatTokens(row.totalTokens)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.sessions} 세션 • {row.events} 이벤트
                      {row.estimatedCostUsd !== null
                        ? ` • ${formatCost(row.estimatedCostUsd)}`
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">프로젝트별</h4>
                <p className="text-xs text-muted-foreground">
                  최다 프로젝트: {summary?.topProject ?? '해당 없음'}
                </p>
              </div>
              <div className="space-y-3">
                {projectBreakdown.slice(0, 5).map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-foreground">{row.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatTokens(row.totalTokens)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.sessions} 세션 • {row.events} 이벤트
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-foreground">최근 세션</h4>
              <p className="text-xs text-muted-foreground">
                이 범위의 최근 로컬 OpenCode 세션입니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">최근 활동</th>
                    <th className="px-2 py-2 font-medium">프로젝트</th>
                    <th className="px-2 py-2 font-medium">모델</th>
                    <th className="px-2 py-2 font-medium">이벤트</th>
                    <th className="px-2 py-2 font-medium">입력</th>
                    <th className="px-2 py-2 font-medium">출력</th>
                    <th className="px-2 py-2 font-medium">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((row) => (
                    <tr key={row.sessionId} className="border-b border-border/40 last:border-b-0">
                      <td className="px-2 py-2 text-muted-foreground">
                        {formatSessionTime(row.lastActiveAt)}
                      </td>
                      <td className="px-2 py-2 text-foreground">{row.projectLabel}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {row.model ?? '알 수 없음'}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{row.events}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {formatTokens(row.inputTokens)}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {formatTokens(row.outputTokens)}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {formatTokens(row.totalTokens)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
