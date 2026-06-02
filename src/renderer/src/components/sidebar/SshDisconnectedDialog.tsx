import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Server, ServerOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import { statusColor } from '@/components/settings/SshTargetCard'
import type { SshConnectionStatus } from '../../../../shared/ssh-types'

type SshDisconnectedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetId: string
  targetLabel: string
  status: SshConnectionStatus
}

const STATUS_MESSAGES: Partial<Record<SshConnectionStatus, string>> = {
  disconnected: '이 원격 저장소는 연결되어 있지 않습니다.',
  reconnecting: '원격 호스트에 다시 연결하는 중...',
  'reconnection-failed': '원격 호스트 재연결에 실패했습니다.',
  error: '원격 호스트 연결 중 오류가 발생했습니다.',
  'auth-failed': '원격 호스트 인증에 실패했습니다.'
}

function isReconnectable(status: SshConnectionStatus): boolean {
  return ['disconnected', 'reconnection-failed', 'error', 'auth-failed'].includes(status)
}

export function SshDisconnectedDialog({
  open,
  onOpenChange,
  targetId,
  targetLabel,
  status
}: SshDisconnectedDialogProps): React.JSX.Element {
  const [connecting, setConnecting] = useState(false)
  const mountedRef = useMountedRef()

  const handleReconnect = useCallback(async () => {
    setConnecting(true)
    try {
      await window.api.ssh.connect({ targetId })
      if (mountedRef.current) {
        onOpenChange(false)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재연결에 실패했습니다')
    } finally {
      if (mountedRef.current) {
        setConnecting(false)
      }
    }
  }, [mountedRef, targetId, onOpenChange])

  const isConnecting =
    connecting ||
    status === 'connecting' ||
    status === 'deploying-relay' ||
    status === 'reconnecting'
  const message = isConnecting
    ? '원격 호스트에 다시 연결하는 중...'
    : (STATUS_MESSAGES[status] ?? '이 원격 저장소는 연결되어 있지 않습니다.')
  const showReconnect = isReconnectable(status)

  useEffect(() => {
    // Window-level Enter handler. The dialog typically appears while focus
    // is inside an embedded terminal (xterm) or editor (monaco) that
    // aggressively reclaims focus, so dialog-scoped key handlers never
    // fire. Listening on window (capture phase) catches Enter regardless
    // of where focus actually lives while the dialog is open.
    if (!open || !showReconnect || isConnecting) {
      return undefined
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.defaultPrevented) {
        return
      }
      if (event.isComposing) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      void handleReconnect()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, showReconnect, isConnecting, handleReconnect])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm gap-3 p-5" showCloseButton={false}>
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            {isConnecting ? (
              <Loader2 className="size-4 text-yellow-500 animate-spin" />
            ) : (
              <ServerOff className="size-4 text-muted-foreground" />
            )}
            {isConnecting ? '다시 연결하는 중...' : 'SSH 연결 끊김'}
          </DialogTitle>
          <DialogDescription className="text-xs">{message}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-card/40 px-3 py-2">
          <Server className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium">{targetLabel}</span>
          </div>
          {isConnecting ? (
            <Loader2 className="size-3.5 shrink-0 text-yellow-500 animate-spin" />
          ) : (
            <span className={`size-1.5 shrink-0 rounded-full ${statusColor(status)}`} />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            닫기
          </Button>
          {showReconnect && (
            <Button size="sm" onClick={() => void handleReconnect()} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  연결 중...
                </>
              ) : (
                '다시 연결'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
