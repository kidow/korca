import { useCallback, useEffect, useState } from 'react'
import { Check, Clipboard, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { PASTE_TERMINAL_TEXT_EVENT } from '@/constants/terminal'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureKorcaCliAvailableForAgentSkillTerminal,
  isKorcaCliAvailableOnPath
} from '@/lib/agent-skill-cli-prerequisite'
import { ORCHESTRATION_SKILL_INSTALL_COMMAND } from '@/lib/orchestration-install-command'
import {
  ORCHESTRATION_ENABLED_STORAGE_KEY,
  ORCHESTRATION_SETUP_DISMISSED_STORAGE_KEY,
  notifyOrchestrationSetupStateChanged
} from '@/lib/orchestration-setup-state'
import { useMountedRef } from '@/hooks/useMountedRef'
import type { CliInstallStatus } from '../../../../shared/cli-install-types'

type FloatingTerminalOrchestrationDialogProps = {
  open: boolean
  activeTabId: string | null
  onOpenChange: (open: boolean) => void
  onSetupStateChange: () => void
}

export function FloatingTerminalOrchestrationDialog({
  open,
  activeTabId,
  onOpenChange,
  onSetupStateChange
}: FloatingTerminalOrchestrationDialogProps): React.JSX.Element {
  const [cliStatus, setCliStatus] = useState<CliInstallStatus | null>(null)
  const [cliLoading, setCliLoading] = useState(false)
  const [cliBusy, setCliBusy] = useState(false)
  const [skillBusy, setSkillBusy] = useState(false)
  const mountedRef = useMountedRef()

  const setCliStatusIfMounted = useCallback(
    (status: CliInstallStatus | null): void => {
      if (mountedRef.current) {
        setCliStatus(status)
      }
    },
    [mountedRef]
  )

  const refreshCliStatus = useCallback(async (): Promise<void> => {
    setCliLoading(true)
    try {
      setCliStatusIfMounted(await window.api.cli.getInstallStatus())
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : 'Failed to load CLI status.')
      }
    } finally {
      if (mountedRef.current) {
        setCliLoading(false)
      }
    }
  }, [mountedRef, setCliStatusIfMounted])

  useEffect(() => {
    if (open) {
      void refreshCliStatus()
    }
  }, [open, refreshCliStatus])

  const cliInstalled = isKorcaCliAvailableOnPath(cliStatus)
  const cliSupported = cliStatus?.supported ?? false
  const cliLabel = cliInstalled
    ? 'Korca CLI is on PATH'
    : cliLoading
      ? 'Checking CLI status...'
      : (cliStatus?.detail ?? 'Register the Korca CLI so agents can call Korca from a terminal.')

  const handleInstallCli = async (): Promise<void> => {
    setCliBusy(true)
    try {
      const next = await ensureKorcaCliAvailableForAgentSkillTerminal({
        onStatusChange: setCliStatusIfMounted
      })
      if (!mountedRef.current) {
        return
      }
      if (next) {
        notifyOrchestrationSetupStateChanged()
        onSetupStateChange()
      }
      if (isKorcaCliAvailableOnPath(next)) {
        toast.success('Registered the Korca CLI in PATH.')
      }
    } finally {
      if (mountedRef.current) {
        setCliBusy(false)
      }
    }
  }

  const handlePasteSkillCommand = async (): Promise<void> => {
    setSkillBusy(true)
    try {
      const nextCliStatus = await ensureKorcaCliAvailableForAgentSkillTerminal({
        onStatusChange: setCliStatusIfMounted
      })
      if (!mountedRef.current) {
        return
      }
      localStorage.setItem(ORCHESTRATION_ENABLED_STORAGE_KEY, '1')
      localStorage.removeItem(ORCHESTRATION_SETUP_DISMISSED_STORAGE_KEY)
      notifyOrchestrationSetupStateChanged()
      await window.api.ui.writeClipboardText(ORCHESTRATION_SKILL_INSTALL_COMMAND)
      if (activeTabId) {
        window.dispatchEvent(
          new CustomEvent(PASTE_TERMINAL_TEXT_EVENT, {
            detail: {
              tabId: activeTabId,
              text: ORCHESTRATION_SKILL_INSTALL_COMMAND
            }
          })
        )
        toast.success('스킬 설치 명령을 붙여넣었습니다. Enter를 눌러 실행하세요.')
      } else {
        toast.success('스킬 설치 명령을 복사했습니다.')
      }
      onSetupStateChange()
      if (isKorcaCliAvailableOnPath(nextCliStatus ?? cliStatus)) {
        onOpenChange(false)
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : '스킬 명령을 복사하지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setSkillBusy(false)
      }
    }
  }

  const handleCopySkillCommand = async (): Promise<void> => {
    try {
      await window.api.ui.writeClipboardText(ORCHESTRATION_SKILL_INSTALL_COMMAND)
      toast.success('스킬 설치 명령을 복사했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '스킬 명령을 복사하지 못했습니다.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>오케스트레이션 사용</DialogTitle>
          <DialogDescription>
            Korca CLI를 추가한 뒤, 이 터미널에 에이전트 스킬을 설치하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-muted/20">
          <div className="min-w-0 px-3 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">Korca CLI</p>
                <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0">{cliLabel}</span>
                  {cliInstalled && cliStatus?.commandPath ? (
                    <code className="min-w-0 overflow-x-auto whitespace-nowrap rounded bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      {cliStatus.commandPath}
                    </code>
                  ) : null}
                </p>
              </div>
              <div className="shrink-0">
                {cliInstalled ? (
                  <Button
                    variant="outline"
                    size="xs"
                    disabled
                    className="shrink-0 gap-1.5 disabled:opacity-100"
                    aria-label="Korca CLI가 PATH에 추가됨"
                  >
                    <Check className="size-3" />
                    추가됨
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => void handleInstallCli()}
                    disabled={cliLoading || cliBusy || !cliSupported}
                    className="shrink-0 gap-1.5"
                  >
                    {cliBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    PATH에 추가
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 py-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">오케스트레이션 스킬</p>
                  <p className="text-xs text-muted-foreground">
                    이 명령을 터미널에 붙여넣으면 에이전트가 Korca를 통해 협업할 수 있습니다.
                  </p>
                  {!cliInstalled ? (
                    <p className="text-xs text-muted-foreground">
                      {AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => void handlePasteSkillCommand()}
                  disabled={skillBusy}
                  className="shrink-0 gap-1.5"
                >
                  {skillBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Clipboard className="size-3.5" />
                  )}
                  {activeTabId ? '붙여넣기' : '복사'}
                </Button>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded bg-background px-2 py-1.5">
                <code className="min-w-0 flex-1 text-[11px] leading-relaxed break-all whitespace-normal text-muted-foreground">
                  {ORCHESTRATION_SKILL_INSTALL_COMMAND}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
                  onClick={() => void handleCopySkillCommand()}
                  aria-label="오케스트레이션 스킬 설치 명령 복사"
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
