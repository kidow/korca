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
import type { CodexUsageRange, CodexUsageScope } from '../../../../shared/codex-usage-types'
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
import { ShareUsageButton } from './ShareUsageButton'
import { StatCard } from './StatCard'

const RANGE_OPTIONS: CodexUsageRange[] = ['7d', '30d', '90d', 'all']
const SCOPE_OPTIONS: { value: CodexUsageScope; label: string }[] = [
  { value: 'korca', label: 'Korca 워크트리만' },
  { value: 'all', label: '모든 로컬 Codex 사용량' }
]
const RANGE_LABELS: Record<CodexUsageRange, string> = {
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

export function CodexUsagePane(): React.JSX.Element {
  const scanState = useAppStore((state) => state.codexUsageScanState)
  const summary = useAppStore((state) => state.codexUsageSummary)
  const daily = useAppStore((state) => state.codexUsageDaily)
  const modelBreakdown = useAppStore((state) => state.codexUsageModelBreakdown)
  const projectBreakdown = useAppStore((state) => state.codexUsageProjectBreakdown)
  const recentSessions = useAppStore((state) => state.codexUsageRecentSessions)
  const scope = useAppStore((state) => state.codexUsageScope)
  const range = useAppStore((state) => state.codexUsageRange)
  const fetchCodexUsage = useAppStore((state) => state.fetchCodexUsage)
  const setCodexUsageEnabled = useAppStore((state) => state.setCodexUsageEnabled)
  const refreshCodexUsage = useAppStore((state) => state.refreshCodexUsage)
  const setCodexUsageScope = useAppStore((state) => state.setCodexUsageScope)
  const setCodexUsageRange = useAppStore((state) => state.setCodexUsageRange)
  const recordFeatureInteraction = useAppStore((state) => state.recordFeatureInteraction)

  useEffect(() => {
    void fetchCodexUsage()
  }, [fetchCodexUsage])

  const handleSetEnabled = (enabled: boolean): void => {
    recordFeatureInteraction('usage-tracking')
    void setCodexUsageEnabled(enabled)
  }

  if (!scanState?.enabled) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Codex 사용량 추적</h3>
            <p className="text-sm text-muted-foreground">
              로컬 Codex 사용 로그를 읽어 토큰, 모델, 세션 통계를 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={false}
            aria-label="Codex 사용량 추적 활성화"
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
        title="Codex 사용량 추적"
        summaryCardCount={6}
        summaryGridClassName="md:grid-cols-3"
      />
    )
  }

  const hasAnyData = summary?.hasAnyCodexData ?? scanState.hasAnyCodexData

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Codex 사용량 추적</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatUpdatedAt(scanState.lastScanCompletedAt)}
            {scanState.lastScanError ? ` • 마지막 스캔 오류: ${scanState.lastScanError}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          {summary && daily.length > 0 && (
            <ShareUsageButton provider="codex" summary={summary} daily={daily} range={range} />
          )}
          <DropdownMenu>
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" aria-label="Codex 사용량 옵션">
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
                onValueChange={(value) => void setCodexUsageScope(value as CodexUsageScope)}
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
                onValueChange={(value) => void setCodexUsageRange(value as CodexUsageRange)}
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
                  onClick={() => void refreshCodexUsage()}
                  disabled={scanState.isScanning}
                  aria-label="Codex 사용량 새로고침"
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
            aria-label="Codex 사용량 분석 활성화"
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
          No local Codex usage found yet for this scope.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Input tokens"
              value={formatTokens(summary?.inputTokens ?? 0)}
              icon={<Sparkles className="size-4" />}
            />
            <StatCard
              label="Output tokens"
              value={formatTokens(summary?.outputTokens ?? 0)}
              icon={<Activity className="size-4" />}
            />
            <StatCard
              label="Cached input"
              value={formatTokens(summary?.cachedInputTokens ?? 0)}
              icon={<DatabaseZap className="size-4" />}
            />
            <StatCard
              label="Reasoning output"
              value={formatTokens(summary?.reasoningOutputTokens ?? 0)}
              icon={<Brain className="size-4" />}
            />
            <StatCard
              label="Sessions / Events"
              value={`${(summary?.sessions ?? 0).toLocaleString()} / ${(summary?.events ?? 0).toLocaleString()}`}
              icon={<FolderKanban className="size-4" />}
            />
            <StatCard
              label="Est. API-equivalent cost"
              value={formatCost(summary?.estimatedCostUsd ?? null)}
              icon={<Coins className="size-4" />}
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Reasoning tokens are shown for visibility, but cost is calculated from uncached input,
            cached input, and output only.
          </p>

          <CodexUsageDailyChart daily={daily} />

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">모델별</h4>
                <p className="text-xs text-muted-foreground">
                  Top model: {summary?.topModel ?? 'n/a'}
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
                      {row.sessions} sessions • {row.events} events
                      {row.hasInferredPricing ? ' • inferred pricing' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">프로젝트별</h4>
                <p className="text-xs text-muted-foreground">
                  Top project: {summary?.topProject ?? 'n/a'}
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
                      {row.sessions} sessions • {row.events} events
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
                Most recent local Codex sessions in this scope.
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
                        {row.model ?? 'Unknown'}
                        {row.hasInferredPricing ? ' *' : ''}
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
