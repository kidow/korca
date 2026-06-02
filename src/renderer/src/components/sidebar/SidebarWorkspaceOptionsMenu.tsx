import React, { useCallback, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AgentActivityDisplayMode, WorktreeCardProperty } from '../../../../shared/types'
import { DEFAULT_SHOW_SLEEPING_WORKSPACES } from '../../../../shared/constants'
import SidebarRepositoryFilterSection from './SidebarRepositoryFilterSection'
import SidebarWorkspaceFilterSection from './SidebarWorkspaceFilterSection'

type SidebarWorkspaceOptionsMenuProps = {
  preserveWorkspaceBoardOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
}

const GROUP_BY_OPTIONS = [
  { id: 'none', label: '없음' },
  { id: 'workspace-status', label: '상태' },
  { id: 'pr-status', label: 'PR' },
  { id: 'repo', label: '프로젝트' }
] as const

const CARD_LAYOUT_OPTIONS = [
  { id: 'detailed', label: '상세' },
  { id: 'compact', label: '간단' }
] as const

const PROPERTY_OPTIONS: { id: WorktreeCardProperty; label: string }[] = [
  { id: 'issue', label: 'GitHub 티켓' },
  { id: 'linear-issue', label: 'Linear 이슈' },
  { id: 'pr', label: 'PR/MR 링크' },
  { id: 'comment', label: '메모' },
  { id: 'ports', label: '포트' },
  // Why: toggles the inline "Agent activity" list rendered below each
  // workspace card body (see WorktreeCard -> WorktreeCardAgents). Off hides
  // the list; there is no alternate surface.
  { id: 'inline-agents', label: '에이전트 활동' }
]

const AGENT_ACTIVITY_DISPLAY_OPTIONS: { id: AgentActivityDisplayMode; label: string }[] = [
  { id: 'compact', label: '간단' },
  { id: 'full', label: '전체 목록' }
]

const SORT_OPTIONS = [
  { id: 'name', label: '이름', description: null },
  {
    id: 'smart',
    label: '에이전트 활동',
    description: '주의가 필요한 에이전트, 그다음 최근 활동 순.'
  },
  { id: 'recent', label: '최근', description: null },
  { id: 'repo', label: '프로젝트', description: null },
  {
    id: 'manual',
    label: '수동',
    description: '작업 공간을 드래그해 그룹 안에서 정렬합니다.'
  }
] as const

