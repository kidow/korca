import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Accessibility,
  Camera,
  ExternalLink,
  MonitorCog,
  RefreshCw,
  ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  ComputerUsePermissionId,
  ComputerUsePermissionState,
  ComputerUsePermissionStatus
} from '../../../../shared/computer-use-permissions-types'
import {
  COMPUTER_USE_SKILL_INSTALL_COMMAND,
  COMPUTER_USE_SKILL_NAME
} from '@/lib/agent-feature-install-commands'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureKorcaCliAvailableForAgentSkillTerminal
} from '@/lib/agent-skill-cli-prerequisite'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import { useAppStore } from '@/store'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { AgentSkillSetupPanel } from './AgentSkillSetupPanel'
export { COMPUTER_USE_PANE_SEARCH_ENTRIES } from './computer-use-search'

type PermissionDefinition = {
  id: ComputerUsePermissionId
  label: string
  description: string
  icon: ReactNode
}

const PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'accessibility',
    label: '접근성',
    description: '앱 인터페이스 트리를 읽고 요청한 동작을 수행합니다.',
    icon: <Accessibility className="size-4" />
  },
  {
    id: 'screenshots',
    label: '스크린샷',
    description: '앱 창을 캡처해 에이전트가 시각 상태를 살펴볼 수 있게 합니다.',
    icon: <Camera className="size-4" />
  }
]

function statusLabel(status: ComputerUsePermissionStatus | undefined): string {
  switch (status) {
    case 'granted':
      return '허용됨'
    case 'unsupported':
      return 'macOS 전용'
    case 'not-granted':
    case undefined:
      return '사용 안 함'
  }
}

function statusClass(status: ComputerUsePermissionStatus | undefined): string {
  if (status === 'granted') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }
  return 'border-border bg-muted text-muted-foreground'
}

