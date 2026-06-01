/* eslint-disable max-lines -- Why: Browser Use setup keeps enablement, CLI registration, skill install, cookie import, examples, and interaction tracking in one pane so the three-step setup state stays coherent. */
import { useCallback, useEffect, useState } from 'react'
import { Import, Loader2, MousePointerClick } from 'lucide-react'
import { toast } from 'sonner'
import type { CliInstallStatus } from '../../../../shared/cli-install-types'
import {
  ORCA_CLI_SKILL_INSTALL_COMMAND,
  ORCA_CLI_SKILL_NAME
} from '@/lib/agent-feature-install-commands'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureOrcaCliAvailableForAgentSkillTerminal,
  isOrcaCliAvailableOnPath
} from '@/lib/agent-skill-cli-prerequisite'
import { BROWSER_USE_ENABLED_STORAGE_KEY } from '@/lib/browser-use-setup-state'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { useAppStore } from '../../store'
import { BROWSER_FAMILY_LABELS } from '../../../../shared/constants'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { BROWSER_USE_PANE_SEARCH_ENTRIES } from './browser-use-search'
import { BrowserUseExamples } from './BrowserUseExamples'
import { StepBadge } from './BrowserUseStepBadge'
import { BrowserUseSkillStep } from './BrowserUseSkillStep'

type BrowserUseSetupProps = {
  onConfigureMoreBrowsers?: () => void
  onOpenComputerUse?: () => void
}

