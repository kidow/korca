/* eslint-disable max-lines -- Why: create-review dialog keeps provider copy, base/head selection, template controls, and submit state together so GitHub PR and GitLab MR creation stay symmetric. */
import React, { useCallback, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Sparkles, Square, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import type {
  CreateHostedReviewResult,
  HostedReviewCreationEligibility,
  HostedReviewProvider
} from '../../../../shared/hosted-review'
import { normalizeHostedReviewHeadRef } from '../../../../shared/hosted-review-refs'
import { stripBaseRef, useCreatePullRequestDialogFields } from './useCreatePullRequestDialogFields'
import {
  DEFAULT_SOURCE_CONTROL_AI_PR_CREATION_DEFAULTS,
  resolveSourceControlAiForOperation,
  resolveSourceControlAiPrCreationDefaults
} from '../../../../shared/source-control-ai'
import { getCommitMessageModelDiscoveryHostKeyForScope } from '../../../../shared/commit-message-host-key'
import { getRuntimeGitScope } from '@/runtime/runtime-git-client'

type CreatePullRequestDialogProps = {
  open: boolean
  repoId: string
  repoPath: string
  worktreeId: string | null
  worktreePath: string
  branch: string
  eligibility: HostedReviewCreationEligibility | null
  pushBeforeCreate: boolean
  onOpenChange: (open: boolean) => void
  onPushBeforeCreate: () => Promise<boolean>
  onBranchChangedByGeneration: () => Promise<void>
  onCreated: (result: {
    provider: HostedReviewProvider
    number: number
    url: string
  }) => Promise<void>
}

function reviewCopy(provider: HostedReviewProvider): {
  shortLabel: 'PR' | 'MR'
  reviewLabel: '풀 리퀘스트' | '병합 요청'
  titleLabel: '풀 리퀘스트' | '병합 요청'
  providerName: 'GitHub' | 'GitLab'
} {
  return provider === 'gitlab'
    ? {
        shortLabel: 'MR',
        reviewLabel: '병합 요청',
        titleLabel: '병합 요청',
        providerName: 'GitLab'
      }
    : {
        shortLabel: 'PR',
        reviewLabel: '풀 리퀘스트',
        titleLabel: '풀 리퀘스트',
        providerName: 'GitHub'
    }
}

function withObjectParticle(label: '풀 리퀘스트' | '병합 요청'): string {
  return label === '병합 요청' ? `${label}을` : `${label}를`
}

function formatCreateError(
  result: CreateHostedReviewResult,
  pushed: boolean,
  shortLabel: 'PR' | 'MR'
): string {
  if (result.ok) {
    return ''
  }
  if (pushed) {
    const prefix = new RegExp(`^Create ${shortLabel} failed:\\s*`, 'i')
    return `푸시에는 성공했지만 ${shortLabel} 생성에 실패했습니다: ${result.error.replace(prefix, '')}`
  }
  return result.error
}

export function CreatePullRequestDialog({
  open,
  repoId,
  repoPath,
  worktreeId,
  worktreePath,
  branch,
  eligibility,
  pushBeforeCreate,
  onOpenChange,
  onPushBeforeCreate,
  onBranchChangedByGeneration,
  onCreated
}: CreatePullRequestDialogProps): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const repo = useAppStore((s) => s.repos.find((candidate) => candidate.id === repoId) ?? null)
  const createHostedReview = useAppStore((s) => s.createHostedReview)
  const submitInFlightRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const provider = eligibility?.provider === 'gitlab' ? 'gitlab' : 'github'
  const copy = reviewCopy(provider)
  const prCreationDefaults = React.useMemo(() => {
    if (!settings) {
      return DEFAULT_SOURCE_CONTROL_AI_PR_CREATION_DEFAULTS
    }
    const hostKey = getCommitMessageModelDiscoveryHostKeyForScope(
      getRuntimeGitScope(settings, repo?.connectionId)
    )
    const resolved = resolveSourceControlAiForOperation({
      settings,
      repo,
      operation: 'pullRequest',
      discoveryHostKey: hostKey,
      prCreationProductDefaults: DEFAULT_SOURCE_CONTROL_AI_PR_CREATION_DEFAULTS
    })
    return resolved.ok
      ? resolved.value.prCreationDefaults
      : resolveSourceControlAiPrCreationDefaults({
          settings,
          repo,
          prCreationProductDefaults: DEFAULT_SOURCE_CONTROL_AI_PR_CREATION_DEFAULTS
        })
  }, [repo, settings])
  const {
    aiGenerationEnabled,
    base,
    setBase,
    title,
    setTitle,
    body,
    setBody,
    draft,
    setDraft,
    baseQuery,
    setBaseQuery,
    baseResults,
    setBaseResults,
    baseSearchError,
    generating,
    generateError,
    generateDisabled,
    generateDisabledReason,
    handleGenerate,
    handleCancelGenerate
  } = useCreatePullRequestDialogFields({
    open,
    repoId,
    worktreeId,
    worktreePath,
    branch,
    eligibility,
    settings,
    submitting,
    prCreationDefaults,
    onBranchChangedByGeneration
  })

  const resetSubmissionState = useCallback((): void => {
    submitInFlightRef.current = false
    setSubmitting(false)
    setError(null)
  }, [])

  const submitDisabled =
    submitting ||
    generating ||
    title.trim().length === 0 ||
    base.trim().length === 0 ||
    stripBaseRef(base).toLowerCase() === stripBaseRef(branch).toLowerCase()

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitDisabled || submitInFlightRef.current) {
      return
    }
    submitInFlightRef.current = true
    setSubmitting(true)
    setError(null)
    let pushed = false
    try {
      if (pushBeforeCreate) {
        const ok = await onPushBeforeCreate()
        if (!ok) {
          setError('Push failed. Resolve the push error, then try again.')
          return
        }
        pushed = true
      }
      const result = await createHostedReview(repoPath, {
        provider,
        base: stripBaseRef(base.trim()),
        head: normalizeHostedReviewHeadRef(branch),
        title: title.trim(),
        body,
        draft,
        worktreePath,
        useTemplate: prCreationDefaults.useTemplate
      })
      if (result.ok) {
        await onCreated({ provider, number: result.number, url: result.url })
        if (prCreationDefaults.openAfterCreate) {
          window.api.shell.openUrl(result.url)
        }
        resetSubmissionState()
        onOpenChange(false)
        return
      }
      if (result.existingReview?.url) {
        const number = result.existingReview.number
        toast.success(
          number
            ? `${copy.titleLabel} #${number} is already open`
            : `${copy.titleLabel} is already open`,
          {
            action: {
              label: `Open on ${copy.providerName}`,
              onClick: () => window.api.shell.openUrl(result.existingReview!.url)
            }
          }
        )
        if (number) {
          await onCreated({ provider, number, url: result.existingReview.url })
          resetSubmissionState()
          onOpenChange(false)
          return
        }
      }
      setError(formatCreateError(result, pushed, copy.shortLabel))
    } finally {
      submitInFlightRef.current = false
      setSubmitting(false)
    }
  }, [
    base,
    body,
    branch,
    createHostedReview,
    draft,
    onCreated,
    onOpenChange,
    onPushBeforeCreate,
    provider,
    pushBeforeCreate,
    copy.providerName,
    copy.shortLabel,
    copy.titleLabel,
    prCreationDefaults.openAfterCreate,
    prCreationDefaults.useTemplate,
    repoPath,
    resetSubmissionState,
    submitDisabled,
    title,
    worktreePath
  ])

  const handleOpenChange = useCallback(
    (nextOpen: boolean): void => {
      // Why: closing during submit would reset the in-flight guard while the
      // main-process create call can still complete, allowing duplicate clicks.
      if (submitting && !nextOpen) {
        return
      }
      if (!nextOpen) {
        resetSubmissionState()
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, resetSubmissionState, submitting]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex min-w-0 items-center justify-between gap-2 pr-8">
            <DialogTitle className="min-w-0 truncate">새 {copy.titleLabel}</DialogTitle>
            {aiGenerationEnabled ? (
              <div className="shrink-0">
                {generating ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelGenerate}
                        title="생성 중지"
                        aria-label={`${copy.reviewLabel} 세부 정보 생성 중지`}
                      >
                        <RefreshCw className="size-4 animate-spin" />
                        생성 중…
                        <Square className="size-3 fill-current" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" sideOffset={6}>
                      {copy.shortLabel} 세부 정보를 생성하는 중입니다. 클릭하면 중지합니다.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generateDisabled}
                    onClick={() => void handleGenerate()}
                    title={generateDisabledReason ?? `AI로 ${copy.reviewLabel} 세부 정보 생성`}
                    aria-label={`AI로 ${copy.reviewLabel} 세부 정보 생성`}
                  >
                    <Sparkles className="size-4" />
                    AI로 생성
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          <DialogDescription>
            호스티드 리뷰를 만들기 전에 대상 브랜치와 {copy.shortLabel} 세부 정보를 확인하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>헤드 브랜치</Label>
            <div className="inline-flex max-w-full items-center rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
              <span className="truncate">{branch}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="create-pr-base">기준 브랜치</Label>
              <p className="text-xs text-muted-foreground">
                Search remote branches or enter a branch name.
              </p>
            </div>
            <div className="relative">
              <Input
                id="create-pr-base"
                value={baseQuery || base}
                onChange={(event) => {
                  setBaseQuery(event.target.value)
                  setBase(event.target.value)
                }}
                placeholder="main"
                aria-invalid={!base.trim()}
                className="pr-8"
              />
              <ChevronsUpDown className="pointer-events-none absolute right-2 top-2.5 size-3.5 text-muted-foreground" />
            </div>
            {baseSearchError ? <p className="text-xs text-destructive">{baseSearchError}</p> : null}
            {baseResults.length > 0 ? (
              <div className="max-h-36 overflow-auto rounded-md border border-border p-1 scrollbar-sleek">
                {baseResults.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent',
                      stripBaseRef(base) === ref && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => {
                      setBase(ref)
                      setBaseQuery('')
                      setBaseResults([])
                    }}
                  >
                    <span className="truncate">{ref}</span>
                    {stripBaseRef(base) === ref ? <Check className="size-3" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-pr-title">Title</Label>
            <Input
              id="create-pr-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="제목"
              aria-invalid={!title.trim()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-pr-body">설명</Label>
            <textarea
              id="create-pr-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              placeholder="설명(선택)"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Markdown 형식을 지원합니다. 변경 내용으로 자동 채우려면 AI로 생성 버튼을 사용하세요.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <input
              type="checkbox"
              checked={draft}
              onChange={(event) => setDraft(event.target.checked)}
              className="size-4 shrink-0 rounded border-border accent-primary"
            />
            <span className="min-w-0 flex-1 truncate">초안으로 만들기</span>
          </label>

          {stripBaseRef(base).toLowerCase() === stripBaseRef(branch).toLowerCase() ? (
            <p className="text-xs text-destructive">
              {withObjectParticle(copy.reviewLabel)} 만들기 전에 다른 기준 브랜치를 선택하세요.
            </p>
          ) : null}
          {generateError ? <p className="text-xs text-destructive">{generateError}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitDisabled}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {pushBeforeCreate ? `${copy.shortLabel} 전 푸시 후 생성` : `${copy.shortLabel} 생성`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