export function ComputerUsePane(): React.JSX.Element {
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null)
  const [states, setStates] = useState<ComputerUsePermissionState[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<ComputerUsePermissionId | null>(null)
  const [resetting, setResetting] = useState(false)
  // Why: reset changes OS permission state, so older status probes must not overwrite it.
  const resettingRef = useRef(false)
  const permissionOperationSequence = useRef(0)
  const mountedRef = useRef(true)
  const [helperUnavailableReason, setHelperUnavailableReason] = useState<string | null>(null)
  const {
    installed: computerUseSkillDetected,
    loading: computerUseSkillLoading,
    error: computerUseSkillError,
    refresh: refreshComputerUseSkill
  } = useInstalledAgentSkill(COMPUTER_USE_SKILL_NAME, {
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })

  const stateById = useMemo(
    () => new Map(states.map((state) => [state.id, state.status] as const)),
    [states]
  )
  const grantedCount = PERMISSIONS.filter(
    (permission) => stateById.get(permission.id) === 'granted'
  ).length
  const allGranted = grantedCount === PERMISSIONS.length
  const checking = loading && states.length === 0
  const setupUnavailable = helperUnavailableReason !== null
  const resetAccessDisabled =
    resetting || loading || states.length === 0 || pendingId !== null || setupUnavailable
  const summaryTitle = checking
    ? 'Computer Use 접근 권한을 확인하는 중입니다.'
    : setupUnavailable
      ? 'Computer Use를 사용할 수 없습니다.'
      : allGranted
        ? 'Computer Use를 사용할 준비가 됐습니다.'
        : '로컬 앱을 사용하려면 설정을 완료하세요.'
  const summaryDescription = checking
    ? 'Korca가 Computer Use 도우미의 macOS 개인정보 보호 권한을 확인하고 있습니다.'
    : setupUnavailable
      ? `Computer Use 권한을 사용할 수 없는 이유: ${helperUnavailableReason}.`
      : allGranted
        ? '요청하면 에이전트가 앱 창을 살펴보고 조작할 수 있습니다.'
        : `에이전트가 앱 창을 조작하려면 권한 ${PERMISSIONS.length - grantedCount}개가 더 필요합니다.`

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      permissionOperationSequence.current += 1
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    if (resettingRef.current) {
      return
    }

    const operationId = ++permissionOperationSequence.current
    setLoading(true)
    try {
      const result = await window.api.computerUsePermissions.getStatus()
      if (operationId !== permissionOperationSequence.current) {
        return
      }
      if (!mountedRef.current) {
        return
      }
      setPlatform(result.platform)
      setStates(result.permissions)
      setHelperUnavailableReason(result.helperUnavailableReason)
    } catch (error) {
      if (operationId !== permissionOperationSequence.current || !mountedRef.current) {
        return
      }
      toast.error(
        error instanceof Error ? error.message : 'Computer Use 권한을 불러오지 못했습니다'
      )
    } finally {
      if (operationId === permissionOperationSequence.current && mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Why: users grant these in System Settings, so refresh when focus returns
  // instead of polling while the settings pane is open.
  useEffect(() => {
    const onFocus = (): void => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const openPermission = async (id: ComputerUsePermissionId): Promise<void> => {
    useAppStore.getState().recordFeatureInteraction('computer-use-setup')
    setPendingId(id)
    try {
      const result = await window.api.computerUsePermissions.openSetup({ id })
      if (!mountedRef.current) {
        return
      }
      if (result.launchedHelper) {
        toast.message('macOS 개인정보 보호 및 보안을 열었습니다')
      } else {
        toast.message(
          result.platform === 'darwin'
            ? 'Computer Use 설정이 이미 완료되었습니다'
            : 'Computer Use 권한은 macOS에서만 필요합니다'
        )
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error ? error.message : 'Computer Use 권한을 열지 못했습니다'
        )
      }
    } finally {
      if (mountedRef.current) {
        setPendingId(null)
      }
    }
  }

  const resetAccess = async (): Promise<void> => {
    if (resettingRef.current) {
      return
    }

    resettingRef.current = true
    const operationId = ++permissionOperationSequence.current
    setResetting(true)
    try {
      const result = await window.api.computerUsePermissions.reset()
      if (operationId !== permissionOperationSequence.current) {
        return
      }
      if (!mountedRef.current) {
        return
      }
      setPlatform(result.platform)
      setStates(result.permissions)
      setHelperUnavailableReason(result.helperUnavailableReason)
      toast.message('Computer Use 접근 권한을 초기화했습니다')
    } catch (error) {
      if (operationId !== permissionOperationSequence.current || !mountedRef.current) {
        return
      }
      toast.error(
        error instanceof Error ? error.message : 'Computer Use 권한을 초기화하지 못했습니다'
      )
    } finally {
      if (operationId === permissionOperationSequence.current && mountedRef.current) {
        resettingRef.current = false
        setResetting(false)
        setLoading(false)
      }
    }
  }

  const isMac = platform === null || platform === 'darwin'

  return (
    <div className="space-y-5">
      {isMac ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/25 px-4 py-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4" />
                {summaryTitle}
                {allGranted ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  >
                    준비됨
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{summaryDescription}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={resetting}
              onClick={() => void refresh()}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          <div className="space-y-2">
            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {PERMISSIONS.map((permission) => {
                const status = stateById.get(permission.id)
                const pending = pendingId === permission.id

                return (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 text-muted-foreground">{permission.icon}</div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{permission.label}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusClass(
                              status
                            )}`}
                          >
                            {statusLabel(status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                    <div className="flex w-28 shrink-0 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          resetting ||
                          pending ||
                          status === 'unsupported' ||
                          helperUnavailableReason !== null
                        }
                        onClick={() => void openPermission(permission.id)}
                        className="gap-1.5"
                      >
                        <ExternalLink className="size-3.5" />
                        열기
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              disabled={resetAccessDisabled}
              onClick={() => void resetAccess()}
              className="ml-auto mr-4 block w-28 text-right text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {resetting ? '권한 초기화 중...' : '권한 초기화'}
            </button>
          </div>
        </>
      ) : null}

      <AgentSkillSetupPanel
        title="Computer Use 스킬"
        description="에이전트가 로컬 데스크톱 앱을 살펴보고 조작할 수 있게 합니다."
        command={COMPUTER_USE_SKILL_INSTALL_COMMAND}
        terminalTitle="Computer Use 설정"
        terminalAriaLabel="Computer Use 스킬 설치 터미널"
        terminalWorktreeId="settings-computer-use-skill-terminal"
        installed={computerUseSkillDetected}
        loading={computerUseSkillLoading}
        error={computerUseSkillError}
        icon={<MonitorCog className="size-5" />}
        preInstallNotice={AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
        onBeforeOpenTerminal={async () => {
          useAppStore.getState().recordFeatureInteraction('computer-use-setup')
          await ensureKorcaCliAvailableForAgentSkillTerminal()
        }}
        onRecheck={refreshComputerUseSkill}
      />
    </div>
  )
}
