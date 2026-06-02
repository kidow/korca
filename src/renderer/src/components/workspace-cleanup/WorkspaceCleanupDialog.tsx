/* eslint-disable max-lines -- Why: cleanup scanning, safety review, and
   confirmation stay together so destructive workspace deletion remains
   auditable. */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  EyeOff,
  Loader2,
  Minus,
  RefreshCcw,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import RepoMultiCombobox from '@/components/ui/repo-multi-combobox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMountedRef } from '@/hooks/useMountedRef'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { isGitRepoKind } from '../../../../shared/repo-kind'
import {
  canQueueWorkspaceCleanupCandidate,
  type WorkspaceCleanupBlocker,
  type WorkspaceCleanupCandidate,
  type WorkspaceCleanupScanError,
  type WorkspaceCleanupTier
} from '../../../../shared/workspace-cleanup'
import {
  resolveWorkspaceCleanupActiveView,
  type WorkspaceCleanupView,
  type WorkspaceCleanupViewCounts
} from './workspace-cleanup-view-selection'

const TIER_LABELS: Record<WorkspaceCleanupTier, string> = {
  ready: '정리 제안',
  review: '더 살펴봐야 함',
  protected: '정리 비추천'
}

const BLOCKER_LABELS: Record<WorkspaceCleanupBlocker, string> = {
  'main-worktree': '기본 작업 공간',
  'folder-repo': '폴더 프로젝트',
  pinned: '고정됨',
  'active-workspace': '활성 작업 공간',
  'running-terminal': '실행 중인 터미널 프로세스',
  'terminal-liveness-unknown': '터미널 상태 확인 불가',
  'dirty-editor-buffer': '저장되지 않은 에디터 버퍼',
  'volatile-local-context': '휘발성 로컬 컨텍스트',
  'recent-visible-context': '최근 방문한 탭',
  'live-agent': '활성 에이전트',
  'ssh-disconnected': '원격 사용 불가',
  'git-status-error': 'git 상태 확인 불가',
  'dirty-files': '변경된 파일',
  'unpushed-commits': '푸시되지 않은 커밋',
  'unknown-base': '푸시되지 않은 커밋을 확인할 수 없음',
  dismissed: '무시됨'
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) {
    return '없음'
  }
  const deltaMs = Date.now() - timestamp
  if (deltaMs < 60_000) {
    return '방금 전'
  }
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 60) {
    return `${minutes}분 전`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 48) {
    return `${hours}시간 전`
  }
  return `${Math.floor(hours / 24)}일 전`
}

function isDisconnectedRemoteScanError(message: string): boolean {
  return (
    message === 'SSH provider is unavailable.' ||
    message === 'Remote workspaces are not connected. Reconnect and refresh to check them.'
  )
}

function formatScanNoticeMessage(
  errors: WorkspaceCleanupScanError[],
  repoNameById: Map<string, string>
): string | null {
  const visibleErrors = errors.filter(
    (error) => !isDisconnectedRemoteScanError(error.message ?? '')
  )
  if (visibleErrors.length === 0) {
    return null
  }
  if (visibleErrors.length === 1) {
    const error = visibleErrors[0]
    const repoName = formatScanErrorRepoName(error, repoNameById)
    return `다음 저장소를 확인하지 못했습니다: ${repoName}(${formatScanErrorReason(error.message)}). 일부 비활성 작업 공간이 빠졌을 수 있습니다. 다시 새로고침하세요.`
  }
  const repoNames = visibleErrors
    .slice(0, 3)
    .map((error) => formatScanErrorRepoName(error, repoNameById))
    .join(', ')
  const moreCount = visibleErrors.length - 3
  const suffix = moreCount > 0 ? `, +${moreCount}개 더` : ''
  return `저장소 ${visibleErrors.length}개(${repoNames}${suffix})를 확인하지 못했습니다. 일부 비활성 작업 공간이 빠졌을 수 있습니다. 다시 새로고침하세요.`
}

