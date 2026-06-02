import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { CliInstallStatus } from '../../../../shared/cli-install-types'
import {
  KORCA_CLI_SKILL_INSTALL_COMMAND,
  KORCA_CLI_SKILL_NAME
} from '@/lib/agent-feature-install-commands'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureKorcaCliAvailableForAgentSkillTerminal
} from '@/lib/agent-skill-cli-prerequisite'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
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
import { AgentSkillSetupPanel } from './AgentSkillSetupPanel'
import { WslCliRegistration } from './WslCliRegistration'

type CliSectionProps = {
  currentPlatform: string
}

function getRevealLabel(platform: string): string {
  if (platform === 'darwin') {
    return 'Finder에서 보기'
  }
  if (platform === 'win32') {
    return '탐색기에서 보기'
  }
  return '파일 관리자에서 보기'
}

function getInstallDescription(platform: string): string {
  if (platform === 'darwin') {
    return '`korca`를 /usr/local/bin에 등록합니다.'
  }
  if (platform === 'linux') {
    return '`korca-ide`를 ~/.local/bin에 등록합니다.'
  }
  if (platform === 'win32') {
    return '사용자 PATH에 `korca`를 등록합니다.'
  }
  return '이 플랫폼에서는 CLI 등록을 아직 사용할 수 없습니다.'
}

function getFallbackCommandName(platform: string): string {
  return platform === 'linux' ? 'korca-ide' : 'korca'
}

export function CliSection({ currentPlatform }: CliSectionProps): React.JSX.Element {
  const [status, setStatus] = useState<CliInstallStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<'install' | 'remove' | null>(null)
  const mountedRef = useMountedRef()
  const {
    installed: cliSkillDetected,
    loading: cliSkillLoading,
    error: cliSkillError,
    refresh: refreshCliSkill
  } = useInstalledAgentSkill(KORCA_CLI_SKILL_NAME, {
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })

  const handleStatusChange = useCallback(
    (nextStatus: CliInstallStatus): void => {
      if (mountedRef.current) {
        setStatus(nextStatus)
      }
    },
    [mountedRef]
  )

  const refreshStatus = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      handleStatusChange(await window.api.cli.getInstallStatus())
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : 'CLI 상태를 불러오지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [handleStatusChange, mountedRef])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const isEnabled = status?.state === 'installed'
  const isSupported = status?.supported ?? false
  const isBrowserManaged = status?.unsupportedReason === 'launch_mode_unavailable'
  const revealLabel = getRevealLabel(currentPlatform)
  const commandName = status?.commandName ?? getFallbackCommandName(currentPlatform)
  const canRevealCommandPath =
    status?.commandPath != null && ['installed', 'stale', 'conflict'].includes(status.state)

  const handleInstall = async (): Promise<void> => {
    setBusyAction('install')
    try {
      const next = await window.api.cli.install()
      if (mountedRef.current) {
        setStatus(next)
        setDialogOpen(false)
        toast.success(`\`${next.commandName}\`을 PATH에 등록했습니다.`)
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : `\`${commandName}\`을 PATH에 등록하지 못했습니다.`
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
      const next = await window.api.cli.remove()
      if (mountedRef.current) {
        setStatus(next)
        setDialogOpen(false)
        toast.success(`\`${next.commandName}\`을 PATH에서 제거했습니다.`)
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : `\`${commandName}\`을 PATH에서 제거하지 못했습니다.`
        )
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null)
      }
    }
  }

  return (
    <section className="space-y-4" data-settings-section="cli">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Korca CLI</h2>
        <p className="text-xs text-muted-foreground">
          터미널에서 Korca를 사용해 앱을 열고, 워크트리를 관리하고, Korca 터미널과 상호작용할 수
          있습니다.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label>셸 명령</Label>
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'CLI 등록을 확인하는 중…'
                : (status?.detail ?? getInstallDescription(currentPlatform))}
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
                    aria-label="CLI 상태 새로고침"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  새로고침
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isBrowserManaged ? (
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
            ) : null}
          </div>
        </div>

        {status?.commandPath ? (
          <p className="text-xs text-muted-foreground">
            Command path:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{status.commandPath}</code>
          </p>
        ) : null}

        {status?.state === 'stale' && status.currentTarget ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Existing launcher target: <code>{status.currentTarget}</code>
          </p>
        ) : null}

        {status?.state === 'installed' && !status.pathConfigured && status.pathDirectory ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {status.pathDirectory} is not currently visible on PATH for this shell.
          </p>
        ) : null}

        {!loading && !isSupported && !isBrowserManaged && status?.detail ? (
          <p className="text-xs text-muted-foreground">{status.detail}</p>
        ) : null}

        <div className="flex items-center gap-2">
          {status?.commandPath ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void window.api.shell.openPath(status.commandPath as string)}
              disabled={loading || !canRevealCommandPath}
              className="gap-2"
            >
              <FolderOpen className="size-3.5" />
              {revealLabel}
            </Button>
          ) : null}
        </div>

        {!isBrowserManaged ? (
          <div className="border-t border-border/60 pt-3">
            <div className="space-y-0.5">
              <Label>에이전트 스킬</Label>
              <p className="text-xs text-muted-foreground">
                Give agents Korca-aware workspace, terminal, and progress workflows.
              </p>
            </div>

            <AgentSkillSetupPanel
              className="mt-3"
              variant="inline"
              title="CLI skill"
              description="Enables agents to use Korca workspace, terminal, and progress commands."
              command={KORCA_CLI_SKILL_INSTALL_COMMAND}
              terminalTitle="CLI skill setup"
              terminalAriaLabel="CLI skill install terminal"
              terminalWorktreeId="settings-cli-skill-terminal"
              installed={cliSkillDetected}
              loading={cliSkillLoading}
              error={cliSkillError}
              preInstallNotice={AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
              onBeforeOpenTerminal={async () => {
                await ensureKorcaCliAvailableForAgentSkillTerminal({
                  onStatusChange: handleStatusChange
                })
              }}
              onRecheck={refreshCliSkill}
            />
          </div>
        ) : null}
      </div>

      <WslCliRegistration currentPlatform={currentPlatform} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEnabled
                ? `Remove \`${commandName}\` from PATH?`
                : `Register \`${commandName}\` in PATH?`}
            </DialogTitle>
            <DialogDescription>
              {isEnabled
                ? 'This removes the shell command symlink. Korca itself remains installed.'
                : `Korca will register ${status?.commandPath ?? commandName} so the command works from your terminal.`}
            </DialogDescription>
          </DialogHeader>
          {status?.commandPath ? (
            <p className="text-xs text-muted-foreground">
              Target path:{' '}
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
                ? '제거하는 중…'
                : busyAction === 'install'
                  ? '등록하는 중…'
                  : isEnabled
                    ? '제거'
                    : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