const SidebarWorkspaceOptionsMenu = React.memo(function SidebarWorkspaceOptionsMenu({
  preserveWorkspaceBoardOpen = false,
  onMenuOpenChange
}: SidebarWorkspaceOptionsMenuProps) {
  const showSleepingWorkspaces = useAppStore((s) => s.showSleepingWorkspaces)
  const hideDefaultBranchWorkspace = useAppStore((s) => s.hideDefaultBranchWorkspace)
  const filterRepoIds = useAppStore((s) => s.filterRepoIds)
  const repos = useAppStore((s) => s.repos)
  const worktreeCardProperties = useAppStore((s) => s.worktreeCardProperties)
  const toggleWorktreeCardProperty = useAppStore((s) => s.toggleWorktreeCardProperty)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const agentActivityDisplayMode = useAppStore((s) => s.agentActivityDisplayMode)
  const setAgentActivityDisplayMode = useAppStore((s) => s.setAgentActivityDisplayMode)
  const sortBy = useAppStore((s) => s.sortBy)
  const setSortBy = useAppStore((s) => s.setSortBy)
  const groupBy = useAppStore((s) => s.groupBy)
  const setGroupBy = useAppStore((s) => s.setGroupBy)

  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      onMenuOpenChange?.(next)
    },
    [onMenuOpenChange]
  )

  // Why: derive from current repos so stale ids (e.g. lingering after a repo
  // is removed) don't inflate counts or falsely signal an applied filter.
  const selectedCount = useMemo(() => {
    let count = 0
    for (const repo of repos) {
      if (filterRepoIds.includes(repo.id)) {
        count += 1
      }
    }
    return count
  }, [repos, filterRepoIds])
  const hasRepoFilter = selectedCount > 0
  const hasSleepingFilter = showSleepingWorkspaces !== DEFAULT_SHOW_SLEEPING_WORKSPACES
  const hasAnyFilter = hasSleepingFilter || hideDefaultBranchWorkspace || hasRepoFilter
  const activeFilterCount =
    (hasSleepingFilter ? 1 : 0) + (hideDefaultBranchWorkspace ? 1 : 0) + selectedCount
  const activeFilterLabel = `${activeFilterCount}개 필터`
  const sortLabel = SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label ?? '정렬'
  const cardLayout = settings?.experimentalCompactWorktreeCards ? 'compact' : 'detailed'
  const cardLayoutLabel =
    CARD_LAYOUT_OPTIONS.find((opt) => opt.id === cardLayout)?.label ?? 'Detailed'
  const visiblePropertyCount = PROPERTY_OPTIONS.filter((opt) =>
    worktreeCardProperties.includes(opt.id)
  ).length

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              className="relative text-muted-foreground"
              aria-label={
                hasAnyFilter ? `작업 공간 옵션 (${activeFilterLabel} 활성)` : '작업 공간 옵션'
              }
              data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={2.25} />
              {hasAnyFilter && (
                // Why: this combined options button now owns filtering, so it
                // needs the same at-a-glance signal that the old filter button had.
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium leading-none text-primary-foreground"
                >
                  {activeFilterCount > 9 ? '9+' : activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {hasAnyFilter ? `작업 공간 옵션 (${activeFilterLabel})` : '작업 공간 옵션'}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-72 pb-2"
        data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
      >
        <DropdownMenuLabel>그룹 기준</DropdownMenuLabel>
        <div className="px-2 pt-0.5 pb-1">
          <ToggleGroup
            type="single"
            value={groupBy}
            onValueChange={(v) => {
              if (v) {
                setGroupBy(v as typeof groupBy)
              }
            }}
            variant="outline"
            size="sm"
            className="h-6 w-full justify-stretch"
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.id}
                value={opt.id}
                className="h-6 grow basis-0 px-1 text-[10px] data-[state=on]:bg-foreground/10 data-[state=on]:font-semibold data-[state=on]:text-foreground"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex flex-1 items-center justify-between">
              <span>정렬 기준</span>
              <span className="text-[11px] font-medium text-muted-foreground">{sortLabel}</span>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="w-44"
            data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
          >
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => setSortBy(v as typeof sortBy)}
            >
              {SORT_OPTIONS.map((opt) => {
                const radioItem = (
                  <DropdownMenuRadioItem
                    key={opt.id}
                    value={opt.id}
                    // Keep the menu open so people can compare sort modes and
                    // toggle card properties without reopening the same panel.
                    onSelect={(e) => e.preventDefault()}
                  >
                    {opt.label}
                  </DropdownMenuRadioItem>
                )
                if (!opt.description) {
                  return radioItem
                }
                return (
                  <Tooltip key={opt.id}>
                    <TooltipTrigger asChild>{radioItem}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={6}>
                      {opt.description}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex flex-1 items-center justify-between">
              <span>카드 레이아웃</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {cardLayoutLabel}
              </span>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="w-44"
            data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
          >
            <DropdownMenuRadioGroup
              value={cardLayout}
              onValueChange={(value) => {
                void updateSettings({
                  experimentalCompactWorktreeCards: value === 'compact'
                })
              }}
            >
              {CARD_LAYOUT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem
                  key={opt.id}
                  value={opt.id}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            disabled={cardLayout === 'compact'}
            className="data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <span className="flex flex-1 items-center justify-between">
              <span>속성 표시</span>
              {cardLayout === 'compact' ? (
                <span className="text-[11px] font-medium text-muted-foreground">상세만</span>
              ) : visiblePropertyCount > 0 ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {visiblePropertyCount}
                </span>
              ) : null}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="w-48"
            data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
          >
            {PROPERTY_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.id}
                checked={worktreeCardProperties.includes(opt.id)}
                onCheckedChange={() => toggleWorktreeCardProperty(opt.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
              에이전트 활동 레이아웃
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={agentActivityDisplayMode}
              onValueChange={(value) =>
                setAgentActivityDisplayMode(value as AgentActivityDisplayMode)
              }
            >
              {AGENT_ACTIVITY_DISPLAY_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem
                  key={opt.id}
                  value={opt.id}
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <SidebarWorkspaceFilterSection />

        <DropdownMenuSeparator />
        <SidebarRepositoryFilterSection />
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

export default SidebarWorkspaceOptionsMenu
