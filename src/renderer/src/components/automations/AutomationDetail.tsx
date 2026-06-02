import React from 'react'
import { Pencil, Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import type { Automation, AutomationRun } from '../../../../shared/automations-types'
import { formatAutomationSchedule } from '../../../../shared/automation-schedules'
import { formatAutomationPrecheckTimeout } from '../../../../shared/automation-precheck'
import { formatAutomationDateTimeWithRelative } from './automation-page-parts'
import {
  formatAutomationCost,
  formatAutomationTokens,
  summarizeAutomationRunUsage
} from './automation-usage-model'

type AutomationDetailProps = {
  automation: Automation | null
  runs: AutomationRun[]
  projectName: string
  workspaceName: string
  projectDefaultBaseRef: string | null
  now: number
  onRunNow: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  onToggle: (automation: Automation) => void
  onDelete: (automation: Automation) => void
}

function DetailMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  )
}

function formatGrace(minutes: number): string {
  if (minutes <= 0) {
    return '유예 없음'
  }
  if (minutes < 60) {
    return `${minutes}분`
  }
  const hours = minutes / 60
  return `${hours}시간`
}

function ToolbarIconButton({
  label,
  children,
  onClick,
  className
}: {
  label: string
  children: React.ReactNode
  onClick: () => void
  className?: string
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className={className}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function AutomationDetail({
  automation,
  runs,
  projectName,
  workspaceName,
  projectDefaultBaseRef,
  now,
  onRunNow,
  onEdit,
  onToggle,
  onDelete
}: AutomationDetailProps): React.JSX.Element {
  if (!automation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        자동화를 만들어 에이전트 작업 일정을 시작하세요.
      </div>
    )
  }
  const usageSummary = summarizeAutomationRunUsage(runs)
  const usageCoverage =
    usageSummary.knownRuns > 0
      ? `${usageSummary.knownRuns}/${runs.length}회 실행`
      : usageSummary.unavailableRuns > 0
        ? '사용 불가'
        : '실행 기록 없음'
  const agentLabel =
    AGENT_CATALOG.find((agent) => agent.id === automation.agentId)?.label ?? automation.agentId
  const runLocationLabel =
    automation.workspaceMode === 'new_per_run'
      ? (automation.baseBranch ?? projectDefaultBaseRef ?? '프로젝트 기본값')
      : workspaceName

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{automation.name}</h2>
            <Badge variant={automation.enabled ? 'secondary' : 'outline'}>
              {automation.enabled ? '활성' : '일시 중지'}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {projectName} / {workspaceName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => onRunNow(automation)}>
            <Play className="size-4" />
            지금 실행
          </Button>
          <ToolbarIconButton label="자동화 수정" onClick={() => onEdit(automation)}>
            <Pencil className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={automation.enabled ? '자동화 일시 중지' : '자동화 재개'}
            onClick={() => onToggle(automation)}
          >
            {automation.enabled ? <Pause className="size-4" /> : <Play className="size-4" />}
          </ToolbarIconButton>
          <ToolbarIconButton
            label="자동화 삭제"
            onClick={() => onDelete(automation)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </ToolbarIconButton>
        </div>
      </div>

      {automation.executionTargetType === 'ssh' ? (
        <div className="rounded-md border border-border/50 bg-muted/50 p-3 text-sm text-muted-foreground shadow-sm">
          이 SSH 자동화는 Korca가 SSH 호스트에 연결할 수 있을 때만 실행됩니다. 재연결에 대화형 자격
          증명이 필요하거나 호스트를 사용할 수 없으면 실행은 건너뜀으로 기록됩니다.
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-5 rounded-md border border-border/50 bg-muted/30 px-4 py-3 shadow-sm">
        <DetailMetric label="일정" value={formatAutomationSchedule(automation.rrule)} />
        <DetailMetric
          label="다음 실행"
          value={
            automation.enabled
              ? formatAutomationDateTimeWithRelative(automation.nextRunAt, now)
              : '일시 중지됨'
          }
        />
        <DetailMetric
          label={automation.workspaceMode === 'new_per_run' ? '기준' : '실행 위치'}
          value={runLocationLabel}
        />
        <DetailMetric
          label="세션"
          value={automation.reuseSession ? '실시간 세션 재사용' : '매 실행 새로 시작'}
        />
        <DetailMetric label="유예" value={formatGrace(automation.missedRunGraceMinutes)} />
        <DetailMetric
          label="사전 검사"
          value={
            automation.precheck
              ? `활성, ${formatAutomationPrecheckTimeout(automation.precheck.timeoutSeconds)}`
              : '없음'
          }
        />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase text-muted-foreground">에이전트</div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium">
            <AgentIcon agent={automation.agentId} size={16} />
            <span className="truncate">{agentLabel}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-5 rounded-md border border-border/50 bg-muted/20 px-4 py-3 shadow-sm">
        <DetailMetric
          label="마지막 실행"
          value={formatAutomationDateTimeWithRelative(automation.lastRunAt, now)}
        />
        <DetailMetric
          label="예상 비용"
          value={formatAutomationCost(usageSummary.estimatedCostUsd)}
        />
        <DetailMetric label="토큰" value={formatAutomationTokens(usageSummary.totalTokens)} />
        <DetailMetric label="사용 범위" value={usageCoverage} />
      </div>

      <div className="rounded-md border border-border/50 bg-muted/20 shadow-sm">
        <div className="border-b border-border/50 px-3 py-2 text-sm font-medium">프롬프트</div>
        <div className="px-3 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">프롬프트</div>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-foreground">
              {automation.prompt}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