export function BrowserUseSetup({
  onConfigureMoreBrowsers,
  onOpenComputerUse
}: BrowserUseSetupProps = {}): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const browserSessionProfiles = useAppStore((s) => s.browserSessionProfiles)
  const detectedBrowsers = useAppStore((s) => s.detectedBrowsers)
  const fetchBrowserSessionProfiles = useAppStore((s) => s.fetchBrowserSessionProfiles)
  const fetchDetectedBrowsers = useAppStore((s) => s.fetchDetectedBrowsers)
  const browserSessionImportState = useAppStore((s) => s.browserSessionImportState)

  const [cliStatus, setCliStatus] = useState<CliInstallStatus | null>(null)
  const [cliLoading, setCliLoading] = useState(true)
  const [cliBusy, setCliBusy] = useState(false)
  const mountedRef = useMountedRef()

  const handleCliStatusChange = useCallback(
    (nextStatus: CliInstallStatus): void => {
      if (mountedRef.current) {
        setCliStatus(nextStatus)
      }
    },
    [mountedRef]
  )

  // Why: the toggle gates only whether we show the setup instructions. We
  // persist it in localStorage instead of global settings because it has no
  // functional effect elsewhere in the app — it's a UI affordance local to
  // this pane, consistent with the skill-installed marker below.
  const [browserUseEnabled, setBrowserUseEnabled] = useState<boolean>(() => {
    return localStorage.getItem(BROWSER_USE_ENABLED_STORAGE_KEY) === '1'
  })

  const toggleBrowserUse = (value: boolean): void => {
    setBrowserUseEnabled(value)
    localStorage.setItem(BROWSER_USE_ENABLED_STORAGE_KEY, value ? '1' : '0')
    if (value) {
      useAppStore.getState().recordFeatureInteraction('agent-browser-setup')
    }
  }

  const refreshCli = useCallback(async (): Promise<void> => {
    setCliLoading(true)
    try {
      handleCliStatusChange(await window.api.cli.getInstallStatus())
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : 'CLI 상태를 불러오지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setCliLoading(false)
      }
    }
  }, [handleCliStatusChange, mountedRef])

  useEffect(() => {
    // Why: skip IPC work when the feature is toggled off — the component
    // returns early below and none of this data is rendered.
    if (!browserUseEnabled) {
      return
    }
    void refreshCli()
    void fetchBrowserSessionProfiles()
  }, [browserUseEnabled, fetchBrowserSessionProfiles, refreshCli])

  const defaultProfile = browserSessionProfiles.find((p) => p.id === 'default')
  // Why: this step explicitly imports into the default profile, so completion
  // must track that profile only. Marking done when a non-default profile has
  // cookies would mislead users into thinking agents can reach their logins
  // when the default profile — the one agents use — is still empty.
  const cookiesImported = !!defaultProfile?.source

  const cliEnabled = isOrcaCliAvailableOnPath(cliStatus)
  const cliPathNeedsAttention = cliStatus?.state === 'installed' && !cliStatus.pathConfigured
  const cliSupported = cliStatus?.supported ?? false

  const {
    installed: skillDetected,
    loading: skillLoading,
    error: skillError,
    refresh: refreshSkill
  } = useInstalledAgentSkill(ORCA_CLI_SKILL_NAME, {
    enabled: browserUseEnabled,
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })

  const handleEnableCli = async (): Promise<void> => {
    setCliBusy(true)
    try {
      const next = await ensureOrcaCliAvailableForAgentSkillTerminal({
        onStatusChange: handleCliStatusChange
      })
      if (mountedRef.current && isOrcaCliAvailableOnPath(next)) {
        toast.success('PATH에 Orca CLI를 등록했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setCliBusy(false)
      }
    }
  }

  const handleImportFromBrowser = async (
    browserFamily: string,
    browserProfile?: string
  ): Promise<void> => {
    const profileId = 'default'
    const result = await useAppStore
      .getState()
      .importCookiesFromBrowser(profileId, browserFamily, browserProfile)
    if (result.ok) {
      const browser = detectedBrowsers.find((b) => b.family === browserFamily)
      toast.success(
        `${browser?.label ?? browserFamily}${browserProfile ? ` (${browserProfile})` : ''}에서 쿠키 ${result.summary.importedCookies}개를 가져왔습니다.`
      )
    } else {
      toast.error(result.reason)
    }
  }

  const handleImportFromFile = async (): Promise<void> => {
    const result = await useAppStore.getState().importCookiesToProfile('default')
    if (result.ok) {
      toast.success(`파일에서 쿠키 ${result.summary.importedCookies}개를 가져왔습니다.`)
    } else if (result.reason !== 'canceled') {
      toast.error(result.reason)
    }
  }

  const isImportingDefault =
    browserSessionImportState?.profileId === 'default' &&
    browserSessionImportState.status === 'importing'

  const showStep1 = matchesSettingsSearch(searchQuery, [BROWSER_USE_PANE_SEARCH_ENTRIES[0]])
  const showStep2 = matchesSettingsSearch(searchQuery, [BROWSER_USE_PANE_SEARCH_ENTRIES[1]])
  const showStep3 = matchesSettingsSearch(searchQuery, [BROWSER_USE_PANE_SEARCH_ENTRIES[2]])
  const completedCount = [cliEnabled, skillDetected, cookiesImported].filter(Boolean).length

  const sourceLabel = defaultProfile?.source
    ? `${BROWSER_FAMILY_LABELS[defaultProfile.source.browserFamily] ?? defaultProfile.source.browserFamily}${defaultProfile.source.profileName ? ` (${defaultProfile.source.profileName})` : ''}`
    : null

  const toggleSwitch = (
    <button
      role="switch"
      aria-checked={browserUseEnabled}
      aria-label="에이전트 브라우저 사용 켜기"
      onClick={() => toggleBrowserUse(!browserUseEnabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
        browserUseEnabled ? 'bg-foreground' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
          browserUseEnabled ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )

  if (!browserUseEnabled) {
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">에이전트 브라우저 사용</p>
          <p className="text-xs text-muted-foreground">
            코딩 에이전트가 로그인된 상태로 이 브라우저를 조작할 수 있습니다.
          </p>
        </div>
        {toggleSwitch}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">에이전트 브라우저 사용</p>
          <p className="text-xs text-muted-foreground">
            코딩 에이전트가 로그인된 상태로 이 브라우저를 조작할 수 있습니다. 아래 3단계를 완료하세요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              completedCount === 3
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {completedCount}/3
          </span>
          {toggleSwitch}
        </div>
      </div>

      {onOpenComputerUse ? (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">기존 브라우저 세션 사용</p>
              <p className="text-xs text-muted-foreground">
                쿠키 가져오기가 맞지 않으면 Computer Use가 로컬 앱을 제어하고, 가능한 경우 이미 로그인된 브라우저 세션을 사용할 수 있습니다. Computer Use 스킬을 설치하세요. macOS에서는 개인정보 보호 권한도 필요합니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenComputerUse}
              className="shrink-0 gap-1.5 self-start"
            >
              <MousePointerClick className="size-3.5" />
              Computer Use 열기
            </Button>
          </div>
        </div>
      ) : null}

      {showStep1 ? (
        <SearchableSetting
          title="Orca CLI 켜기"
          description="에이전트가 브라우저를 조작할 수 있도록 Orca CLI를 등록합니다."
          keywords={BROWSER_USE_PANE_SEARCH_ENTRIES[0].keywords}
          className="rounded-xl border border-border/60 bg-card/50 p-4"
        >
          <div className="flex items-start gap-3">
            <StepBadge
              index={1}
              state={cliEnabled ? 'done' : cliBusy ? 'in-progress' : 'pending'}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">Orca CLI 켜기</p>
              <p className="text-xs text-muted-foreground">
                에이전트가 셸에서 브라우저를 조작할 수 있도록 Orca CLI 명령을 등록합니다.
              </p>
              {cliStatus?.commandPath && cliEnabled ? (
                <p className="text-[11px] text-muted-foreground">
                  설치 위치{' '}
                  <code className="rounded bg-muted px-1 py-0.5">{cliStatus.commandPath}</code>
                </p>
              ) : null}
              {cliPathNeedsAttention && cliStatus?.detail ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{cliStatus.detail}</p>
              ) : null}
            </div>
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant={cliEnabled ? 'outline' : 'default'}
                      disabled={cliLoading || cliBusy || !cliSupported || cliEnabled}
                      onClick={() => void handleEnableCli()}
                    >
                      {cliBusy
                        ? '등록 중...'
                        : cliEnabled
                          ? '켜짐'
                          : cliPathNeedsAttention
                            ? 'PATH 수정'
                            : '켜기'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!cliSupported && !cliLoading && cliStatus?.detail ? (
                  <TooltipContent side="left" sideOffset={6}>
                    {cliStatus.detail}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
        </SearchableSetting>
      ) : null}

      {showStep2 ? (
        <SearchableSetting
          title="Browser Use 스킬 설치"
          description="에이전트가 Orca의 브라우저를 조작할 수 있도록 Browser Use 스킬을 설치합니다."
          keywords={BROWSER_USE_PANE_SEARCH_ENTRIES[1].keywords}
          className={`rounded-xl border border-border/60 bg-card/50 p-4 ${
            cliEnabled ? '' : 'opacity-60'
          }`}
        >
          <BrowserUseSkillStep
            command={ORCA_CLI_SKILL_INSTALL_COMMAND}
            skillDetected={skillDetected}
            skillLoading={skillLoading}
            skillError={skillError}
            disabled={!cliEnabled}
            preInstallNotice={AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
            onBeforeOpenTerminal={async () => {
              useAppStore.getState().recordFeatureInteraction('agent-browser-setup')
              await ensureOrcaCliAvailableForAgentSkillTerminal({
                onStatusChange: handleCliStatusChange
              })
            }}
            onRecheck={refreshSkill}
          />
        </SearchableSetting>
      ) : null}

      {showStep3 ? (
        <SearchableSetting
          title="브라우저 쿠키 가져오기"
          description="Chrome, Edge 또는 다른 브라우저의 쿠키를 가져와 에이전트가 로그인 상태를 재사용할 수 있게 합니다."
          keywords={BROWSER_USE_PANE_SEARCH_ENTRIES[2].keywords}
          className={`rounded-xl border border-border/60 bg-card/50 p-4 ${
            cliEnabled && skillDetected ? '' : 'opacity-60'
          }`}
        >
          <div className="flex items-start gap-3">
            <StepBadge
              index={3}
              state={cookiesImported ? 'done' : isImportingDefault ? 'in-progress' : 'pending'}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">브라우저 쿠키 가져오기</p>
              <p className="text-xs text-muted-foreground">
                기존 로그인 정보를 Orca에 가져와 에이전트가 인증된 페이지에 접근할 수 있게 합니다. 기본 프로필로 가져옵니다.
              </p>
              {sourceLabel ? (
                <p className="text-[11px] text-muted-foreground">
                  마지막 가져오기 원본: {sourceLabel}
                </p>
              ) : null}
              {onConfigureMoreBrowsers ? (
                  <button
                  type="button"
                  onClick={onConfigureMoreBrowsers}
                  className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  서로 다른 로그인을 위한 프로필 관리
                </button>
              ) : null}
            </div>
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) {
                  // Why: macOS treats other browsers' profile folders as app
                  // data. Only probe them when the user opens the import menu.
                  void fetchDetectedBrowsers()
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant={cookiesImported ? 'outline' : 'default'}
                  size="sm"
                  disabled={isImportingDefault}
                  className="gap-1.5"
                >
                  {isImportingDefault ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Import className="size-3.5" />
                  )}
                  {cookiesImported ? '다시 가져오기' : '가져오기'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {detectedBrowsers.map((browser) =>
                  browser.profiles.length > 1 ? (
                    <DropdownMenuSub key={browser.family}>
                      <DropdownMenuSubTrigger>{browser.label}에서 가져오기</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {browser.profiles.map((bp) => (
                            <DropdownMenuItem
                              key={bp.directory}
                              onSelect={() =>
                                void handleImportFromBrowser(browser.family, bp.directory)
                              }
                            >
                              {bp.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ) : (
                    <DropdownMenuItem
                      key={browser.family}
                      onSelect={() => void handleImportFromBrowser(browser.family)}
                    >
                      {browser.label}에서 가져오기
                    </DropdownMenuItem>
                  )
                )}
                {detectedBrowsers.length > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem onSelect={() => void handleImportFromFile()}>
                    파일에서…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SearchableSetting>
      ) : null}

      <BrowserUseExamples />
    </div>
  )
}
