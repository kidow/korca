/* oxlint-disable react-doctor/no-adjust-state-on-prop-change -- pre-existing pattern, predates this rule */
/* eslint-disable max-lines -- Why: the analyzer's private treemap, selection,
   breakdown, and table pieces share one scan state and should evolve as one resource-manager surface. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  Circle,
  ExternalLink,
  FileWarning,
  GitBranch,
  GitPullRequest,
  HardDrive,
  Loader2,
  Minus,
  RefreshCw,
  Search,
  Server,
  Terminal,
  Trash2,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react'
import type {
  AgentStatusEntry,
  MigrationUnsupportedPtyEntry
} from '../../../../shared/agent-status-types'
import type { GitStatusResult, TerminalTab, Worktree } from '../../../../shared/types'
import type {
  WorkspaceSpaceItem,
  WorkspaceSpaceWorktree
} from '../../../../shared/workspace-space-types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { useAppStore } from '../../store'
import { getWorktreeMapFromState } from '../../store/selectors'
import { getHostedReviewCacheKey } from '../../store/slices/hosted-review'
import { refreshGitStatusForWorktree } from '../right-sidebar/git-status-refresh'
import { runWorktreeBatchDelete } from '../sidebar/delete-worktree-flow'
import { branchDisplayName } from '../sidebar/WorktreeCardHelpers'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '../ui/context-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  formatBytes,
  formatCompactCount,
  getWorkspaceSpaceBranchLabel,
  getWorkspaceSpaceProgressLabel,
  getWorkspaceSpaceScanDateTimeLabel,
  getWorkspaceSpaceScanTimeLabel,
  getWorkspaceSpaceStatusLabel
} from './workspace-space-format'
import { buildTreemapLayout, type TreemapRect } from './workspace-space-layout'
import {
  filterWorkspaceSpaceRows,
  countWorkspaceSpaceActiveAgents,
  getLargestWorkspaceSpaceItemSize,
  getLargestWorkspaceSpaceRowSize,
  getSelectedDeletableWorkspaceIds,
  getVisibleDeletableWorkspaceIds,
  getWorkspaceSpaceGitStatusRefreshCandidates,
  isWorkspaceSpaceRowReadyToDelete,
  pruneWorkspaceSpaceSelectedIds,
  resolveWorkspaceSpaceInspectedWorktreeId,
  resolveWorkspaceSpaceTreemapZoomWorktreeId,
  sortWorkspaceSpaceRows,
  type WorkspaceSpaceSortDirection,
  type WorkspaceSpaceSortKey
} from './workspace-space-presentation'

const TREEMAP_FILLS = [
  'color-mix(in srgb, var(--chart-2) 34%, var(--card))',
  'color-mix(in srgb, var(--foreground) 20%, var(--card))',
  'color-mix(in srgb, var(--chart-4) 28%, var(--card))',
  'color-mix(in srgb, var(--primary) 24%, var(--card))',
  'color-mix(in srgb, var(--chart-1) 38%, var(--card))'
]
const GIT_STATUS_REFRESH_CONCURRENCY = 6

type WorkspaceSpaceDeleteState = {
  isDeleting: boolean
  error: string | null
  canForceDelete: boolean
}

type WorkspaceGitRefreshState = {
  isRefreshing: boolean
  error: string | null
}

type WorkspaceDecisionDetails = {
  isActive: boolean
  canOpenWorkspace: boolean
  terminalTabCount: number
  liveTerminalCount: number
  activeAgentCount: number
  completedAgentCount: number
  openEditorFileCount: number
  dirtyEditorBufferCount: number
  browserTabCount: number
  changedFileCount: number | null
  branchStatus: string | null
  reviewLabel: string | null
  issueLabel: string | null
  linearIssueLabel: string | null
}

type WorkspaceDecisionInputs = {
  worktreeMap: Map<string, Worktree>
  tabsByWorktree: Record<string, TerminalTab[]>
  ptyIdsByTabId: Record<string, string[]>
  agentStatusByPaneKey: Record<string, AgentStatusEntry>
  migrationUnsupportedByPtyId: Record<string, MigrationUnsupportedPtyEntry>
  runtimePaneTitlesByTabId: Record<string, Record<number, string>>
  retainedAgentsByPaneKey: Record<string, { worktreeId: string; entry: AgentStatusEntry }>
  openFiles: { id: string; worktreeId: string; isDirty: boolean }[]
  editorDrafts: Record<string, string>
  browserTabsByWorktree: Record<string, unknown[]>
  gitStatusByWorktree: Record<string, unknown[]>
  remoteStatusesByWorktree: Record<string, { hasUpstream: boolean; ahead: number; behind: number }>
  hostedReviewCache: Record<
    string,
    { data?: { number: number; state: string; status: string; title: string } | null }
  >
  issueCache: Record<string, { data?: { number: number; title: string; state: string } | null }>
  linearIssueCache: Record<
    string,
    { data?: { identifier: string; title: string; state?: { name: string } } | null }
  >
  settings: Parameters<typeof getHostedReviewCacheKey>[2]
  activeWorktreeId: string | null
  now: number
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatReviewState(state: string): string {
  return state.charAt(0).toUpperCase() + state.slice(1)
}

function countLiveTerminals(
  tabs: readonly TerminalTab[],
  ptyIdsByTabId: Record<string, string[]>
): number {
  return tabs.filter((tab) => (ptyIdsByTabId[tab.id]?.length ?? 0) > 0).length
}

function getBranchStatus(
  status: { hasUpstream: boolean; ahead: number; behind: number } | undefined
): string | null {
  if (!status?.hasUpstream) {
    return null
  }
  if (status.ahead === 0 && status.behind === 0) {
    return '업스트림과 동기화됨'
  }
  const parts: string[] = []
  if (status.ahead > 0) {
    parts.push(`앞서 있음 ${status.ahead}`)
  }
  if (status.behind > 0) {
    parts.push(`뒤처짐 ${status.behind}`)
  }
  return parts.join(', ')
}

function getWorkspaceDecisionDetails(
  worktree: WorkspaceSpaceWorktree,
  inputs: WorkspaceDecisionInputs
): WorkspaceDecisionDetails {
  const workspaceRecord = inputs.worktreeMap.get(worktree.worktreeId)
  const tabs = inputs.tabsByWorktree[worktree.worktreeId] ?? []
  const openFiles = inputs.openFiles.filter((file) => file.worktreeId === worktree.worktreeId)
  const dirtyEditorBufferCount = openFiles.filter(
    (file) => file.isDirty || inputs.editorDrafts[file.id] !== undefined
  ).length
  const gitEntries = inputs.gitStatusByWorktree[worktree.worktreeId]
  const branch = workspaceRecord
    ? branchDisplayName(workspaceRecord.branch)
    : getWorkspaceSpaceBranchLabel(worktree)
  const reviewCacheKey = getHostedReviewCacheKey(
    worktree.repoPath,
    branch,
    inputs.settings,
    worktree.repoId
  )
  const hostedReview = inputs.hostedReviewCache[reviewCacheKey]?.data
  const linkedPR = workspaceRecord?.linkedPR ?? null
  const reviewLabel =
    hostedReview !== undefined && hostedReview !== null
      ? `PR #${hostedReview.number} ${formatReviewState(hostedReview.state)}${
          hostedReview.status && hostedReview.status !== 'none' ? `, ${hostedReview.status}` : ''
        }`
      : linkedPR
        ? `PR #${linkedPR}`
        : null
  const linkedIssue = workspaceRecord?.linkedIssue ?? null
  const issue = linkedIssue ? inputs.issueCache[`${worktree.repoId}::${linkedIssue}`]?.data : null
  const issueLabel = linkedIssue
    ? issue
      ? `#${issue.number} ${issue.state}: ${issue.title}`
      : `#${linkedIssue}`
    : null
  const linkedLinearIssue = workspaceRecord?.linkedLinearIssue ?? null
  const linearIssue = linkedLinearIssue
    ? (inputs.linearIssueCache[`selected::${linkedLinearIssue}`]?.data ??
      inputs.linearIssueCache[linkedLinearIssue]?.data)
    : null
  const linearIssueLabel = linkedLinearIssue
    ? linearIssue
      ? `${linearIssue.identifier}${
          linearIssue.state?.name ? ` ${linearIssue.state.name}` : ''
        }: ${linearIssue.title}`
      : linkedLinearIssue
    : null

  return {
    isActive: inputs.activeWorktreeId === worktree.worktreeId,
    canOpenWorkspace: workspaceRecord !== undefined,
    terminalTabCount: tabs.length,
    liveTerminalCount: countLiveTerminals(tabs, inputs.ptyIdsByTabId),
    activeAgentCount: countWorkspaceSpaceActiveAgents({
      worktreeId: worktree.worktreeId,
      tabs,
      agentStatusByPaneKey: inputs.agentStatusByPaneKey,
      migrationUnsupportedByPtyId: inputs.migrationUnsupportedByPtyId,
      runtimePaneTitlesByTabId: inputs.runtimePaneTitlesByTabId,
      ptyIdsByTabId: inputs.ptyIdsByTabId,
      now: inputs.now
    }),
    completedAgentCount: Object.values(inputs.retainedAgentsByPaneKey).filter(
      (entry) => entry.worktreeId === worktree.worktreeId && entry.entry.state === 'done'
    ).length,
    openEditorFileCount: openFiles.length,
    dirtyEditorBufferCount,
    browserTabCount: inputs.browserTabsByWorktree[worktree.worktreeId]?.length ?? 0,
    changedFileCount: gitEntries ? gitEntries.length : null,
    branchStatus: getBranchStatus(inputs.remoteStatusesByWorktree[worktree.worktreeId]),
    reviewLabel,
    issueLabel,
    linearIssueLabel
  }
}

function getTreemapFill(rect: TreemapRect, selected: boolean): string {
  if (selected) {
    return 'color-mix(in srgb, var(--ring) 40%, var(--card))'
  }
  return TREEMAP_FILLS[rect.index % TREEMAP_FILLS.length]
}

function Metric({
  label,
  value,
  title
}: {
  label: string
  value: string
  title?: string
}): React.JSX.Element {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-semibold tabular-nums" title={title}>
        {value}
      </div>
    </div>
  )
}

function UpdatedMetric({
  scannedAt,
  isScanning
}: {
  scannedAt: number | null
  isScanning: boolean
}): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (scannedAt === null) {
      return
    }
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [scannedAt])

  return (
    <Metric
      label="업데이트됨"
      title={scannedAt === null ? undefined : getWorkspaceSpaceScanDateTimeLabel(scannedAt)}
      value={
        scannedAt === null
          ? isScanning
            ? '검색 중'
            : '—'
          : getWorkspaceSpaceScanTimeLabel(scannedAt, now)
      }
    />
  )
}

function CheckButton({
  checked,
  disabled,
  label,
  onClick
}: {
  checked: boolean | 'mixed'
  disabled?: boolean
  label: string
  onClick: () => void
}): React.JSX.Element {
  const isChecked = checked === true
  const isMixed = checked === 'mixed'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled && 'cursor-default opacity-35'
      )}
    >
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded-sm border transition-colors',
          isChecked || isMixed
            ? 'border-foreground bg-foreground text-background'
            : 'border-muted-foreground/50 bg-background/40 text-transparent'
        )}
      >
        {isChecked ? <Check className="size-3" strokeWidth={3} /> : null}
        {isMixed ? <Minus className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  )
}

function SortIndicator({
  sortKey,
  activeKey,
  direction
}: {
  sortKey: WorkspaceSpaceSortKey
  activeKey: WorkspaceSpaceSortKey
  direction: WorkspaceSpaceSortDirection
}): React.JSX.Element {
  if (sortKey !== activeKey) {
    return <Circle className="size-3 opacity-0" />
  }
  return direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
}

function StatusBadge({
  worktree,
  decisionDetails,
  deleteState
}: {
  worktree: WorkspaceSpaceWorktree
  decisionDetails?: WorkspaceDecisionDetails
  deleteState?: WorkspaceSpaceDeleteState
}): React.JSX.Element {
  if (deleteState?.isDeleting) {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Deleting
      </Badge>
    )
  }
  if (deleteState?.error) {
    return (
      <Badge variant="outline" className="border-destructive/30 text-destructive">
        Failed
      </Badge>
    )
  }
  if (worktree.status !== 'ok') {
    return (
      <Badge variant="outline" className="border-destructive/30 text-destructive">
        {getWorkspaceSpaceStatusLabel(worktree.status)}
      </Badge>
    )
  }
  if (worktree.isMainWorktree) {
    return <Badge variant="outline">유지: 주 작업 트리</Badge>
  }
  if (decisionDetails?.isActive) {
    return <Badge variant="outline">유지: 활성</Badge>
  }
  if ((decisionDetails?.changedFileCount ?? 0) > 0) {
    return <Badge variant="outline">유지: 변경된 파일</Badge>
  }
  if (decisionDetails?.changedFileCount === null) {
    return <Badge variant="outline">유지: Git 미확인</Badge>
  }
  if ((decisionDetails?.dirtyEditorBufferCount ?? 0) > 0) {
    return <Badge variant="outline">유지: 저장되지 않은 수정</Badge>
  }
  if (
    (decisionDetails?.activeAgentCount ?? 0) > 0 ||
    (decisionDetails?.liveTerminalCount ?? 0) > 0 ||
    (decisionDetails?.browserTabCount ?? 0) > 0
  ) {
    return <Badge variant="outline">유지: 사용 중</Badge>
  }
  if (
    decisionDetails?.reviewLabel ||
    decisionDetails?.issueLabel ||
    decisionDetails?.linearIssueLabel
  ) {
    return <Badge variant="outline">유지: 연결됨</Badge>
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    >
      Can delete
    </Badge>
  )
}

function DecisionLine({
  icon,
  label,
  value,
  tone = 'default'
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'default' | 'warning'
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground [&>svg]:size-3',
          tone === 'warning' && 'border-destructive/25 bg-destructive/8 text-destructive'
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate text-xs" title={value}>
          {value}
        </div>
      </div>
    </div>
  )
}

function getAgentDecisionLabel(details: WorkspaceDecisionDetails): string {
  if (details.activeAgentCount > 0 && details.completedAgentCount > 0) {
    return `${pluralize(details.activeAgentCount, 'active agent')}, ${pluralize(
      details.completedAgentCount,
      'completed agent'
    )}`
  }
  if (details.activeAgentCount > 0) {
    return pluralize(details.activeAgentCount, 'active agent')
  }
  if (details.completedAgentCount > 0) {
    return `${pluralize(details.completedAgentCount, 'completed agent')} retained`
  }
  return 'No tracked agents running'
}

function getTerminalDecisionLabel(details: WorkspaceDecisionDetails): string {
  if (details.terminalTabCount === 0) {
    return '터미널 탭 없음'
  }
  return `${pluralize(details.liveTerminalCount, '활성 터미널')} / ${pluralize(details.terminalTabCount, '터미널 탭')}`
}

function getGitDecisionLabel(
  details: WorkspaceDecisionDetails,
  gitRefreshState?: WorkspaceGitRefreshState
): string {
  if (details.changedFileCount === null) {
    if (gitRefreshState?.error) {
      return `Git 상태를 사용할 수 없습니다: ${gitRefreshState.error}`
    }
    return 'Git 상태가 아직 불러와지지 않았습니다'
  }
  if (details.changedFileCount === 0) {
    return '커밋되지 않은 파일 없음'
  }
  return pluralize(details.changedFileCount, '변경된 파일')
}

function getEditorDecisionLabel(details: WorkspaceDecisionDetails): string {
  if (details.openEditorFileCount === 0) {
    return '열린 편집기 파일 없음'
  }
  if (details.dirtyEditorBufferCount === 0) {
    return `${pluralize(details.openEditorFileCount, '편집기 파일')} 열림`
  }
  return `${pluralize(details.dirtyEditorBufferCount, '변경된 편집기 버퍼')} / ${pluralize(
    details.openEditorFileCount,
    '열린 파일'
  )}`
}

function getDeleteDecisionLabel(
  worktree: WorkspaceSpaceWorktree,
  details: WorkspaceDecisionDetails
): string {
  if (details.isActive) {
    return '이것이 활성 작업 공간입니다'
  }
  if (worktree.status !== 'ok') {
    return worktree.error ?? getWorkspaceSpaceStatusLabel(worktree.status)
  }
  if (worktree.isMainWorktree) {
    return '주 작업 트리는 보호됩니다'
  }
  if (!worktree.canDelete) {
    return '작업 공간이 보호됩니다'
  }
  return '검토 후 삭제 가능'
}

function WorkspaceDecisionHoverCard({
  worktree,
  details,
  gitRefreshState,
  onOpenWorkspace
}: {
  worktree: WorkspaceSpaceWorktree
  details: WorkspaceDecisionDetails
  gitRefreshState?: WorkspaceGitRefreshState
  onOpenWorkspace: () => void
}): React.JSX.Element {
  const deleteDecision = getDeleteDecisionLabel(worktree, details)
  const issueLabel =
    [details.issueLabel, details.linearIssueLabel].filter(Boolean).join(' · ') || '연결된 이슈 없음'
  return (
    <HoverCardContent
      align="end"
      side="bottom"
      sideOffset={8}
      collisionPadding={12}
      className="max-h-[min(34rem,calc(100vh-1.5rem))] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto p-0 scrollbar-sleek"
    >
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{worktree.displayName}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {worktree.repoDisplayName} · {formatBytes(worktree.sizeBytes)}
            </div>
          </div>
          <StatusBadge worktree={worktree} decisionDetails={details} />
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <DecisionLine
          icon={<Trash2 />}
          label="삭제 판단"
          value={deleteDecision}
          tone={worktree.canDelete && worktree.status === 'ok' ? 'default' : 'warning'}
        />
        <DecisionLine icon={<Bot />} label="에이전트" value={getAgentDecisionLabel(details)} />
        <DecisionLine
          icon={<Terminal />}
          label="터미널"
          value={getTerminalDecisionLabel(details)}
        />
        <DecisionLine
          icon={<FileWarning />}
          label="Git 변경사항"
          value={getGitDecisionLabel(details, gitRefreshState)}
          tone={
            (details.changedFileCount ?? 0) > 0 || gitRefreshState?.error ? 'warning' : 'default'
          }
        />
        <DecisionLine
          icon={<FileWarning />}
          label="편집기 버퍼"
          value={getEditorDecisionLabel(details)}
          tone={details.dirtyEditorBufferCount > 0 ? 'warning' : 'default'}
        />
        <DecisionLine
          icon={<GitBranch />}
          label="브랜치"
          value={details.branchStatus ?? getWorkspaceSpaceBranchLabel(worktree)}
        />
        <DecisionLine
          icon={<GitPullRequest />}
          label="검토"
          value={details.reviewLabel ?? 'No linked PR'}
        />
        <DecisionLine icon={<ExternalLink />} label="Issue" value={issueLabel} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <div className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          {details.browserTabCount > 0
            ? `${pluralize(details.browserTabCount, 'browser tab')} open`
            : worktree.path}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onOpenWorkspace()
          }}
          disabled={!details.canOpenWorkspace}
          className="shrink-0 gap-1.5"
        >
          <ExternalLink className="size-3.5" />
          작업 공간으로 이동
        </Button>
      </div>
    </HoverCardContent>
  )
}

function WorkspaceTreemap({
  rows,
  isScanning,
  selectedWorktreeId,
  zoomedWorktree,
  onSelect,
  onZoomChange
}: {
  rows: WorkspaceSpaceWorktree[]
  isScanning: boolean
  selectedWorktreeId: string | null
  zoomedWorktree: WorkspaceSpaceWorktree | null
  onSelect: (worktreeId: string) => void
  onZoomChange: (worktreeId: string | null) => void
}): React.JSX.Element {
  const selectedWorktree = rows.find((row) => row.worktreeId === selectedWorktreeId) ?? null
  const canZoomSelected =
    !!selectedWorktree &&
    selectedWorktree.status === 'ok' &&
    selectedWorktree.topLevelItems.length > 0
  const isZoomed = !!zoomedWorktree
  const rects = useMemo(
    () =>
      buildTreemapLayout(
        zoomedWorktree
          ? zoomedWorktree.topLevelItems
              .filter((item) => item.sizeBytes > 0)
              .map((item) => ({
                id: item.path,
                label: item.name,
                sizeBytes: item.sizeBytes
              }))
          : rows
              .filter((row) => row.status === 'ok' && row.sizeBytes > 0)
              .map((row) => ({
                id: row.worktreeId,
                label: row.displayName,
                sizeBytes: row.sizeBytes
              }))
      ),
    [rows, zoomedWorktree]
  )

  if (rects.length === 0) {
    return (
      <div className="relative flex h-72 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
        {zoomedWorktree ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => onZoomChange(null)}
            className="absolute right-2 top-2 gap-1.5 bg-background/90 px-2.5 backdrop-blur"
          >
            <ZoomOut className="size-3" />
            전체
          </Button>
        ) : null}
        <span className="flex items-center gap-2">
          {isScanning ? <Loader2 className="size-4 animate-spin" /> : null}
          {isScanning
            ? '작업 공간 크기를 검색 중입니다. 이 페이지를 떠나도 됩니다.'
            : isZoomed
              ? '표시할 최상위 항목이 없습니다.'
              : '아직 검색된 작업 공간 크기가 없습니다.'}
        </span>
      </div>
    )
  }

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-border/70 bg-muted/20">
      <div className="absolute right-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-2">
        {zoomedWorktree ? (
          <>
            <div className="max-w-56 truncate rounded-md border border-border/70 bg-background/90 px-2 py-1 text-[11px] font-medium shadow-xs backdrop-blur">
              {zoomedWorktree.displayName}
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onZoomChange(null)}
              className="gap-1.5 bg-background/90 px-2.5 backdrop-blur"
            >
              <ZoomOut className="size-3" />
              전체
            </Button>
          </>
        ) : canZoomSelected ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => onZoomChange(selectedWorktree.worktreeId)}
            className="gap-1.5 bg-background/90 px-2.5 backdrop-blur"
          >
            <ZoomIn className="size-3" />
            확대
          </Button>
        ) : null}
      </div>
      {rects.map((rect) => {
        const area = rect.width * rect.height
        const selected = !isZoomed && rect.id === selectedWorktreeId
        const rectStyle = {
          left: `${rect.x}%`,
          top: `${rect.y}%`,
          width: `${rect.width}%`,
          height: `${rect.height}%`,
          background: getTreemapFill(rect, selected)
        }
        const rectContent =
          area >= 80 ? (
            <span className="block min-w-0 text-[11px] font-medium leading-tight text-foreground">
              <span className="block truncate">{rect.label}</span>
              {area >= 180 ? (
                <span className="mt-0.5 block truncate text-muted-foreground">
                  {formatBytes(rect.sizeBytes)}
                </span>
              ) : null}
            </span>
          ) : null

        if (isZoomed) {
          return (
            <div
              key={rect.id}
              title={`${rect.label} • ${formatBytes(rect.sizeBytes)}`}
              className="absolute overflow-hidden border border-background/80 p-2 text-left"
              style={rectStyle}
            >
              {rectContent}
            </div>
          )
        }

        return (
          <button
            key={rect.id}
            type="button"
            aria-label={`${rect.label}, ${formatBytes(rect.sizeBytes)}`}
            title={`${rect.label} • ${formatBytes(rect.sizeBytes)}`}
            onClick={() => onSelect(rect.id)}
            className={cn(
              'absolute overflow-hidden border border-background/80 p-2 text-left transition-[filter,outline] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'ring-2 ring-ring ring-offset-1 ring-offset-background'
            )}
            style={rectStyle}
          >
            {rectContent}
          </button>
        )
      })}
    </div>
  )
}

function SizeBar({ value, max }: { value: number; max: number }): React.JSX.Element {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-foreground/65" style={{ width: `${pct}%` }} />
    </div>
  )
}

function BreakdownList({
  worktree,
  isScanning
}: {
  worktree: WorkspaceSpaceWorktree | null
  isScanning: boolean
}): React.JSX.Element {
  if (!worktree) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {isScanning ? <Loader2 className="size-4 animate-spin" /> : null}
          {isScanning
            ? '작업 공간 크기를 검색 중입니다. 이 페이지를 떠나도 됩니다.'
            : '검사할 작업 공간을 선택하세요.'}
        </span>
      </div>
    )
  }

  const maxChildSize = getLargestWorkspaceSpaceItemSize(worktree.topLevelItems)
  const topLevelItemCount = worktree.topLevelItems.length + worktree.omittedTopLevelItemCount
  return (
    <div className="min-h-72 rounded-lg border border-border/70 bg-background/35">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{worktree.displayName}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {worktree.repoDisplayName}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums">
              {formatBytes(worktree.sizeBytes)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formatCompactCount(topLevelItemCount)}개 최상위 항목
            </div>
          </div>
        </div>
      </div>

      {worktree.status !== 'ok' ? (
        <div className="flex items-start gap-2 px-4 py-4 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{worktree.error ?? '검색 실패.'}</span>
        </div>
      ) : worktree.topLevelItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">파일이 없습니다.</div>
      ) : (
        <div className="max-h-72 overflow-y-auto scrollbar-sleek px-3 py-3">
          <div className="space-y-2">
            {worktree.topLevelItems.slice(0, 12).map((item) => (
              <BreakdownRow key={`${item.path}:${item.name}`} item={item} maxSize={maxChildSize} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BreakdownRow({
  item,
  maxSize
}: {
  item: WorkspaceSpaceItem
  maxSize: number
}): React.JSX.Element {
  return (
    <div className="space-y-1.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-medium">{item.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatBytes(item.sizeBytes)}
        </span>
      </div>
      <SizeBar value={item.sizeBytes} max={maxSize} />
    </div>
  )
}

function WorkspaceRow({
  worktree,
  maxSize,
  selected,
  inspected,
  decisionDetails,
  gitRefreshState,
  deleteState,
  onToggleSelected,
  onInspect,
  onOpenWorkspace,
  onDelete,
  onForceDelete
}: {
  worktree: WorkspaceSpaceWorktree
  maxSize: number
  selected: boolean
  inspected: boolean
  decisionDetails: WorkspaceDecisionDetails
  gitRefreshState?: WorkspaceGitRefreshState
  deleteState?: WorkspaceSpaceDeleteState
  onToggleSelected: () => void
  onInspect: () => void
  onOpenWorkspace: () => void
  onDelete: () => void
  onForceDelete: () => void
}): React.JSX.Element {
  const isDeleting = deleteState?.isDeleting ?? false
  const deleteError = deleteState?.error ?? null
  const canForceDelete = deleteState?.canForceDelete ?? false
  const canDelete = isWorkspaceSpaceRowReadyToDelete(worktree, decisionDetails) && !isDeleting
  const handleForceDelete = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    onForceDelete()
  }
  const row = (
    <div
      role="button"
      tabIndex={0}
      aria-busy={isDeleting}
      onClick={onInspect}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return
        }
        event.preventDefault()
        onInspect()
      }}
      className={cn(
        'grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1.25fr)_minmax(9rem,0.55fr)_8rem_9.5rem] items-center gap-3 border-b border-border/45 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        inspected && 'bg-accent/55',
        isDeleting && 'cursor-wait opacity-50 grayscale hover:bg-transparent'
      )}
    >
      <CheckButton
        checked={canDelete && selected}
        disabled={!canDelete}
        label={`Select ${worktree.displayName}`}
        onClick={onToggleSelected}
      />

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-medium">{worktree.displayName}</span>
          {worktree.isRemote ? (
            <Server className="size-3.5 shrink-0 text-muted-foreground" />
          ) : null}
          {worktree.isSparse ? <Badge variant="outline">희소</Badge> : null}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <GitBranch className="size-3 shrink-0" />
          <span className="truncate">{getWorkspaceSpaceBranchLabel(worktree)}</span>
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {worktree.path}
        </div>
        {deleteError ? (
          <div className="mt-2 flex min-w-0 items-start gap-2 rounded-md border border-destructive/35 bg-destructive/8 px-2 py-1.5 text-[11px] text-destructive">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0 flex-1 break-words" title={deleteError}>
              {deleteError}
            </span>
            {canForceDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={handleForceDelete}
                className="h-6 shrink-0 gap-1 px-2"
              >
                <Trash2 className="size-3" />
                Force
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 text-xs">
        <div className="truncate font-medium">{worktree.repoDisplayName}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {worktree.repoPath}
        </div>
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="text-right text-sm font-medium tabular-nums">
          {worktree.status === 'ok' ? formatBytes(worktree.sizeBytes) : '—'}
        </div>
        <SizeBar value={worktree.sizeBytes} max={maxSize} />
      </div>

      <div className="flex justify-end">
        <HoverCard openDelay={250} closeDelay={120}>
          <HoverCardTrigger asChild>
            <span
              className="inline-flex"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <StatusBadge
                worktree={worktree}
                decisionDetails={decisionDetails}
                deleteState={deleteState}
              />
            </span>
          </HoverCardTrigger>
          <WorkspaceDecisionHoverCard
            worktree={worktree}
            details={decisionDetails}
            gitRefreshState={gitRefreshState}
            onOpenWorkspace={onOpenWorkspace}
          />
        </HoverCard>
      </div>
    </div>
  )

  if (!canDelete) {
    return row
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="size-3.5" />
          Delete workspace
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function WorkspaceSpaceManagerPanel(): React.JSX.Element {
  const analysis = useAppStore((state) => state.workspaceSpaceAnalysis)
  const progress = useAppStore((state) => state.workspaceSpaceScanProgress)
  const scanError = useAppStore((state) => state.workspaceSpaceScanError)
  const isScanning = useAppStore((state) => state.workspaceSpaceScanning)
  const refreshWorkspaceSpace = useAppStore((state) => state.refreshWorkspaceSpace)
  const cancelWorkspaceSpaceScan = useAppStore((state) => state.cancelWorkspaceSpaceScan)
  const removeWorkspaceSpaceWorktrees = useAppStore((state) => state.removeWorkspaceSpaceWorktrees)
  const removeWorktree = useAppStore((state) => state.removeWorktree)
  const deleteStateByWorktreeId = useAppStore((state) => state.deleteStateByWorktreeId)
  const worktreeMap = useAppStore((state) => getWorktreeMapFromState(state))
  const tabsByWorktree = useAppStore((state) => state.tabsByWorktree)
  const ptyIdsByTabId = useAppStore((state) => state.ptyIdsByTabId)
  const agentStatusByPaneKey = useAppStore((state) => state.agentStatusByPaneKey)
  const migrationUnsupportedByPtyId = useAppStore((state) => state.migrationUnsupportedByPtyId)
  const runtimePaneTitlesByTabId = useAppStore((state) => state.runtimePaneTitlesByTabId)
  const agentStatusEpoch = useAppStore((state) => state.agentStatusEpoch)
  const retainedAgentsByPaneKey = useAppStore((state) => state.retainedAgentsByPaneKey)
  const openFiles = useAppStore((state) => state.openFiles)
  const editorDrafts = useAppStore((state) => state.editorDrafts)
  const browserTabsByWorktree = useAppStore((state) => state.browserTabsByWorktree)
  const gitStatusByWorktree = useAppStore((state) => state.gitStatusByWorktree)
  const remoteStatusesByWorktree = useAppStore((state) => state.remoteStatusesByWorktree)
  const hostedReviewCache = useAppStore((state) => state.hostedReviewCache)
  const issueCache = useAppStore((state) => state.issueCache)
  const linearIssueCache = useAppStore((state) => state.linearIssueCache)
  const settings = useAppStore((state) => state.settings)
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const setGitStatus = useAppStore((state) => state.setGitStatus)
  const updateWorktreeGitIdentity = useAppStore((state) => state.updateWorktreeGitIdentity)
  const setUpstreamStatus = useAppStore((state) => state.setUpstreamStatus)
  const fetchUpstreamStatus = useAppStore((state) => state.fetchUpstreamStatus)
  const [query, setQuery] = useState('')
  const [onlyDeletable, setOnlyDeletable] = useState(false)
  const [sortKey, setSortKey] = useState<WorkspaceSpaceSortKey>('size')
  const [sortDirection, setSortDirection] = useState<WorkspaceSpaceSortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [inspectedWorktreeId, setInspectedWorktreeId] = useState<string | null>(null)
  const [treemapZoomWorktreeId, setTreemapZoomWorktreeId] = useState<string | null>(null)
  const [gitRefreshStateByWorktreeId, setGitRefreshStateByWorktreeId] = useState<
    Record<string, WorkspaceGitRefreshState>
  >({})
  const inFlightGitStatusRefreshes = useRef<Set<string>>(new Set())

  const refresh = useCallback((): void => {
    void refreshWorkspaceSpace().catch(() => {
      /* scanError is stored by the slice */
    })
  }, [refreshWorkspaceSpace])

  const cancelScan = useCallback((): void => {
    void cancelWorkspaceSpaceScan()
  }, [cancelWorkspaceSpaceScan])

  const sourceRows = useMemo(() => analysis?.worktrees ?? [], [analysis?.worktrees])
  const decisionDetailsByWorktreeId = useMemo(() => {
    // Why: active-agent freshness is time-based. The epoch bumps when fresh
    // hook entries cross the stale boundary so delete readiness recomputes.
    void agentStatusEpoch
    const details = new Map<string, WorkspaceDecisionDetails>()
    const now = Date.now()
    for (const worktree of sourceRows) {
      details.set(
        worktree.worktreeId,
        getWorkspaceDecisionDetails(worktree, {
          worktreeMap,
          tabsByWorktree,
          ptyIdsByTabId,
          agentStatusByPaneKey,
          migrationUnsupportedByPtyId,
          runtimePaneTitlesByTabId,
          retainedAgentsByPaneKey,
          openFiles,
          editorDrafts,
          browserTabsByWorktree,
          gitStatusByWorktree,
          remoteStatusesByWorktree,
          hostedReviewCache,
          issueCache,
          linearIssueCache,
          settings,
          activeWorktreeId,
          now
        })
      )
    }
    return details
  }, [
    activeWorktreeId,
    agentStatusEpoch,
    agentStatusByPaneKey,
    browserTabsByWorktree,
    editorDrafts,
    gitStatusByWorktree,
    hostedReviewCache,
    issueCache,
    linearIssueCache,
    openFiles,
    ptyIdsByTabId,
    remoteStatusesByWorktree,
    retainedAgentsByPaneKey,
    migrationUnsupportedByPtyId,
    runtimePaneTitlesByTabId,
    settings,
    sourceRows,
    tabsByWorktree,
    worktreeMap
  ])
  const isWorktreeDeleting = useCallback(
    (worktreeId: string): boolean => deleteStateByWorktreeId[worktreeId]?.isDeleting ?? false,
    [deleteStateByWorktreeId]
  )
  const refreshWorkspaceGitStatus = useCallback(
    (worktree: WorkspaceSpaceWorktree): Promise<void> => {
      const currentState = useAppStore.getState()
      if (currentState.gitStatusByWorktree[worktree.worktreeId] !== undefined) {
        return Promise.resolve()
      }
      if (inFlightGitStatusRefreshes.current.has(worktree.worktreeId)) {
        return Promise.resolve()
      }
      inFlightGitStatusRefreshes.current.add(worktree.worktreeId)

      setGitRefreshStateByWorktreeId((current) => ({
        ...current,
        [worktree.worktreeId]: { isRefreshing: true, error: null }
      }))

      return refreshGitStatusForWorktree({
        settings,
        worktreeId: worktree.worktreeId,
        worktreePath: worktree.path,
        connectionId:
          currentState.repos.find((repo) => repo.id === worktree.repoId)?.connectionId ?? undefined,
        deps: {
          setGitStatus,
          updateWorktreeGitIdentity,
          setUpstreamStatus,
          fetchUpstreamStatus
        }
      })
        .then(() => {
          if (useAppStore.getState().gitStatusByWorktree[worktree.worktreeId] === undefined) {
            setGitStatus(worktree.worktreeId, {
              conflictOperation: 'unknown',
              entries: [],
              ignoredPaths: []
            } as GitStatusResult)
          }
          setGitRefreshStateByWorktreeId((current) => ({
            ...current,
            [worktree.worktreeId]: { isRefreshing: false, error: null }
          }))
        })
        .catch((error: unknown) => {
          setGitRefreshStateByWorktreeId((current) => ({
            ...current,
            [worktree.worktreeId]: {
              isRefreshing: false,
              error: error instanceof Error ? error.message : String(error)
            }
          }))
        })
        .finally(() => {
          inFlightGitStatusRefreshes.current.delete(worktree.worktreeId)
        })
    },
    [fetchUpstreamStatus, setGitStatus, setUpstreamStatus, settings, updateWorktreeGitIdentity]
  )
  const isWorktreeUnavailableForDelete = useCallback(
    (worktreeId: string): boolean => {
      if (isWorktreeDeleting(worktreeId)) {
        return true
      }
      const worktree = sourceRows.find((row) => row.worktreeId === worktreeId)
      return (
        !worktree ||
        !isWorkspaceSpaceRowReadyToDelete(worktree, decisionDetailsByWorktreeId.get(worktreeId))
      )
    },
    [decisionDetailsByWorktreeId, isWorktreeDeleting, sourceRows]
  )

  const rows = useMemo(
    () =>
      sortWorkspaceSpaceRows(
        filterWorkspaceSpaceRows(sourceRows, query, onlyDeletable),
        sortKey,
        sortDirection
      ),
    [onlyDeletable, query, sortDirection, sortKey, sourceRows]
  )

  const nextInspectedWorktreeId = resolveWorkspaceSpaceInspectedWorktreeId(
    sourceRows,
    inspectedWorktreeId
  )
  const nextSelectedIds = pruneWorkspaceSpaceSelectedIds(sourceRows, selectedIds)
  const nextTreemapZoomWorktreeId = resolveWorkspaceSpaceTreemapZoomWorktreeId(
    sourceRows,
    treemapZoomWorktreeId
  )
  // Why: these ids are local UI state derived from the latest scan rows. Repair
  // them before commit so stale selections cannot flash after a scan changes.
  if (inspectedWorktreeId !== nextInspectedWorktreeId) {
    setInspectedWorktreeId(nextInspectedWorktreeId)
  }
  if (nextSelectedIds !== selectedIds) {
    setSelectedIds(nextSelectedIds)
  }
  if (treemapZoomWorktreeId !== nextTreemapZoomWorktreeId) {
    setTreemapZoomWorktreeId(nextTreemapZoomWorktreeId)
  }

  useEffect(() => {
    const candidates = getWorkspaceSpaceGitStatusRefreshCandidates(sourceRows)
    if (candidates.length === 0) {
      return
    }

    let cancelled = false
    let nextIndex = 0
    const runWorker = async (): Promise<void> => {
      while (!cancelled) {
        const worktree = candidates[nextIndex]
        nextIndex += 1
        if (!worktree) {
          return
        }
        await refreshWorkspaceGitStatus(worktree)
      }
    }
    const workerCount = Math.min(GIT_STATUS_REFRESH_CONCURRENCY, candidates.length)
    void Promise.all(Array.from({ length: workerCount }, () => runWorker()))

    return () => {
      cancelled = true
    }
  }, [refreshWorkspaceGitStatus, sourceRows])

  const inspectedWorktree =
    rows.find((row) => row.worktreeId === nextInspectedWorktreeId) ??
    rows.find((row) => row.status === 'ok') ??
    null
  const zoomedWorktree =
    sourceRows.find((row) => row.worktreeId === nextTreemapZoomWorktreeId && row.status === 'ok') ??
    null
  const maxSize = getLargestWorkspaceSpaceRowSize(rows)
  const selectedDeletableIds = useMemo(
    () => getSelectedDeletableWorkspaceIds(rows, nextSelectedIds, isWorktreeUnavailableForDelete),
    [isWorktreeUnavailableForDelete, nextSelectedIds, rows]
  )
  const selectedDeletableIdSet = useMemo(
    () => new Set(selectedDeletableIds),
    [selectedDeletableIds]
  )
  const visibleDeletableIds = useMemo(
    () => getVisibleDeletableWorkspaceIds(rows, isWorktreeUnavailableForDelete),
    [isWorktreeUnavailableForDelete, rows]
  )
  const allVisibleSelected =
    visibleDeletableIds.length > 0 && visibleDeletableIds.every((id) => nextSelectedIds.has(id))
  const someVisibleSelected = visibleDeletableIds.some((id) => nextSelectedIds.has(id))
  const visibleSelectionState = allVisibleSelected ? true : someVisibleSelected ? 'mixed' : false
  const isInitialScan = isScanning && !analysis
  const hasRows = sourceRows.length > 0
  const progressLabel = getWorkspaceSpaceProgressLabel(progress)
  const repoErrors = analysis?.repos.filter((repo) => repo.error !== null) ?? []
  const selectedReclaimableBytes = useMemo(
    () =>
      rows
        .filter((row) => selectedDeletableIdSet.has(row.worktreeId))
        .reduce((sum, row) => sum + row.reclaimableBytes, 0),
    [rows, selectedDeletableIdSet]
  )

  const toggleSort = (key: WorkspaceSpaceSortKey): void => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'name' || key === 'repo' ? 'asc' : 'desc')
  }

  const selectSortKey = (key: WorkspaceSpaceSortKey): void => {
    setSortKey(key)
    setSortDirection(key === 'name' || key === 'repo' ? 'asc' : 'desc')
  }

  const toggleSelection = (worktreeId: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(worktreeId)) {
        next.delete(worktreeId)
      } else {
        next.add(worktreeId)
      }
      return next
    })
  }

  const toggleVisibleSelection = (): void => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        for (const id of visibleDeletableIds) {
          next.delete(id)
        }
      } else {
        for (const id of visibleDeletableIds) {
          next.add(id)
        }
      }
      return next
    })
  }

  const handleDeletedWorktrees = useCallback(
    (deletedIds: readonly string[]): void => {
      if (deletedIds.length === 0) {
        return
      }
      removeWorkspaceSpaceWorktrees(deletedIds)
      setInspectedWorktreeId((current) =>
        current && deletedIds.includes(current) ? null : current
      )
      setTreemapZoomWorktreeId((current) =>
        current && deletedIds.includes(current) ? null : current
      )
      setSelectedIds((current) => {
        const next = new Set(current)
        for (const id of deletedIds) {
          next.delete(id)
        }
        return next
      })
      toast.success(
        deletedIds.length === 1 ? '작업 공간을 삭제했습니다' : '작업 공간을 삭제했습니다',
        {
          description: `${deletedIds.length}개 작업 공간을 Space에서 제거했습니다.`
        }
      )
    },
    [removeWorkspaceSpaceWorktrees]
  )

  const deleteWorktrees = useCallback(
    (worktreeIds: readonly string[]): void => {
      if (worktreeIds.length === 0) {
        return
      }
      runWorktreeBatchDelete(worktreeIds, {
        forceConfirm: true,
        onDeleted: handleDeletedWorktrees
      })
    },
    [handleDeletedWorktrees]
  )

  const forceDeleteWorktree = useCallback(
    (worktree: WorkspaceSpaceWorktree): void => {
      // Why: Space keeps normal deletes non-force so uncommitted work is not
      // discarded silently; a failed row gets this explicit recovery path.
      void removeWorktree(worktree.worktreeId, true)
        .then((result) => {
          if (!result.ok) {
            toast.error('Force delete failed', {
              description: result.error
            })
            return
          }
          handleDeletedWorktrees([worktree.worktreeId])
        })
        .catch((error: unknown) => {
          toast.error('Force delete failed', {
            description: error instanceof Error ? error.message : String(error)
          })
        })
    },
    [handleDeletedWorktrees, removeWorktree]
  )

  const deleteSelected = (): void => {
    if (selectedDeletableIds.length === 0) {
      return
    }
    deleteWorktrees(selectedDeletableIds)
  }

  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-lg border border-border/65 bg-background/35 md:grid-cols-4 md:divide-x md:divide-border/60">
        <Metric label="검색됨" value={analysis ? formatBytes(analysis.totalSizeBytes) : '—'} />
        <Metric label="회수 가능" value={analysis ? formatBytes(analysis.reclaimableBytes) : '—'} />
        <Metric
          label="작업 공간"
          value={
            analysis
              ? analysis.unavailableWorktreeCount > 0
                ? `${analysis.scannedWorktreeCount}/${analysis.worktreeCount}`
                : String(analysis.scannedWorktreeCount)
              : '—'
          }
        />
        <UpdatedMetric scannedAt={analysis?.scannedAt ?? null} isScanning={isScanning} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {isScanning ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : (
            <HardDrive className="size-4 shrink-0" />
          )}
          <span className="truncate">
            {analysis
              ? isScanning
                ? `${progressLabel ?? '작업 공간 크기 검색 중'}. 이 페이지를 떠나도 마지막 결과는 유지됩니다.`
                : `${formatBytes(analysis.reclaimableBytes)}를 연결된 작업 트리에서 회수할 수 있습니다.`
              : isScanning
                ? `${progressLabel ?? '작업 공간 크기 검색 중'}. 이 페이지를 떠나도 됩니다.`
                : '작업 공간 크기를 확인하려면 검색을 실행하세요.'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={isScanning ? cancelScan : refresh}
          disabled={progress?.state === 'cancelling'}
          className="w-28 gap-1.5"
        >
          {isScanning ? (
            progress?.state === 'cancelling' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {isScanning
            ? progress?.state === 'cancelling'
              ? '중지 중'
              : '취소'
            : analysis
              ? '새로고침'
              : '검색'}
        </Button>
      </div>

      {scanError ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/35 bg-destructive/8 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">
            {scanError}
            {analysis ? ' 마지막 성공 결과는 계속 보입니다.' : ''}
          </span>
        </div>
      ) : null}

      {repoErrors.length > 0 ? (
        <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {repoErrors.map((repo) => (
            <div key={repo.repoId} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                {repo.displayName}: {repo.error}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {hasRows || isInitialScan ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
          <WorkspaceTreemap
            rows={sourceRows}
            isScanning={isInitialScan}
            selectedWorktreeId={inspectedWorktree?.worktreeId ?? null}
            zoomedWorktree={zoomedWorktree}
            onSelect={setInspectedWorktreeId}
            onZoomChange={setTreemapZoomWorktreeId}
          />
          <BreakdownList worktree={inspectedWorktree} isScanning={isInitialScan} />
        </div>
      ) : null}

      {hasRows ? (
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-background/95 px-3 py-2 shadow-xs backdrop-blur">
          <div className="min-w-0 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {selectedDeletableIds.length}개 선택됨
            </span>
            <span className="mx-1.5">·</span>
            <span>{formatBytes(selectedReclaimableBytes)} 회수 가능</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set<string>())}
              disabled={selectedDeletableIds.length === 0}
              className="!px-3"
            >
              해제
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
              disabled={selectedDeletableIds.length === 0}
              className="min-w-[9.5rem] gap-1.5 !px-3.5"
            >
              <Trash2 className="size-3.5" />
              선택 항목 삭제
            </Button>
          </div>
        </div>
      ) : null}

      {hasRows ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="작업 공간 필터"
              className="pl-9"
            />
          </div>

          <Select
            value={sortKey}
            onValueChange={(value) => selectSortKey(value as WorkspaceSpaceSortKey)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="size">크기</SelectItem>
              <SelectItem value="name">이름</SelectItem>
              <SelectItem value="repo">저장소</SelectItem>
              <SelectItem value="activity">활동</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={onlyDeletable ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setOnlyDeletable((current) => !current)}
            className="w-32"
            aria-label="삭제 가능한 작업 공간만 표시"
          >
            {onlyDeletable ? '삭제 가능' : '전체'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleVisibleSelection}
            disabled={visibleDeletableIds.length === 0}
            className="w-32 gap-1.5"
            aria-label={allVisibleSelected ? '보이는 선택 해제' : '보이는 삭제 가능 작업 공간 선택'}
          >
            <Check className="size-3.5" />
            {allVisibleSelected ? '해제' : '선택'}
          </Button>
        </div>
      ) : null}

      {hasRows || isInitialScan ? (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-background/30">
          <div className="min-w-[46rem]">
            <div className="grid grid-cols-[1.75rem_minmax(0,1.25fr)_minmax(9rem,0.55fr)_8rem_9.5rem] gap-3 border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <div className="flex items-center">
                <CheckButton
                  checked={visibleSelectionState}
                  disabled={visibleDeletableIds.length === 0}
                  label={
                    allVisibleSelected ? '보이는 선택 해제' : '보이는 삭제 가능 작업 공간 선택'
                  }
                  onClick={toggleVisibleSelection}
                />
              </div>
              <button
                type="button"
                onClick={() => toggleSort('name')}
                className="flex items-center gap-1 text-left"
              >
                작업 공간
                <SortIndicator sortKey="name" activeKey={sortKey} direction={sortDirection} />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('repo')}
                className="flex items-center gap-1 text-left"
              >
                저장소
                <SortIndicator sortKey="repo" activeKey={sortKey} direction={sortDirection} />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('size')}
                className="flex items-center justify-end gap-1 text-right"
              >
                크기
                <SortIndicator sortKey="size" activeKey={sortKey} direction={sortDirection} />
              </button>
              <div className="text-right">상태</div>
            </div>

            <div className="max-h-[28rem] overflow-y-auto scrollbar-sleek">
              {isInitialScan ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  작업 공간을 검색 중입니다. 이 페이지를 떠나도 됩니다.
                </div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  일치하는 작업 공간이 없습니다.
                </div>
              ) : (
                rows.map((worktree) => (
                  <WorkspaceRow
                    key={worktree.worktreeId}
                    worktree={worktree}
                    maxSize={maxSize}
                    selected={nextSelectedIds.has(worktree.worktreeId)}
                    inspected={inspectedWorktree?.worktreeId === worktree.worktreeId}
                    decisionDetails={
                      decisionDetailsByWorktreeId.get(worktree.worktreeId) ??
                      getWorkspaceDecisionDetails(worktree, {
                        worktreeMap,
                        tabsByWorktree,
                        ptyIdsByTabId,
                        agentStatusByPaneKey,
                        migrationUnsupportedByPtyId,
                        runtimePaneTitlesByTabId,
                        retainedAgentsByPaneKey,
                        openFiles,
                        editorDrafts,
                        browserTabsByWorktree,
                        gitStatusByWorktree,
                        remoteStatusesByWorktree,
                        hostedReviewCache,
                        issueCache,
                        linearIssueCache,
                        settings,
                        activeWorktreeId,
                        now: Date.now()
                      })
                    }
                    gitRefreshState={gitRefreshStateByWorktreeId[worktree.worktreeId]}
                    deleteState={deleteStateByWorktreeId[worktree.worktreeId]}
                    onToggleSelected={() => toggleSelection(worktree.worktreeId)}
                    onInspect={() => setInspectedWorktreeId(worktree.worktreeId)}
                    onOpenWorkspace={() => activateAndRevealWorktree(worktree.worktreeId)}
                    onDelete={() => deleteWorktrees([worktree.worktreeId])}
                    onForceDelete={() => forceDeleteWorktree(worktree)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 bg-background/30 px-4 py-10 text-center text-sm text-muted-foreground">
          {scanError
            ? '작업 공간 크기를 수집하기 전에 검색에 실패했습니다.'
            : analysis
              ? '검색에서 사용할 수 있는 작업 공간 행이 없습니다.'
              : '작업 공간 크기를 확인하려면 검색을 실행하세요.'}
        </div>
      )}
    </div>
  )
}
