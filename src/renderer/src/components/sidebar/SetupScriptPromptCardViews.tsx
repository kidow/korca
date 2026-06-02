import React from 'react'
import { Check, Download, LoaderCircle, PackageCheck, RefreshCw, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RepoBadgeMark } from '@/components/repo/RepoBadgeLabel'
import type { Repo } from '../../../../shared/types'

type DismissButtonProps = {
  onDismiss: () => void
}

function DismissButton({ onDismiss }: DismissButtonProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="설정 스크립트 닫기"
          className="-mr-1 text-muted-foreground"
          onClick={onDismiss}
        >
          <X className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        닫기
      </TooltipContent>
    </Tooltip>
  )
}

export type DetectedSetupPreviewProps = {
  setup: string
  onSetupChange: (value: string) => void
  provenance: string | null
}

export function DetectedSetupPreview({
  setup,
  onSetupChange,
  provenance
}: DetectedSetupPreviewProps): React.JSX.Element {
  return (
    <div className="mt-3 border-t border-sidebar-border pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <PackageCheck className="size-3.5" />
        설정 스크립트 감지
      </div>
      <textarea
        value={setup}
        aria-label="감지된 설정 스크립트"
        onChange={(event) => onSetupChange(event.target.value)}
        spellCheck={false}
        rows={Math.min(Math.max(setup.split('\n').length, 2), 6)}
        className="setup-script-prompt-command max-h-28 w-full resize-y overflow-auto scrollbar-sleek rounded-md border border-sidebar-border px-2 py-1.5 font-mono text-[11px] leading-5 text-foreground shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {provenance ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5">{provenance}</code>에서 감지됨
        </p>
      ) : null}
    </div>
  )
}

export type PackageManagerActionsProps = {
  isSaving: boolean
  onSave: () => void
  onConfigure: () => void
}

export function PackageManagerActions({
  isSaving,
  onSave,
  onConfigure
}: PackageManagerActionsProps): React.JSX.Element {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Button
        type="button"
        variant="default"
        size="sm"
        className="h-7 w-full text-xs"
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        <span className={cn('truncate', isSaving && 'text-muted-foreground')}>저장</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-full text-xs text-muted-foreground"
        onClick={onConfigure}
      >
        <Settings className="size-3.5" />
        <span className="truncate">직접 설정</span>
      </Button>
    </div>
  )
}

export type SetupScriptPromptBodyProps = {
  repo: Repo
  isInspectionError: boolean
  sharedSetupIgnored: boolean
  isPackageManagerSuggestion: boolean
  candidateSource: string | null
}

export function SetupScriptPromptBody({
  repo,
  isInspectionError,
  sharedSetupIgnored,
  isPackageManagerSuggestion,
  candidateSource
}: SetupScriptPromptBodyProps): React.JSX.Element {
  if (isInspectionError) {
    return <>지금은 이 저장소의 설정 스크립트를 확인할 수 없습니다.</>
  }
  if (sharedSetupIgnored) {
    return (
      <>
        이 저장소는 <code>korca.yaml</code> 설정 스크립트를 무시하도록 되어 있습니다. 로컬 설정
        명령을 구성하거나 설정에서 스크립트 원본을 바꾸세요.
      </>
    )
  }
  if (isPackageManagerSuggestion) {
    return (
      <>
        설정 스크립트는 새 워크트리를 만들 때 자동으로 실행되므로, 같은 명령을 매번 다시 실행할
        필요가 없습니다.
      </>
    )
  }
  if (candidateSource) {
    return (
      <>
        <span className="break-words">{candidateSource}</span>에서 설정 구성을 감지했습니다.
        저장하세요 로컬에 저장하면 모든 작업 공간이 자동으로 준비된 상태로 시작합니다. 나중에{' '}
        <code>korca.yaml</code>로 옮겨 공유할 수 있습니다.
      </>
    )
  }
  return (
    <>
      로컬 설정 명령을 추가하면 새 작업 공간이 자동으로 준비된 상태로 시작합니다. 나중에{' '}
      <code>korca.yaml</code>로 옮겨 공유할 수 있습니다. 대상:{' '}
      <span className="inline-flex items-center gap-1.5 align-baseline px-1.5 py-0.5 rounded-[4px] bg-accent border border-border dark:bg-accent/50 dark:border-border/60">
        <RepoBadgeMark color={repo.badgeColor} />
        <span className="text-[10px] font-semibold text-foreground truncate max-w-[8rem] leading-none lowercase">
          {repo.displayName}
        </span>
      </span>
    </>
  )
}

export type InspectionErrorActionsProps = {
  onRetry: () => void
  onConfigure: () => void
}

export function InspectionErrorActions({
  onRetry,
  onConfigure
}: InspectionErrorActionsProps): React.JSX.Element {
  return (
    <div className="mt-3 flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 flex-1 text-xs"
        onClick={onRetry}
      >
        <RefreshCw className="size-3.5" />
        <span className="truncate">다시 시도</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onConfigure}
      >
        <Settings className="size-3.5" />
        <span className="sr-only">설정</span>
      </Button>
    </div>
  )
}

export type ConfigureOnlyActionProps = {
  onConfigure: () => void
}

export function ConfigureOnlyAction({ onConfigure }: ConfigureOnlyActionProps): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-3 h-7 w-full text-xs"
      onClick={onConfigure}
    >
      <Settings className="size-3.5" />
      <span className="truncate">설정</span>
    </Button>
  )
}

export type SaveLocalSetupActionProps = {
  isSaving: boolean
  onSave: () => void
}

export function SaveLocalSetupAction({
  isSaving,
  onSave
}: SaveLocalSetupActionProps): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-3 h-7 w-full text-xs"
      onClick={onSave}
      disabled={isSaving}
    >
      {isSaving ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      <span className={cn('truncate', isSaving && 'text-muted-foreground')}>로컬 설정 저장</span>
    </Button>
  )
}

export { DismissButton }