function formatScanErrorRepoName(
  error: Partial<WorkspaceCleanupScanError>,
  repoNameById: Map<string, string>
): string {
  const repoName = error.repoName?.trim()
  if (repoName) {
    return repoName
  }
  const fallback = error.repoId ? repoNameById.get(error.repoId)?.trim() : ''
  return fallback || '저장소'
}

function formatScanErrorReason(message: string | undefined): string {
  if (!message) {
    return 'git이 작업 공간 목록을 가져오지 못했습니다'
  }
  if (message === 'Could not scan workspace cleanup for this repository.') {
    return 'git이 작업 공간 목록을 가져오지 못했습니다'
  }
  return message.replace(/\.$/, '')
}

function isOldWorkspaceCandidate(candidate: WorkspaceCleanupCandidate): boolean {
  if (candidate.blockers.includes('main-worktree') || candidate.blockers.includes('folder-repo')) {
    return false
  }
  return candidate.reasons.includes('archived') || candidate.reasons.includes('idle-clean')
}

function compareCleanupCandidates(
  a: WorkspaceCleanupCandidate,
  b: WorkspaceCleanupCandidate
): number {
  const priorityA = getCleanupCandidatePriority(a)
  const priorityB = getCleanupCandidatePriority(b)
  if (priorityA !== priorityB) {
    return priorityA - priorityB
  }
  return a.lastActivityAt - b.lastActivityAt
}

function getCleanupCandidatePriority(candidate: WorkspaceCleanupCandidate): number {
  if (candidate.tier === 'ready') {
    return 0
  }
  if (candidate.reasons.length > 0) {
    return 1
  }
  if (isOldWorkspaceCandidate(candidate)) {
    return 2
  }
  return 3
}

