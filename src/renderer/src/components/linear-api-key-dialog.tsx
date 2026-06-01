import { useId, useMemo, useState } from 'react'
import { ExternalLink, LoaderCircle, Lock } from 'lucide-react'
import type { LinearWorkspace } from '../../../shared/types'
import {
  buildLinearPersonalApiKeySettingsUrl,
  buildLinearWorkspaceApiSettingsUrl
} from '../../../shared/linear-links'
import { getActiveRuntimeTarget } from '@/runtime/runtime-rpc-client'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
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
import { cn } from '@/lib/utils'
import {
  createLinearApiKeyDialogState,
  resolveLinearApiKeyDialogState
} from './linear-api-key-dialog-state'

type LinearApiKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace?: LinearWorkspace | null
  title?: string
  description?: string
  connectLabel?: string
  onConnected?: () => void
  overlayClassName?: string
  contentClassName?: string
}

export function LinearApiKeyDialog({
  open,
  onOpenChange,
  workspace,
  title,
  description,
  connectLabel,
  onConnected,
  overlayClassName,
  contentClassName
}: LinearApiKeyDialogProps): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const connectLinear = useAppStore((s) => s.connectLinear)
  const mountedRef = useMountedRef()
  const apiKeyInputId = useId()
  const apiKeyErrorId = useId()
  const [dialogState, setDialogState] = useState(createLinearApiKeyDialogState)

  const runtimeTarget = useMemo(() => getActiveRuntimeTarget(settings), [settings])
  const personalKeyUrl = buildLinearPersonalApiKeySettingsUrl(workspace?.organizationUrlKey)
  const workspaceApiUrl = buildLinearWorkspaceApiSettingsUrl(workspace?.organizationUrlKey)
  const submitLabel = connectLabel ?? (workspace ? '접근 권한 업데이트' : '연결')
  const resolvedDialogState = resolveLinearApiKeyDialogState(dialogState, open)
  if (resolvedDialogState !== dialogState) {
    // Why: parent-controlled close can race an in-flight connect request; keep
    // hidden draft/error state reset before the next open paints.
    setDialogState(resolvedDialogState)
  }
  const { apiKeyDraft, connectState, connectError } = resolvedDialogState

  const handleOpenChange = (nextOpen: boolean): void => {
    if (connectState !== 'connecting') {
      onOpenChange(nextOpen)
    }
  }

  const handleConnect = async (): Promise<void> => {
    const apiKey = apiKeyDraft.trim()
    if (!apiKey || connectState === 'connecting') {
      return
    }
    setDialogState((current) => ({ ...current, connectState: 'connecting', connectError: null }))
    try {
      const result = await connectLinear(apiKey)
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        setDialogState(createLinearApiKeyDialogState())
        onOpenChange(false)
        onConnected?.()
        return
      }
      setDialogState((current) => ({
        ...current,
        connectState: 'error',
        connectError: result.error
      }))
    } catch (error) {
      if (mountedRef.current) {
        setDialogState((current) => ({
          ...current,
          connectState: 'error',
        connectError: error instanceof Error ? error.message : '연결에 실패했습니다'
        }))
      }
    }
  }

  const resolvedTitle =
    title ??
    (workspace ? `${workspace.organizationName}의 Linear 접근 권한 업데이트` : 'Linear 접근 권한 추가')
  const resolvedDescription =
    description ??
    (workspace
      ? `${workspace.organizationName}의 Personal API 키를 붙여넣으세요. 이 작업공간이 이미 연결되어 있으면 Orca가 저장된 키를 바꿉니다.`
      : 'Orca가 사용할 Linear 작업공간의 Personal API 키를 붙여넣으세요. 해당 작업공간이 이미 연결되어 있으면 Orca가 저장된 키를 바꿉니다.')
  const storageCopy =
    runtimeTarget.kind === 'environment'
      ? '이 키는 활성 원격 런타임에 저장됩니다.'
      : '로컬 런타임 키는 가능한 경우 이 기기에서 Electron 암호화 저장소를 사용해 저장됩니다.'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn('sm:max-w-lg', contentClassName)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && apiKeyDraft.trim() && connectState !== 'connecting') {
            event.preventDefault()
            void handleConnect()
          }
        }}
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="leading-tight">{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={apiKeyInputId} className="text-xs">
              Personal API 키
            </Label>
            <Input
              id={apiKeyInputId}
              autoFocus
              type="password"
              placeholder="lin_api_..."
              value={apiKeyDraft}
              onChange={(event) => {
                const nextDraft = event.target.value
                setDialogState((current) => ({
                  apiKeyDraft: nextDraft,
                  connectState: current.connectState === 'error' ? 'idle' : current.connectState,
                  connectError: current.connectState === 'error' ? null : current.connectError
                }))
              }}
              disabled={connectState === 'connecting'}
              aria-invalid={connectState === 'error'}
              aria-describedby={connectState === 'error' ? apiKeyErrorId : undefined}
            />
          </div>
          {connectState === 'error' && connectError ? (
            <p id={apiKeyErrorId} className="text-xs text-destructive">
              {connectError}
            </p>
          ) : null}
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p>
            Account &gt; Security &amp; Access에서 Personal API 키를 만드세요.{' '}
              {!workspace
                ? '키를 만들기 전에 Linear에서 대상 작업공간을 선택하세요.'
                : null}
            </p>
            <p>
              Orca가 해당 작업공간에서 계정이 접근할 수 있는 모든 팀을 보여줘야 한다면 전체 접근을 권장합니다. 제한된 키는 허용된 팀만 노출하며, 비공개 팀은 키 소유자에게 접근 권한이 있어야 합니다.
            </p>
            <p>
              멤버 API 키가 차단되어 있다면 작업공간 관리자에게 workspace API 설정에서 허용해 달라고 요청하세요.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                onClick={() => window.api.shell.openUrl(personalKeyUrl)}
              >
                <ExternalLink className="size-3" />
                Personal API 키
              </button>
              <span className="text-muted-foreground/60">|</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                onClick={() => window.api.shell.openUrl(workspaceApiUrl)}
              >
                <ExternalLink className="size-3" />
                작업공간 API 설정
              </button>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <Lock className="size-3 shrink-0" />
            {storageCopy}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={connectState === 'connecting'}
          >
            취소
          </Button>
          <Button
            onClick={() => void handleConnect()}
            disabled={!apiKeyDraft.trim() || connectState === 'connecting'}
          >
            {connectState === 'connecting' ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                확인 중...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
