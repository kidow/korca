import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { CliInstallStatus } from '../../../../shared/cli-install-types'
import { useWindowsTerminalCapabilities } from '@/lib/windows-terminal-capabilities'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

type WslCliRegistrationProps = {
  currentPlatform: string
}

export function WslCliRegistration({
  currentPlatform
}: WslCliRegistrationProps): React.JSX.Element | null {
  const [status, setStatus] = useState<CliInstallStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<'install' | 'remove' | null>(null)
  const mountedRef = useMountedRef()
  const { wslAvailable } = useWindowsTerminalCapabilities(currentPlatform === 'win32')
  const showWslCli = currentPlatform === 'win32' && wslAvailable

  const refreshStatus = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const next = await window.api.cli.getWslInstallStatus()
      if (mountedRef.current) {
        setStatus(next)
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : 'WSL CLI 상태를 불러오지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [mountedRef])

  useEffect(() => {
    if (showWslCli) {
      void refreshStatus()
    }
  }, [refreshStatus, showWslCli])

  if (!showWslCli) {
    return null
  }

  const isEnabled = status?.state === 'installed'
  const isSupported = status?.supported ?? false
  const commandName = status?.commandName ?? 'korca-ide'

  const handleInstall = async (): Promise<void> => {
    setBusyAction('install')
    try {
      const next = await window.api.cli.installWsl()
      if (!mountedRef.current) {
        return
      }
      setStatus(next)
      setDialogOpen(false)
      toast.success(`WSL에 \`${next.commandName}\`을(를) 등록했습니다.`)
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : `WSL에 \`${commandName}\`을(를) 등록하지 못했습니다.`
        )
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null)
      }
    }
  }

  const handleRemove = async (): Promise<void> => {
    setBusyAction('remove')
    try {
      const next = await window.api.cli.removeWsl()
      if (!mountedRef.current) {
        return
      }
      setStatus(next)
      setDialogOpen(false)
      toast.success(`WSL에서 \`${next.commandName}\`을(를) 제거했습니다.`)
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : `WSL에서 \`${commandName}\`을(를) 제거하지 못했습니다.`
        )
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null)
      }
    }
  }

  return (
    <>
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label>WSL 셸 명령</Label>
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'WSL CLI 등록 상태를 확인하는 중...'
                : (status?.detail ?? 'WSL 내부 ~/.local/bin에 `korca-ide`를 등록합니다.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void refreshStatus()}
                    disabled={loading || busyAction !== null}
                    aria-label="WSL CLI 상태 새로고침"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  새로고침
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              role="switch"
              aria-checked={isEnabled}
              disabled={loading || !isSupported || busyAction !== null}
              onClick={() => setDialogOpen(true)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors ${
                isEnabled ? 'bg-foreground' : 'bg-muted-foreground/30'
              } ${loading || !isSupported || busyAction !== null ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span
                className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
                  isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {status?.commandPath ? (
          <p className="text-xs text-muted-foreground">
            명령 경로:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{status.commandPath}</code>
          </p>
        ) : null}

        {status?.state === 'stale' && status.currentTarget ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            기존 실행기 대상: <code>{status.currentTarget}</code>
          </p>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEnabled
                ? `WSL에서 \`${commandName}\`을(를) 제거하시겠습니까?`
                : `WSL에 \`${commandName}\`을(를) 등록하시겠습니까?`}
            </DialogTitle>
            <DialogDescription>
              {isEnabled
                ? '이 작업은 WSL 셸 명령만 제거합니다. Korca 자체는 Windows에 그대로 남습니다.'
                : `Korca가 ${status?.commandPath ?? commandName}을(를) 등록해 WSL 터미널에서도 명령을 사용할 수 있게 합니다.`}
            </DialogDescription>
          </DialogHeader>
          {status?.commandPath ? (
            <p className="text-xs text-muted-foreground">
              대상 경로:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{status.commandPath}</code>
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={busyAction !== null}
            >
              취소
            </Button>
            <Button
              onClick={() => void (isEnabled ? handleRemove() : handleInstall())}
              disabled={busyAction !== null || !isSupported}
            >
              {busyAction === 'remove'
                ? '제거 중...'
                : busyAction === 'install'
                  ? '등록 중...'
                  : isEnabled
                    ? '제거'
                    : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