export default function WorkspaceCleanupDialog(): React.JSX.Element {
  const activeModal = useAppStore((s) => s.activeModal)
  const closeModal = useAppStore((s) => s.closeModal)
  const scan = useAppStore((s) => s.workspaceCleanupScan)
  const loading = useAppStore((s) => s.workspaceCleanupLoading)
  const error = useAppStore((s) => s.workspaceCleanupError)
  const repos = useAppStore((s) => s.repos)
  const scanWorkspaceCleanup = useAppStore((s) => s.scanWorkspaceCleanup)
  const markCandidateViewed = useAppStore((s) => s.markWorkspaceCleanupCandidateViewed)
  const dismissCandidates = useAppStore((s) => s.dismissWorkspaceCleanupCandidates)
  const resetDismissals = useAppStore((s) => s.resetWorkspaceCleanupDismissals)
  const removeCandidates = useAppStore((s) => s.removeWorkspaceCleanupCandidates)

  const open = activeModal === 'workspace-cleanup'
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [activeView, setActiveView] = useState<WorkspaceCleanupView>('ready')
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [rowFailures, setRowFailures] = useState<Record<string, string>>({})
  const [repoSelection, setRepoSelection] = useState<ReadonlySet<string>>(() => new Set())
  const mountedRef = useMountedRef()
  const eligibleRepos = useMemo(() => repos.filter((repo) => isGitRepoKind(repo)), [repos])
  const eligibleRepoIds = useMemo(() => eligibleRepos.map((repo) => repo.id), [eligibleRepos])

  useEffect(() => {
    if (open) {
      setRowFailures({})
      setActiveView('ready')
      void scanWorkspaceCleanup().catch((err: unknown) => {
        if (mountedRef.current) {
          toast.error('작업 공간 정리 스캔에 실패했습니다', {
            description: err instanceof Error ? err.message : String(err)
          })
        }
      })
    }
  }, [mountedRef, open, scanWorkspaceCleanup])

  useEffect(() => {
    if (!open) {
      return
    }
    setRepoSelection(new Set(eligibleRepoIds))
  }, [eligibleRepoIds, open])

  const candidates = useMemo(() => scan?.candidates ?? [], [scan?.candidates])
  const effectiveRepoSelection = useMemo<ReadonlySet<string>>(() => {
    if (repoSelection.size > 0 || eligibleRepoIds.length === 0) {
      return repoSelection
    }
    return new Set(eligibleRepoIds)
  }, [eligibleRepoIds, repoSelection])
  const filteredCandidates = useMemo(() => {
    if (
      effectiveRepoSelection.size === 0 ||
      effectiveRepoSelection.size === eligibleRepoIds.length
    ) {
      return candidates
    }
    return candidates.filter((candidate) => effectiveRepoSelection.has(candidate.repoId))
  }, [candidates, effectiveRepoSelection, eligibleRepoIds.length])

  useEffect(() => {
    if (!open || !scan) {
      return
    }
    setSelectedIds(
      new Set(
        candidates
          .filter((candidate) => candidate.selectedByDefault)
          .map((candidate) => candidate.worktreeId)
      )
    )
    setConfirming(false)
  }, [open, scan, scan?.scannedAt, candidates])

  const visibleCandidates = useMemo(() => {
    const rows = filteredCandidates.filter((candidate) => !candidate.blockers.includes('dismissed'))
    return [...rows].sort(compareCleanupCandidates)
  }, [filteredCandidates])
  const hiddenCandidates = useMemo(
    () =>
      filteredCandidates
        .filter((candidate) => candidate.blockers.includes('dismissed'))
        .sort(compareCleanupCandidates),
    [filteredCandidates]
  )
  const groups = useMemo(
    () => ({
      ready: visibleCandidates.filter((candidate) => candidate.tier === 'ready'),
      review: visibleCandidates.filter((candidate) => candidate.tier === 'review'),
      protected: visibleCandidates.filter((candidate) => candidate.tier === 'protected')
    }),
    [visibleCandidates]
  )
  const selectedCandidates = useMemo(() => {
    const byId = new Map(filteredCandidates.map((candidate) => [candidate.worktreeId, candidate]))
    return [...selectedIds]
      .map((id) => byId.get(id))
      .filter(
        (candidate): candidate is WorkspaceCleanupCandidate =>
          candidate != null && canQueueWorkspaceCleanupCandidate(candidate)
      )
  }, [filteredCandidates, selectedIds])

  const hiddenByKeepCount = filteredCandidates.filter((candidate) =>
    candidate.blockers.includes('dismissed')
  ).length
  const cleanupViewCounts = useMemo<WorkspaceCleanupViewCounts>(
    () => ({
      ready: groups.ready.length,
      review: groups.review.length,
      protected: groups.protected.length,
      hidden: hiddenCandidates.length
    }),
    [groups.protected.length, groups.ready.length, groups.review.length, hiddenCandidates.length]
  )
  const resolvedActiveView = resolveWorkspaceCleanupActiveView({
    requestedView: activeView,
    counts: cleanupViewCounts,
    open,
    loading,
    hasScan: scan != null
  })
  const repoNameById = useMemo(
    () => new Map(repos.map((repo) => [repo.id, repo.displayName || repo.path])),
    [repos]
  )
  const selectedScanErrors = useMemo(
    () => (scan?.errors ?? []).filter((error) => effectiveRepoSelection.has(error.repoId)),
    [effectiveRepoSelection, scan?.errors]
  )
  const scanNoticeMessage = useMemo(
    () => formatScanNoticeMessage(selectedScanErrors, repoNameById),
    [repoNameById, selectedScanErrors]
  )
  const readyCount = groups.ready.length
  const protectedCount = groups.protected.length
  const inactiveCount = filteredCandidates.length
  const hasAnyCandidates = candidates.length > 0
  const initialLoading = loading && !scan
  const activeRows = resolvedActiveView === 'hidden' ? hiddenCandidates : groups[resolvedActiveView]
  const activeQueueableRows = useMemo(
    () => activeRows.filter(canQueueWorkspaceCleanupCandidate),
    [activeRows]
  )
  const activeQueueableSelected = useMemo(
    () => activeQueueableRows.filter((candidate) => selectedIds.has(candidate.worktreeId)).length,
    [activeQueueableRows, selectedIds]
  )
  const allActiveQueueableSelected =
    activeQueueableRows.length > 0 && activeQueueableSelected === activeQueueableRows.length
  const someActiveQueueableSelected = activeQueueableSelected > 0
  const activeSelectionState = allActiveQueueableSelected
    ? 'checked'
    : someActiveQueueableSelected
      ? 'mixed'
      : 'unchecked'

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !removing) {
        closeModal()
      }
    },
    [closeModal, removing]
  )

  const refresh = useCallback(() => {
    setRowFailures({})
    void scanWorkspaceCleanup().catch((err: unknown) => {
      if (mountedRef.current) {
        toast.error('작업 공간 정리 스캔에 실패했습니다', {
          description: err instanceof Error ? err.message : String(err)
        })
      }
    })
  }, [mountedRef, scanWorkspaceCleanup])

  const toggleActiveSelection = useCallback(() => {
    if (activeQueueableRows.length === 0) {
      return
    }
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allActiveQueueableSelected) {
        for (const candidate of activeQueueableRows) {
          next.delete(candidate.worktreeId)
        }
      } else {
        for (const candidate of activeQueueableRows) {
          next.add(candidate.worktreeId)
        }
      }
      return next
    })
  }, [activeQueueableRows, allActiveQueueableSelected])

  const ignoreCandidate = useCallback(
    (candidate: WorkspaceCleanupCandidate) => {
      void dismissCandidates([candidate])
        .then(() => {
          if (mountedRef.current) {
            setSelectedIds((current) => {
              const next = new Set(current)
              next.delete(candidate.worktreeId)
              return next
            })
          }
        })
        .catch((err: unknown) => {
          if (mountedRef.current) {
            toast.error('정리 제안을 무시하지 못했습니다', {
              description: err instanceof Error ? err.message : String(err)
            })
          }
        })
    },
    [dismissCandidates, mountedRef]
  )

  const confirmRemove = useCallback(async () => {
    if (selectedCandidates.length === 0) {
      return
    }
    setRemoving(true)
    setRowFailures({})
    try {
      const result = await removeCandidates(
        selectedCandidates.map((candidate) => candidate.worktreeId)
      )
      const nextFailures: Record<string, string> = {}
      for (const failure of result.failures) {
        nextFailures[failure.worktreeId] = failure.message
      }
      if (mountedRef.current) {
        setRowFailures(nextFailures)
        setSelectedIds((current) => {
          const next = new Set(current)
          for (const id of result.removedIds) {
            next.delete(id)
          }
          return next
        })
      }
      if (result.removedIds.length > 0) {
        if (mountedRef.current) {
          toast.success(
        `${result.removedIds.length}개의 작업 공간을 제거했습니다`
          )
        }
      }
      if (result.failures.length > 0) {
        if (mountedRef.current) {
          toast.error(
            `${result.failures.length} workspace${result.failures.length === 1 ? '' : 's'} could not be removed`
          )
        }
      } else {
        if (mountedRef.current) {
          setConfirming(false)
        }
      }
    } finally {
      if (mountedRef.current) {
        setRemoving(false)
      }
    }
  }, [mountedRef, removeCandidates, selectedCandidates])

  const selectedCount = selectedCandidates.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(820px,90vh)] w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-3rem)] xl:w-[920px] xl:max-w-[920px]"
      >
        {!confirming ? (
          <>
            <DialogHeader className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DialogTitle className="text-base">비활성 작업 공간 삭제</DialogTitle>
                  <DialogDescription className="mt-1 text-xs">
                    로컬 파일과 Korca 상태를 삭제하기 전에 비활성 작업 공간을 검토하세요.
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="새로고침"
                        onClick={refresh}
                        disabled={loading}
                      >
                        <RefreshCcw className={cn('size-3.5', loading && 'animate-spin')} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                      새로고침
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="닫기"
                    onClick={() => closeModal()}
                    disabled={removing}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {initialLoading ? (
              <div className="flex items-start gap-2 border-b border-border bg-muted/25 px-5 py-3">
                <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    작업 공간 안전성 확인 중
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    작업 공간과 git 상태를 검사한 뒤, 열려 있는 탭, 터미널, 활성 에이전트,
                    원격 사용 가능 상태를 함께 고려해 삭제를 제안합니다.
                  </div>
                </div>
              </div>
            ) : hasAnyCandidates ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="min-w-0 text-sm font-medium text-foreground">
                    {selectedCount}개 선택됨
                  </div>
                  <StatusPill>{inactiveCount}개 비활성</StatusPill>
                  {readyCount > 0 ? (
                    <StatusPill tone="ready">{readyCount}개 제거 가능</StatusPill>
                  ) : null}
                  {groups.review.length > 0 ? (
                    <StatusPill tone="review">{groups.review.length}개 검토 필요</StatusPill>
                  ) : null}
                  {protectedCount > 0 ? (
                    <StatusPill>{protectedCount}개 비추천</StatusPill>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {eligibleRepos.length > 1 ? (
                    <div className="w-[220px] max-w-full">
                      <RepoMultiCombobox
                        repos={eligibleRepos}
                        selected={effectiveRepoSelection}
                        onChange={(next) => setRepoSelection(new Set(next))}
                        onSelectAll={() => setRepoSelection(new Set(eligibleRepoIds))}
                        triggerClassName="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-xs font-medium shadow-xs hover:bg-accent/60"
                      />
                    </div>
                  ) : null}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirming(true)}
                    disabled={selectedCount === 0}
                  >
                    <Trash2 className="size-3.5" />
                    선택 항목 삭제
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : scanNoticeMessage ? (
              <div className="flex items-center gap-2 border-b border-border bg-muted/25 px-5 py-2 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{scanNoticeMessage}</span>
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[185px_minmax(0,1fr)]">
              <CleanupViewNav
                activeView={resolvedActiveView}
                counts={cleanupViewCounts}
                onViewChange={setActiveView}
              />
              <div className="flex min-h-0 min-w-0 flex-col border-t border-border md:border-l md:border-t-0">
                <div className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {resolvedActiveView !== 'hidden' && activeQueueableRows.length > 0 ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={
                          activeSelectionState === 'mixed' ? 'mixed' : allActiveQueueableSelected
                        }
                        aria-label={
                          allActiveQueueableSelected
                            ? `${TIER_LABELS[resolvedActiveView]} 전체 선택 해제`
                            : `${TIER_LABELS[resolvedActiveView]} 전체 선택`
                        }
                        onClick={toggleActiveSelection}
                        className="flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background text-primary hover:bg-accent"
                      >
                        {activeSelectionState === 'checked' ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : activeSelectionState === 'mixed' ? (
                          <Minus className="size-3" strokeWidth={3} />
                        ) : null}
                      </button>
                    ) : null}
                    <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      {resolvedActiveView === 'hidden'
                        ? '무시한 정리 제안'
                        : TIER_LABELS[resolvedActiveView]}
                    </div>
                  </div>
                  {resolvedActiveView === 'hidden' && hiddenByKeepCount > 0 ? (
                    <Button
                      variant="link"
                      size="xs"
                      className="h-auto shrink-0 px-0 text-xs"
                      onClick={() => void resetDismissals()}
                    >
                      무시한 제안 복원
                    </Button>
                  ) : (
                    <div className="shrink-0 text-xs text-muted-foreground">
                      오래된 활동 순으로 정렬
                    </div>
                  )}
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div>
                    {initialLoading ? <SkeletonRows /> : null}
                    {!loading && scan && candidates.length === 0 && !scanNoticeMessage ? (
                        <EmptyState title="삭제할 비활성 작업 공간이 없습니다." />
                    ) : null}
                    {!loading && scan && candidates.length === 0 && scanNoticeMessage ? (
                        <EmptyState title="확인한 저장소에서 비활성 작업 공간을 찾지 못했습니다." />
                    ) : null}
                    {!loading &&
                    scan &&
                    candidates.length > 0 &&
                    filteredCandidates.length === 0 ? (
                      <EmptyState
                        title="선택한 저장소와 일치하는 비활성 작업 공간이 없습니다."
                        actionLabel="모든 저장소 보기"
                        onAction={() => setRepoSelection(new Set(eligibleRepoIds))}
                      />
                    ) : null}
                    {!loading &&
                    scan &&
                    filteredCandidates.length > 0 &&
                    visibleCandidates.length === 0 ? (
                      <EmptyState
                        title="모든 정리 제안을 무시했습니다."
                        actionLabel="무시한 작업 공간 검토"
                        onAction={() => setActiveView('hidden')}
                      />
                    ) : null}
                    {!loading && scan && activeRows.length === 0 && visibleCandidates.length > 0 ? (
                      <EmptyState title="이 정리 집합에 작업 공간이 없습니다." />
                    ) : null}
                    {activeRows.map((candidate, index) => (
                      <CandidateRow
                        key={candidate.worktreeId}
                        candidate={candidate}
                        last={index === activeRows.length - 1}
                        selected={selectedIds.has(candidate.worktreeId)}
                        failure={rowFailures[candidate.worktreeId]}
                        onToggleSelected={(id) =>
                          setSelectedIds((current) => toggleSetMember(current, id))
                        }
                        onView={closeAndView}
                        onIgnore={ignoreCandidate}
                        onRemove={(candidate) => {
                          setSelectedIds(new Set([candidate.worktreeId]))
                          setConfirming(true)
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        ) : (
          <ConfirmRemove
            candidates={selectedCandidates}
            removing={removing}
            onCancel={() => setConfirming(false)}
            onConfirm={() => void confirmRemove()}
          />
        )}
      </DialogContent>
    </Dialog>
  )

  function closeAndView(candidate: WorkspaceCleanupCandidate): void {
    markCandidateViewed(candidate)
    closeModal()
    activateAndRevealWorktree(candidate.worktreeId)
  }
}

function StatusPill({
  children,
  tone = 'neutral'
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'ready' | 'review' | 'destructive'
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium',
        tone === 'neutral' && 'border-border bg-background text-muted-foreground',
        tone === 'ready' && 'border-border text-[var(--git-decoration-added)]',
        tone === 'review' && 'border-border text-[var(--git-decoration-modified)]',
        tone === 'destructive' && 'border-destructive/30 text-destructive'
      )}
    >
      {children}
    </span>
  )
}

function CleanupViewNav({
  activeView,
  counts,
  onViewChange
}: {
  activeView: WorkspaceCleanupView
  counts: WorkspaceCleanupViewCounts
  onViewChange: (view: WorkspaceCleanupView) => void
}): React.JSX.Element {
  const items: { view: WorkspaceCleanupView; label: string }[] = [
    { view: 'ready', label: '제안됨' },
    { view: 'review', label: '검토 필요' },
    { view: 'protected', label: '비추천' },
    { view: 'hidden', label: '무시됨' }
  ]

  return (
    <aside className="border-t border-border bg-background md:border-t-0">
      <div className="space-y-1 p-2">
        {items.map((item) => (
          <button
            key={item.view}
            type="button"
            className={cn(
              'flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              activeView === item.view && 'bg-accent text-accent-foreground'
            )}
            onClick={() => onViewChange(item.view)}
          >
            <span className="truncate">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{counts[item.view]}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

function CandidateRow({
  candidate,
  last,
  selected,
  failure,
  onToggleSelected,
  onView,
  onIgnore,
  onRemove
}: {
  candidate: WorkspaceCleanupCandidate
  last: boolean
  selected: boolean
  failure?: string
  onToggleSelected: (worktreeId: string) => void
  onView: (candidate: WorkspaceCleanupCandidate) => void
  onIgnore: (candidate: WorkspaceCleanupCandidate) => void
  onRemove: (candidate: WorkspaceCleanupCandidate) => void
}): React.JSX.Element {
  const selectable = canQueueWorkspaceCleanupCandidate(candidate)
  const ignored = candidate.blockers.includes('dismissed')
  const blockers = candidate.blockers.map((blocker) => BLOCKER_LABELS[blocker])
  const contextDetails = formatContextDetails(candidate)
  const branchSafetyDetails = formatBranchSafetyDetails(candidate)
  const status = getCandidateStatus(candidate)

  return (
    <div
      className={cn(
        'group w-full border-b border-border/60 px-3 py-3 text-left text-foreground transition-colors hover:bg-accent/40',
        last && 'border-b-0'
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 md:grid-cols-[auto_minmax(0,1fr)_auto]">
        {selectable ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={`${candidate.displayName} 선택`}
            onClick={() => onToggleSelected(candidate.worktreeId)}
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background text-primary hover:bg-accent"
          >
            {selected ? <Check className="size-3" strokeWidth={3} /> : null}
          </button>
        ) : (
          <div className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="min-w-0 truncate text-sm font-medium">{candidate.displayName}</span>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
        <span className="text-xs text-muted-foreground">
          마지막 활동 {formatRelativeTime(candidate.lastActivityAt)}
        </span>
            {blockers.length > 0 ? (
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {blockers.slice(0, 2).join(', ')}
              </span>
            ) : null}
          </div>
          <div className="mt-1 min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {candidate.path}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">Repo {candidate.repoName}</span>
            <span className="min-w-0 truncate font-mono">Branch {candidate.branch}</span>
            <span>{formatGitStatus(candidate)}</span>
            {branchSafetyDetails.slice(0, 1).map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
            {contextDetails ? <span className="min-w-0 truncate">{contextDetails}</span> : null}
          </div>
          {failure ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5" />
              {failure}
            </div>
          ) : null}
        </div>
        <div className="col-start-2 flex flex-wrap items-center gap-0.5 md:col-start-auto md:justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${candidate.displayName} 보기`}
                onClick={() => onView(candidate)}
              >
                <Search className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              보기
            </TooltipContent>
          </Tooltip>
          {!ignored ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                aria-label={`${candidate.displayName} 무시`}
                  onClick={() => onIgnore(candidate)}
                >
                  <EyeOff className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                무시
              </TooltipContent>
            </Tooltip>
          ) : null}
          {selectable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                aria-label={`${candidate.displayName} 삭제`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onRemove(candidate)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                삭제
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getCandidateStatus(candidate: WorkspaceCleanupCandidate): {
  label: string
  tone: 'neutral' | 'ready' | 'review' | 'destructive'
} {
  if (candidate.blockers.includes('dismissed')) {
    return { label: '무시됨', tone: 'neutral' }
  }
  if (candidate.tier === 'ready') {
    return { label: candidate.reasons.includes('archived') ? '보관됨' : '정리됨', tone: 'ready' }
  }
  if (candidate.blockers.length > 0) {
    return { label: BLOCKER_LABELS[candidate.blockers[0]], tone: 'neutral' }
  }
  if (candidate.git.upstreamAhead && candidate.git.upstreamAhead > 0) {
    return { label: '푸시되지 않은 커밋', tone: 'review' }
  }
  if (candidate.git.clean === false) {
    return { label: '변경 있음', tone: 'review' }
  }
  if (candidate.tier === 'review') {
    return { label: '검토 필요', tone: 'review' }
  }
  return { label: '추천되지 않음', tone: 'neutral' }
}

function formatGitStatus(candidate: WorkspaceCleanupCandidate): string {
  if (candidate.git.clean === true) {
    return '정리된 git'
  }
  if (candidate.git.clean === false) {
    return '변경된 git'
  }
  return 'git 상태 알 수 없음'
}

function formatBranchSafetyDetails(candidate: WorkspaceCleanupCandidate): string[] {
  const details: string[] = []
  if (candidate.git.upstreamAhead !== null) {
    details.push(
      candidate.git.upstreamAhead === 0
        ? '푸시되지 않은 커밋 없음'
        : `${candidate.git.upstreamAhead}개의 푸시되지 않은 커밋${
            candidate.git.upstreamAhead === 1 ? '' : 's'
          }`
    )
  }
  return details
}

function formatContextDetails(candidate: WorkspaceCleanupCandidate): string | null {
  const parts: string[] = []
  if (candidate.localContext.terminalTabCount > 0) {
    parts.push(
      `${candidate.localContext.terminalTabCount}개 터미널 탭`
    )
  }
  if (candidate.localContext.cleanEditorTabCount > 0) {
    parts.push(
      `${candidate.localContext.cleanEditorTabCount}개 에디터 탭`
    )
  }
  if (candidate.localContext.browserTabCount > 0) {
    parts.push(
      `${candidate.localContext.browserTabCount}개 브라우저 탭`
    )
  }
  if (candidate.localContext.diffCommentCount > 0) {
    parts.push(
      `${candidate.localContext.diffCommentCount}개 차이점 메모`
    )
  }
  if (candidate.localContext.retainedDoneAgentCount > 0) {
    parts.push(
      `${candidate.localContext.retainedDoneAgentCount}개 완료된 에이전트`
    )
  }
  return parts.length > 0 ? parts.join(', ') : null
}

function ConfirmRemove({
  candidates,
  removing,
  onCancel,
  onConfirm
}: {
  candidates: WorkspaceCleanupCandidate[]
  removing: boolean
  onCancel: () => void
  onConfirm: () => void
}): React.JSX.Element {
  const count = candidates.length
  return (
    <>
      <DialogHeader className="border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-destructive/25 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base">
              {count}개의 작업 공간 삭제?
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-5">
              로컬 파일이 영구 삭제됩니다. 되돌릴 수 없습니다.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            삭제할 {count}개의 작업 공간
          </div>
          <div className="text-xs text-muted-foreground">오래된 활동 순으로 정렬</div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {candidates.map((candidate, index) => (
            <ConfirmRemoveRow
              key={candidate.worktreeId}
              candidate={candidate}
              last={index === candidates.length - 1}
            />
          ))}
        </ScrollArea>
      </div>
      <DialogFooter className="border-t border-border px-5 py-3">
        <Button variant="outline" onClick={onCancel} disabled={removing}>
          취소
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={removing || count === 0}>
          {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          {count}개의 작업 공간 삭제
        </Button>
      </DialogFooter>
    </>
  )
}

function ConfirmRemoveRow({
  candidate,
  last
}: {
  candidate: WorkspaceCleanupCandidate
  last: boolean
}): React.JSX.Element {
  const dirtyLabel = getDirtyGitLabel(candidate)
  const branchDiffersFromName = candidate.branch !== candidate.displayName
  return (
    <div className={cn('border-b border-border/60 px-5 py-2.5', last && 'border-b-0')}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="min-w-0 truncate text-sm font-medium">{candidate.displayName}</span>
        <span className="text-xs text-muted-foreground">
          마지막 활동 {formatRelativeTime(candidate.lastActivityAt)}
        </span>
        {dirtyLabel ? <StatusPill tone="destructive">{dirtyLabel}</StatusPill> : null}
      </div>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{candidate.repoName}</span>
        {branchDiffersFromName ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="min-w-0 truncate font-mono">{candidate.branch}</span>
          </>
        ) : null}
      </div>
      <div className="mt-0.5 min-w-0 truncate font-mono text-[11px] text-muted-foreground/80">
        {candidate.path}
      </div>
    </div>
  )
}

function getDirtyGitLabel(candidate: WorkspaceCleanupCandidate): string | null {
  if (candidate.git.upstreamAhead && candidate.git.upstreamAhead > 0) {
    return `${candidate.git.upstreamAhead}개의 푸시되지 않은 커밋${
      candidate.git.upstreamAhead === 1 ? '' : 's'
    }`
  }
  if (candidate.git.clean === false) {
    return '저장되지 않은 변경 사항'
  }
  if (candidate.git.clean == null) {
    return 'git 상태 알 수 없음'
  }
  return null
}

function SkeletonRows(): React.JSX.Element {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg border border-border bg-muted/35"
        />
      ))}
    </div>
  )
}

function EmptyState({
  title,
  actionLabel,
  onAction
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}): React.JSX.Element {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 text-sm text-muted-foreground">
      <span>{title}</span>
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

function toggleSetMember(current: Set<string>, value: string): Set<string> {
  const next = new Set(current)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}
