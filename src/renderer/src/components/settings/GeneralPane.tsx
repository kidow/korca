/* eslint-disable max-lines -- Why: GeneralPane is the single owner of all general settings UI;
   splitting individual settings into separate files would scatter related controls without a
   meaningful abstraction boundary. */
import { useEffect, useRef, useState } from 'react'
import type { GlobalSettings, OpenInApplication } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { Download, FolderOpen, Loader2, RefreshCw, Star, Timer } from 'lucide-react'
import { useAppStore } from '../../store'
import { CliSection } from './CliSection'
import { toast } from 'sonner'
import {
  DEFAULT_EDITOR_AUTO_SAVE_DELAY_MS,
  MAX_EDITOR_AUTO_SAVE_DELAY_MS,
  MIN_EDITOR_AUTO_SAVE_DELAY_MS
} from '../../../../shared/constants'
import { OPEN_IN_APPLICATIONS_MAX } from '../../../../shared/open-in-applications'
import { clampNumber } from '@/lib/terminal-theme'
import {
  GENERAL_CACHE_TIMER_SEARCH_ENTRIES,
  GENERAL_CLI_SEARCH_ENTRIES,
  GENERAL_EDITOR_SEARCH_ENTRIES,
  GENERAL_NAVIGATION_SEARCH_ENTRIES,
  GENERAL_NETWORK_SEARCH_ENTRIES,
  GENERAL_PANE_SEARCH_ENTRIES,
  GENERAL_SUPPORT_SEARCH_ENTRIES,
  GENERAL_UPDATE_SEARCH_ENTRIES,
  GENERAL_WORKSPACE_SEARCH_ENTRIES
} from './general-search'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { RecentTabOrderControl } from './RecentTabOrderControl'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import {
  SettingsSegmentedControl,
  SettingsSubsectionHeader,
  SettingsSwitch,
  SettingsSwitchRow
} from './SettingsFormControls'
import { useMountedRef } from '@/hooks/useMountedRef'
import { normalizeProxyBypassRules, normalizeProxyUrl } from '../../../../shared/network-proxy'

function createOpenInApplication(): OpenInApplication {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `open-in-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    label: '',
    command: ''
  }
}

function createPresetOpenInApplication(label: string, command: string): OpenInApplication {
  return {
    ...createOpenInApplication(),
    label,
    command
  }
}

export function shouldCommitOpenInApplicationsDraft(applications: OpenInApplication[]): boolean {
  return applications.every((application) => {
    return application.label.trim() !== '' && application.command.trim() !== ''
  })
}

export function getDesktopPlatformFromUserAgent(userAgent: string): 'darwin' | 'win32' | 'other' {
  if (userAgent.includes('Mac')) {
    return 'darwin'
  }
  if (userAgent.includes('Windows')) {
    return 'win32'
  }
  return 'other'
}

export { GENERAL_PANE_SEARCH_ENTRIES }

export type AutoSaveDelayDraftState = {
  sourceDelayMs: number
  draft: string
}

export function createAutoSaveDelayDraftState(
  editorAutoSaveDelayMs: number
): AutoSaveDelayDraftState {
  return {
    sourceDelayMs: editorAutoSaveDelayMs,
    draft: String(editorAutoSaveDelayMs)
  }
}

function resolveAutoSaveDelayDraftState(
  state: AutoSaveDelayDraftState,
  editorAutoSaveDelayMs: number
): AutoSaveDelayDraftState {
  return state.sourceDelayMs === editorAutoSaveDelayMs
    ? state
    : createAutoSaveDelayDraftState(editorAutoSaveDelayMs)
}

export function updateAutoSaveDelayDraftState(
  state: AutoSaveDelayDraftState,
  editorAutoSaveDelayMs: number,
  draft: string
): AutoSaveDelayDraftState {
  return {
    // Why: settings persistence is async, so a committed draft must stay tied
    // to the current source until the persisted value reloads.
    ...resolveAutoSaveDelayDraftState(state, editorAutoSaveDelayMs),
    draft
  }
}

export type HttpProxyUrlDraftState = {
  sourceValue: string
  draft: string
  error: string | null
}

export function createHttpProxyUrlDraftState(
  httpProxyUrl: string | undefined
): HttpProxyUrlDraftState {
  const sourceValue = httpProxyUrl ?? ''
  return {
    sourceValue,
    draft: sourceValue,
    error: null
  }
}

function resolveHttpProxyUrlDraftState(
  state: HttpProxyUrlDraftState,
  httpProxyUrl: string | undefined
): HttpProxyUrlDraftState {
  const sourceValue = httpProxyUrl ?? ''
  return state.sourceValue === sourceValue ? state : createHttpProxyUrlDraftState(httpProxyUrl)
}

export function updateHttpProxyUrlDraftState(
  state: HttpProxyUrlDraftState,
  httpProxyUrl: string | undefined,
  draft: string
): HttpProxyUrlDraftState {
  return {
    // Why: settings persistence is async, so edits after an external settings
    // reload must build on the latest persisted proxy source.
    ...resolveHttpProxyUrlDraftState(state, httpProxyUrl),
    draft,
    error: null
  }
}

export function setHttpProxyUrlDraftErrorState(
  state: HttpProxyUrlDraftState,
  httpProxyUrl: string | undefined,
  error: string
): HttpProxyUrlDraftState {
  return {
    ...resolveHttpProxyUrlDraftState(state, httpProxyUrl),
    error
  }
}

export type HttpProxyBypassRulesDraftState = {
  sourceValue: string
  draft: string
}

export function createHttpProxyBypassRulesDraftState(
  httpProxyBypassRules: string | undefined
): HttpProxyBypassRulesDraftState {
  const sourceValue = httpProxyBypassRules ?? ''
  return {
    sourceValue,
    draft: sourceValue
  }
}

function resolveHttpProxyBypassRulesDraftState(
  state: HttpProxyBypassRulesDraftState,
  httpProxyBypassRules: string | undefined
): HttpProxyBypassRulesDraftState {
  const sourceValue = httpProxyBypassRules ?? ''
  return state.sourceValue === sourceValue
    ? state
    : createHttpProxyBypassRulesDraftState(httpProxyBypassRules)
}

export function updateHttpProxyBypassRulesDraftState(
  state: HttpProxyBypassRulesDraftState,
  httpProxyBypassRules: string | undefined,
  draft: string
): HttpProxyBypassRulesDraftState {
  return {
    ...resolveHttpProxyBypassRulesDraftState(state, httpProxyBypassRules),
    draft
  }
}

type OpenInApplicationsDraftState = {
  sourceApplications: OpenInApplication[] | undefined
  draft: OpenInApplication[]
}

function createOpenInApplicationsDraftState(
  openInApplications: OpenInApplication[] | undefined
): OpenInApplicationsDraftState {
  return {
    sourceApplications: openInApplications,
    draft: openInApplications ?? []
  }
}

function resolveOpenInApplicationsDraftState(
  state: OpenInApplicationsDraftState,
  openInApplications: OpenInApplication[] | undefined
): OpenInApplicationsDraftState {
  return state.sourceApplications === openInApplications
    ? state
    : createOpenInApplicationsDraftState(openInApplications)
}

type GeneralPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function GeneralPane({ settings, updateSettings }: GeneralPaneProps): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const updateStatus = useAppStore((s) => s.updateStatus)
  const mountedRef = useMountedRef()
  // Why: the 'error' variant of UpdateStatus does not carry a `version` field.
  // The main process emits `{ state: 'error' }` for both check failures (no
  // version known yet) and download/install failures (version was known from
  // the preceding 'available'/'downloading'/'downloaded' state). Cache the
  // last-known version so the error copy below can distinguish the two cases
  // without adding IPC. Mirrors `versionRef` in UpdateCard.tsx.
  const updateVersionRef = useRef<string | null>(null)
  if (
    (updateStatus.state === 'available' ||
      updateStatus.state === 'downloading' ||
      updateStatus.state === 'downloaded') &&
    updateStatus.version
  ) {
    updateVersionRef.current = updateStatus.version
  } else if (
    updateStatus.state === 'checking' ||
    updateStatus.state === 'idle' ||
    updateStatus.state === 'not-available'
  ) {
    // Why: a new check cycle has started or completed cleanly. Clear the
    // cached version so a subsequent check failure cannot be mis-classified
    // as a download failure based on a stale version from a prior cycle.
    updateVersionRef.current = null
  }
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [autoSaveDelayDraftState, setAutoSaveDelayDraftState] = useState(() =>
    createAutoSaveDelayDraftState(settings.editorAutoSaveDelayMs)
  )
  const [httpProxyUrlDraftState, setHttpProxyUrlDraftState] = useState(() =>
    createHttpProxyUrlDraftState(settings.httpProxyUrl)
  )
  const [httpProxyBypassRulesDraftState, setHttpProxyBypassRulesDraftState] = useState(() =>
    createHttpProxyBypassRulesDraftState(settings.httpProxyBypassRules)
  )
  const [openInApplicationsDraftState, setOpenInApplicationsDraftState] = useState(() =>
    createOpenInApplicationsDraftState(settings.openInApplications)
  )
  // Why: the star state is derived from gh, not from settings, so it does not
  // live in the global settings store. 'hidden' covers the gh-unavailable and
  // already-starred-on-a-previous-session cases so the section drops out for
  // users who can't or don't need to act.
  //
  // We start in 'loading' and render a placeholder at the exact same
  // dimensions as the resolved section. When gh resolves to 'hidden', the
  // placeholder collapses with a grid-rows transition so content above it
  // doesn't shift; anything below (nothing today, but future-proof) eases up.
  const [starState, setStarState] = useState<
    'loading' | 'not-starred' | 'starred' | 'starring' | 'hidden' | 'error'
  >('loading')

  useEffect(() => {
    let cancelled = false
    void window.api.updater.getVersion().then((version) => {
      if (!cancelled) {
        setAppVersion(version)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void window.api.gh.checkKorcaStarred().then((result) => {
      if (cancelled) {
        return
      }
      if (result === null) {
        setStarState('hidden')
      } else {
        setStarState(result ? 'starred' : 'not-starred')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleStarClick = async (): Promise<void> => {
    if (starState !== 'not-starred' && starState !== 'error') {
      return
    }
    setStarState('starring')
    const ok = await window.api.gh.starKorca('settings')
    if (!ok) {
      if (mountedRef.current) {
        setStarState('error')
      }
      return
    }
    if (mountedRef.current) {
      setStarState('starred')
    }
    // Why: clicking star anywhere should also permanently mute the
    // threshold-based nag so the user isn't re-prompted via the popup.
    await window.api.starNag.complete()
  }

  const resolvedAutoSaveDelayDraftState = resolveAutoSaveDelayDraftState(
    autoSaveDelayDraftState,
    settings.editorAutoSaveDelayMs
  )
  if (resolvedAutoSaveDelayDraftState !== autoSaveDelayDraftState) {
    // Why: Settings can be updated outside this pane; reconcile drafts before
    // paint so the visible input never lags behind the persisted value.
    setAutoSaveDelayDraftState(resolvedAutoSaveDelayDraftState)
  }
  const autoSaveDelayDraft = resolvedAutoSaveDelayDraftState.draft
  const updateAutoSaveDelayDraft = (draft: string): void => {
    setAutoSaveDelayDraftState((current) =>
      updateAutoSaveDelayDraftState(current, settings.editorAutoSaveDelayMs, draft)
    )
  }

  const resolvedOpenInApplicationsDraftState = resolveOpenInApplicationsDraftState(
    openInApplicationsDraftState,
    settings.openInApplications
  )
  if (resolvedOpenInApplicationsDraftState !== openInApplicationsDraftState) {
    // Why: the Open In rows are a local draft, but Settings can reload them
    // externally; sync before paint instead of after an Effect pass.
    setOpenInApplicationsDraftState(resolvedOpenInApplicationsDraftState)
  }
  const openInApplicationsDraft = resolvedOpenInApplicationsDraftState.draft
  const updateOpenInApplicationsDraft = (draft: OpenInApplication[]): void => {
    setOpenInApplicationsDraftState((current) => ({
      ...resolveOpenInApplicationsDraftState(current, settings.openInApplications),
      draft
    }))
  }

  const resolvedHttpProxyUrlDraftState = resolveHttpProxyUrlDraftState(
    httpProxyUrlDraftState,
    settings.httpProxyUrl
  )
  if (resolvedHttpProxyUrlDraftState !== httpProxyUrlDraftState) {
    // Why: Settings can change outside this pane; reconcile the proxy draft
    // before paint so stale network values do not briefly appear.
    setHttpProxyUrlDraftState(resolvedHttpProxyUrlDraftState)
  }
  const httpProxyUrlDraft = resolvedHttpProxyUrlDraftState.draft
  const httpProxyUrlError = resolvedHttpProxyUrlDraftState.error
  const updateHttpProxyUrlDraft = (draft: string): void => {
    setHttpProxyUrlDraftState((current) =>
      updateHttpProxyUrlDraftState(current, settings.httpProxyUrl, draft)
    )
  }

  const resolvedHttpProxyBypassRulesDraftState = resolveHttpProxyBypassRulesDraftState(
    httpProxyBypassRulesDraftState,
    settings.httpProxyBypassRules
  )
  if (resolvedHttpProxyBypassRulesDraftState !== httpProxyBypassRulesDraftState) {
    // Why: Proxy bypass rules are local input state, but settings reloads can
    // replace their source while this pane is mounted.
    setHttpProxyBypassRulesDraftState(resolvedHttpProxyBypassRulesDraftState)
  }
  const httpProxyBypassRulesDraft = resolvedHttpProxyBypassRulesDraftState.draft
  const updateHttpProxyBypassRulesDraft = (draft: string): void => {
    setHttpProxyBypassRulesDraftState((current) =>
      updateHttpProxyBypassRulesDraftState(current, settings.httpProxyBypassRules, draft)
    )
  }

  const commitOpenInApplications = (applications: OpenInApplication[]): void => {
    if (!shouldCommitOpenInApplicationsDraft(applications)) {
      return
    }
    updateSettings({ openInApplications: applications })
  }

  const applyOpenInApplicationsDraft = (applications: OpenInApplication[]): void => {
    updateOpenInApplicationsDraft(applications)
    commitOpenInApplications(applications)
  }

  const handleBrowseWorkspace = async () => {
    const path = await window.api.repos.pickFolder()
    if (path) {
      updateSettings({ workspaceDir: path })
    }
  }

  const commitAutoSaveDelay = (): void => {
    const trimmed = autoSaveDelayDraft.trim()
    if (trimmed === '') {
      setAutoSaveDelayDraftState(createAutoSaveDelayDraftState(settings.editorAutoSaveDelayMs))
      return
    }

    const value = Number(trimmed)
    if (!Number.isFinite(value)) {
      setAutoSaveDelayDraftState(createAutoSaveDelayDraftState(settings.editorAutoSaveDelayMs))
      return
    }

    const next = clampNumber(
      Math.round(value),
      MIN_EDITOR_AUTO_SAVE_DELAY_MS,
      MAX_EDITOR_AUTO_SAVE_DELAY_MS
    )
    updateSettings({ editorAutoSaveDelayMs: next })
    setAutoSaveDelayDraftState((current) =>
      updateAutoSaveDelayDraftState(current, settings.editorAutoSaveDelayMs, String(next))
    )
  }

  const commitHttpProxyUrl = (): void => {
    const normalized = normalizeProxyUrl(httpProxyUrlDraft)
    if (!normalized.ok) {
      setHttpProxyUrlDraftState((current) =>
        setHttpProxyUrlDraftErrorState(current, settings.httpProxyUrl, normalized.message)
      )
      return
    }
    setHttpProxyUrlDraftState((current) =>
      updateHttpProxyUrlDraftState(current, settings.httpProxyUrl, normalized.value)
    )
    if (normalized.value !== (settings.httpProxyUrl ?? '')) {
      updateSettings({ httpProxyUrl: normalized.value })
    }
  }

  const commitHttpProxyBypassRules = (): void => {
    const normalized = normalizeProxyBypassRules(httpProxyBypassRulesDraft)
    setHttpProxyBypassRulesDraftState((current) =>
      updateHttpProxyBypassRulesDraftState(current, settings.httpProxyBypassRules, normalized)
    )
    if (normalized !== (settings.httpProxyBypassRules ?? '')) {
      updateSettings({ httpProxyBypassRules: normalized })
    }
  }

  const handleRestartToUpdate = (): void => {
    // Why: quitAndInstall resolves immediately (the actual quit happens in a
    // deferred timer in the main process), so rejection here is only possible
    // if the IPC channel itself breaks. Log defensively; the user will notice
    // the app didn't restart and can retry.
    void window.api.updater.quitAndInstall().catch(console.error)
  }

  const visibleSections = [
    matchesSettingsSearch(searchQuery, GENERAL_NAVIGATION_SEARCH_ENTRIES) ? (
      <section key="navigation" className="space-y-4">
        <SettingsSubsectionHeader title="탐색" />
        <RecentTabOrderControl
          ctrlTabOrderMode={settings.ctrlTabOrderMode ?? 'mru'}
          keywords={GENERAL_NAVIGATION_SEARCH_ENTRIES.flatMap((entry) => [
            entry.title,
            entry.description ?? '',
            ...(entry.keywords ?? [])
          ])}
          updateSettings={updateSettings}
        />
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, GENERAL_WORKSPACE_SEARCH_ENTRIES) ? (
      <section key="workspace" className="space-y-4">
        <SettingsSubsectionHeader
          title="작업 공간"
          description="새 작업 공간이 만들어질 위치를 설정합니다."
        />

        <SearchableSetting
          title="작업 공간 디렉터리"
          description="작업 공간 폴더가 생성될 루트 디렉터리입니다."
          keywords={['workspace', 'folder', 'path', 'worktree']}
          className="space-y-2"
        >
          <Label>작업 공간 디렉터리</Label>
          <div className="flex gap-2">
            <Input
              value={settings.workspaceDir}
              onChange={(e) => updateSettings({ workspaceDir: e.target.value })}
              className="flex-1 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleBrowseWorkspace}
              className="shrink-0 gap-1.5"
            >
              <FolderOpen className="size-3.5" />
              찾아보기
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            작업 공간 폴더가 생성될 루트 디렉터리입니다.
          </p>
        </SearchableSetting>

        <SearchableSetting
          title="작업 공간 중첩"
          description="작업 공간을 저장소 이름의 하위 폴더 안에 만듭니다."
          keywords={['nested', 'subfolder', 'directory']}
        >
          <SettingsSwitchRow
            label="작업 공간 중첩"
            description="작업 공간을 저장소 이름의 하위 폴더 안에 만듭니다."
            checked={settings.nestWorkspaces}
            onChange={() => updateSettings({ nestWorkspaces: !settings.nestWorkspaces })}
          />
        </SearchableSetting>

        {/* Why: the "Don't ask again" toast in the delete-worktree dialog
            deep-links here, so the wrapper id must stay stable. Renaming it
            breaks that toast action even though this pane still renders fine. */}
        <div id="general-skip-delete-worktree-confirm" className="scroll-mt-6">
          <SearchableSetting
            title="작업 공간 삭제 전 확인"
            description="작업 공간을 삭제하기 전에 확인 대화상자를 표시합니다."
            keywords={['delete', 'worktree', 'confirm', 'dialog', 'skip', 'prompt']}
          >
            <SettingsSwitchRow
              label="작업 공간 삭제 전 확인"
              description="컨텍스트 메뉴에서 작업 공간을 삭제하기 전에 확인을 표시합니다. 삭제 실패 시에는 강제 삭제로 대체됩니다."
              checked={!settings.skipDeleteWorktreeConfirm}
              onChange={() =>
                updateSettings({
                  skipDeleteWorktreeConfirm: !settings.skipDeleteWorktreeConfirm
                })
              }
            />
          </SearchableSetting>
        </div>

        <div id="general-skip-delete-automation-confirm" className="scroll-mt-6">
          <SearchableSetting
            title="자동화 삭제 전 확인"
            description="자동화와 실행 기록을 삭제하기 전에 확인 대화상자를 표시합니다."
            keywords={['delete', 'automation', 'confirm', 'dialog', 'skip', 'prompt']}
          >
            <SettingsSwitchRow
              label="자동화 삭제 전 확인"
              description="자동화와 실행 기록을 삭제하기 전에 확인을 표시합니다."
              checked={!settings.skipDeleteAutomationConfirm}
              onChange={() =>
                updateSettings({
                  skipDeleteAutomationConfirm: !settings.skipDeleteAutomationConfirm
                })
              }
            />
          </SearchableSetting>
        </div>

        <SearchableSetting
          title="연결 앱 메뉴"
          description="작업 공간의 연결 앱 메뉴에 사용자 지정 실행기를 추가합니다."
          keywords={['open in', 'editor', 'launcher', 'cursor', 'zed', 'command', 'vscode']}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label>연결 앱 메뉴</Label>
            <p className="text-xs text-muted-foreground">
              VS Code는 항상 첫 항목으로 포함됩니다. 실행 파일을 추가하면 각 작업 공간의
              연결 앱 메뉴에 추가 항목이 표시됩니다.
            </p>
            <p className="text-xs text-muted-foreground">
              명령은 셸 파싱되지 않습니다. 실행 파일 이름만 사용하세요. 플래그가 필요하면
              래퍼 스크립트를 사용하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                applyOpenInApplicationsDraft([
                  ...openInApplicationsDraft,
                  createPresetOpenInApplication('Cursor', 'cursor')
                ])
              }
            >
              Cursor 추가
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                applyOpenInApplicationsDraft([
                  ...openInApplicationsDraft,
                  createPresetOpenInApplication('Zed', 'zed')
                ])
              }
            >
              Zed 추가
            </Button>
          </div>
          <div className="space-y-2">
            {openInApplicationsDraft.map((app, index) => (
              <div key={app.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={app.label}
                  placeholder="레이블"
                  onChange={(event) => {
                    const next = [...openInApplicationsDraft]
                    next[index] = { ...app, label: event.target.value }
                    updateOpenInApplicationsDraft(next)
                  }}
                  onBlur={() => commitOpenInApplications(openInApplicationsDraft)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      commitOpenInApplications(openInApplicationsDraft)
                    }
                  }}
                />
                  <Input
                    value={app.command}
                  placeholder="실행 명령"
                  onChange={(event) => {
                    const next = [...openInApplicationsDraft]
                    next[index] = { ...app, command: event.target.value }
                    updateOpenInApplicationsDraft(next)
                  }}
                  onBlur={() => commitOpenInApplications(openInApplicationsDraft)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      commitOpenInApplications(openInApplicationsDraft)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = openInApplicationsDraft.filter((entry) => entry.id !== app.id)
                    updateOpenInApplicationsDraft(next)
                    commitOpenInApplications(next)
                  }}
                >
                  제거
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateOpenInApplicationsDraft([...openInApplicationsDraft, createOpenInApplication()])
            }
            disabled={openInApplicationsDraft.length >= OPEN_IN_APPLICATIONS_MAX}
          >
            사용자 지정 실행기 추가
          </Button>
        </SearchableSetting>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, GENERAL_NETWORK_SEARCH_ENTRIES) ? (
      <section key="network" className="space-y-4">
        <SettingsSubsectionHeader
          title="네트워크"
          description="앱 수준 네트워크 라우팅을 설정합니다."
        />

        <SearchableSetting
          title="HTTP 프록시"
          description="Korca 네트워크 요청과 로컬 터미널 하위 프로세스에 사용할 프록시 URL입니다."
          keywords={['proxy', 'http_proxy', 'https_proxy', 'network', 'dock', 'launchpad']}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="settings-http-proxy-url">HTTP 프록시</Label>
            <p className="text-xs text-muted-foreground">
              비워 두면 시스템 프록시 설정과 상속된 프록시 환경 변수를 사용합니다.
            </p>
          </div>
          <Input
            id="settings-http-proxy-url"
            value={httpProxyUrlDraft}
            onChange={(e) => {
              updateHttpProxyUrlDraft(e.target.value)
            }}
            onBlur={commitHttpProxyUrl}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            placeholder="http://proxy.example.com:8080"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={httpProxyUrlError ? true : undefined}
            className="font-mono text-xs"
          />
          {httpProxyUrlError ? (
            <p className="text-xs text-destructive">{httpProxyUrlError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              http, https, socks, socks4, socks5 URL을 지원합니다.
            </p>
          )}
        </SearchableSetting>

        <SearchableSetting
          title="프록시 우회 규칙"
          description="설정된 HTTP 프록시를 우회할 호스트입니다."
          keywords={['proxy', 'bypass', 'no_proxy', 'localhost', 'network']}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="settings-http-proxy-bypass-rules">프록시 우회 규칙</Label>
            <p className="text-xs text-muted-foreground">
              선택 사항. 호스트를 쉼표, 세미콜론 또는 줄바꿈으로 구분하세요.
            </p>
          </div>
          <Input
            id="settings-http-proxy-bypass-rules"
            value={httpProxyBypassRulesDraft}
            onChange={(e) => updateHttpProxyBypassRulesDraft(e.target.value)}
            onBlur={commitHttpProxyBypassRules}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            placeholder="localhost, 127.0.0.1, *.internal"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </SearchableSetting>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, GENERAL_EDITOR_SEARCH_ENTRIES) ? (
      <section key="editor" className="space-y-4">
        <SettingsSubsectionHeader
          title="편집기"
          description="Korca가 파일 편집 내용을 저장하는 방식을 설정합니다."
        />

        <SearchableSetting
          title="파일 자동 저장"
          description="짧은 대기 후 편집기와 수정 가능한 diff 변경 내용을 자동 저장합니다."
          keywords={['autosave', 'save']}
        >
          <SettingsSwitchRow
            label="파일 자동 저장"
            description="짧은 대기 후 편집기와 수정 가능한 diff 변경 내용을 자동 저장합니다."
            checked={settings.editorAutoSave}
            onChange={() => updateSettings({ editorAutoSave: !settings.editorAutoSave })}
          />
        </SearchableSetting>

        <SearchableSetting
          title="자동 저장 지연"
          description="마지막 편집 후 자동 저장까지 Korca가 기다리는 시간입니다."
          keywords={['autosave', 'delay', 'milliseconds']}
          className="flex items-center justify-between gap-4 py-2"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <Label>자동 저장 지연</Label>
            <p className="text-xs text-muted-foreground">
              마지막 편집 후 자동 저장까지 Korca가 기다리는 시간입니다. 첫 실행 기본값은{' '}
              {DEFAULT_EDITOR_AUTO_SAVE_DELAY_MS}ms입니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Input
              type="number"
              min={MIN_EDITOR_AUTO_SAVE_DELAY_MS}
              max={MAX_EDITOR_AUTO_SAVE_DELAY_MS}
              step={250}
              value={autoSaveDelayDraft}
              onChange={(e) => updateAutoSaveDelayDraft(e.target.value)}
              onBlur={commitAutoSaveDelay}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitAutoSaveDelay()
                }
              }}
              className="number-input-clean w-28 text-right tabular-nums"
            />
            <span className="text-xs text-muted-foreground">ms</span>
          </div>
        </SearchableSetting>

        <SearchableSetting
          title="기본 diff 보기"
          description="git diff를 기본으로 표시할 때 선호하는 형식입니다."
          keywords={['diff', 'view', 'inline', 'side-by-side', 'split']}
          className="flex items-center justify-between gap-4 py-2"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <Label>기본 diff 보기</Label>
            <p className="text-xs text-muted-foreground">
              git diff를 기본으로 표시할 때 선호하는 형식입니다.
            </p>
          </div>
          <SettingsSegmentedControl
            ariaLabel="기본 diff 보기"
            value={settings.diffDefaultView}
            onChange={(option) => updateSettings({ diffDefaultView: option })}
            options={[
              { value: 'inline', label: '인라인' },
              { value: 'side-by-side', label: '좌우 비교' }
            ]}
          />
        </SearchableSetting>

        <SearchableSetting
          title="기본 diff 파일 트리"
          description="통합 diff 보기를 열 때 파일 트리를 표시하거나 숨깁니다."
          keywords={['diff', 'tree', 'file tree', 'combined diff', 'sidebar']}
          className="flex items-center justify-between gap-4 py-2"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <Label>기본 diff 파일 트리</Label>
            <p className="text-xs text-muted-foreground">
              통합 diff 보기를 열 때 파일 트리를 표시하거나 숨깁니다.
            </p>
          </div>
          <SettingsSegmentedControl
            ariaLabel="기본 diff 파일 트리"
            value={settings.combinedDiffFileTreeVisibleByDefault ? 'shown' : 'hidden'}
            onChange={(option) =>
              updateSettings({ combinedDiffFileTreeVisibleByDefault: option === 'shown' })
            }
            options={[
              { value: 'shown', label: '표시' },
              { value: 'hidden', label: '숨김' }
            ]}
          />
        </SearchableSetting>

        <SearchableSetting
          title="미니맵"
          description="파일을 편집할 때 미니맵 개요를 표시합니다."
          keywords={['minimap', 'overview', 'code', 'scroll']}
        >
          <SettingsSwitchRow
            label="미니맵"
            description="파일을 편집할 때 미니맵 개요를 표시합니다."
            checked={settings.editorMinimapEnabled}
            onChange={() =>
              updateSettings({ editorMinimapEnabled: !settings.editorMinimapEnabled })
            }
          />
        </SearchableSetting>

        <SearchableSetting
          title="Markdown 검토 노트"
          description="리치 편집기 모드에서 로컬 markdown 검토 노트 컨트롤을 표시합니다."
          keywords={['markdown', 'review', 'notes', 'annotations', 'agents']}
        >
          <SettingsSwitchRow
            label="Markdown 검토 노트"
            description="리치 편집기 모드와 에이전트 전달 작업에서 로컬 markdown 노트 컨트롤을 표시합니다."
            checked={settings.markdownReviewToolsEnabled}
            onChange={() =>
              updateSettings({ markdownReviewToolsEnabled: !settings.markdownReviewToolsEnabled })
            }
          />
        </SearchableSetting>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, GENERAL_CLI_SEARCH_ENTRIES) ? (
      <CliSection
        key="cli"
        currentPlatform={getDesktopPlatformFromUserAgent(navigator.userAgent)}
      />
    ) : null,
    matchesSettingsSearch(searchQuery, GENERAL_CACHE_TIMER_SEARCH_ENTRIES) ? (
      <section key="cache-timer" className="space-y-4">
        <SettingsSubsectionHeader
          title="프롬프트 캐시 타이머"
          description="Claude는 대화를 캐시해 비용을 줄입니다. 너무 오래 유휴 상태면 캐시가 만료되고 다음 메시지는 더 큰 비용으로 전체 컨텍스트를 다시 보냅니다. 이 항목은 다시 시작할 시점을 알려주기 위해 카운트다운을 표시합니다."
        />

        <SearchableSetting
          title="캐시 타이머"
          description="Claude 에이전트가 유휴 상태가 되면 카운트다운을 표시합니다."
          keywords={GENERAL_CACHE_TIMER_SEARCH_ENTRIES.flatMap((entry) => [
            entry.title,
            entry.description ?? '',
            ...(entry.keywords ?? [])
          ])}
          className="flex items-center justify-between gap-4 py-2"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-muted-foreground" />
              <Label>캐시 타이머</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Claude 에이전트가 유휴 상태가 되면 사이드바에 카운트다운을 표시합니다.
            </p>
          </div>
          <SettingsSwitch
            ariaLabel="캐시 타이머"
            checked={settings.promptCacheTimerEnabled}
            onChange={() => {
              const enabling = !settings.promptCacheTimerEnabled
              updateSettings({ promptCacheTimerEnabled: enabling })
              if (enabling) {
                useAppStore.getState().seedCacheTimersForIdleTabs()
              }
            }}
          />
        </SearchableSetting>

        {settings.promptCacheTimerEnabled && (
          <SearchableSetting
            title="타이머 길이"
            description="제공자의 캐시 TTL에 맞추세요."
            keywords={['cache', 'timer', 'duration', 'ttl']}
            className="flex items-center justify-between gap-4 py-2 pl-7"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label>타이머 길이</Label>
            <p className="text-xs text-muted-foreground">
                제공자의 캐시 TTL에 맞추세요. 기본값은 5분입니다.
              </p>
            </div>
            <Select
              value={String(settings.promptCacheTtlMs)}
              onValueChange={(v) => updateSettings({ promptCacheTtlMs: Number(v) })}
            >
              <SelectTrigger size="sm" className="h-7 text-xs w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300000">5분</SelectItem>
                <SelectItem value="3600000">1시간</SelectItem>
              </SelectContent>
            </Select>
          </SearchableSetting>
        )}
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, GENERAL_UPDATE_SEARCH_ENTRIES) ? (
      <section key="updates" className="space-y-4">
        <SettingsSubsectionHeader
          title="업데이트"
          description={`현재 버전: ${appVersion ?? '…'}`}
        />

        <SearchableSetting
          title="업데이트 확인"
          description="앱 업데이트를 확인하고 더 새로운 Korca 버전을 설치합니다."
          keywords={['update', 'version', 'release notes', 'download']}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              // Why: Shift-click opts this check into the release-candidate
              // channel. Keep the affordance hidden — it's a power-user
              // shortcut, not a discoverable toggle.
              onClick={(event) =>
                window.api.updater.check({
                  includePrerelease: event.shiftKey
                })
              }
              disabled={updateStatus.state === 'checking' || updateStatus.state === 'downloading'}
              className="gap-2"
            >
              {updateStatus.state === 'checking' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              업데이트 확인
            </Button>

            {updateStatus.state === 'available' ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  void window.api.updater.download().catch((error) => {
                    toast.error('업데이트 다운로드를 시작하지 못했습니다.', {
                      description: String((error as Error)?.message ?? error)
                    })
                  })
                }}
                className="gap-2"
              >
                <Download className="size-3.5" />
                업데이트 설치 ({updateStatus.version})
              </Button>
            ) : updateStatus.state === 'downloaded' ? (
              <Button variant="default" size="sm" onClick={handleRestartToUpdate} className="gap-2">
                <Download className="size-3.5" />
                업데이트 적용을 위해 다시 시작 ({updateStatus.version})
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {updateStatus.state === 'idle' && '업데이트는 실행 시 자동으로 확인됩니다.'}
            {updateStatus.state === 'checking' && '업데이트를 확인하는 중...'}
            {updateStatus.state === 'available' && (
              <>
                버전 {updateStatus.version}을 사용할 수 있습니다. &quot;업데이트 설치&quot;를
                클릭해 다운로드하고 설치하세요.{' '}
                <a
                  href={
                    updateStatus.releaseUrl ??
                    `https://github.com/stablyai/korca/releases/tag/v${updateStatus.version}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  릴리스 노트
                </a>
              </>
            )}
            {updateStatus.state === 'not-available' && '이미 최신 버전입니다.'}
            {updateStatus.state === 'downloading' &&
              `v${updateStatus.version} 다운로드 중... ${updateStatus.percent}%`}
            {updateStatus.state === 'downloaded' && (
              <>
                버전 {updateStatus.version}을 설치할 준비가 되었습니다.{' '}
                <a
                  href={
                    updateStatus.releaseUrl ??
                    `https://github.com/stablyai/korca/releases/tag/v${updateStatus.version}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  릴리스 노트
                </a>
              </>
            )}
            {updateStatus.state === 'error' &&
              // Why: `{ state: 'error' }` is emitted for both check-time
              // failures (no version cached) and download/install failures
              // (version cached from a prior 'available'/'downloading'/
              // 'downloaded' state). Label accordingly so a download failure
              // isn't mislabeled as a "check" failure. Mirrors UpdateCard.tsx.
              (updateVersionRef.current
                ? `업데이트 오류. ${updateStatus.message}`
                : `업데이트 확인 실패. ${updateStatus.message}`)}
          </p>
        </SearchableSetting>
      </section>
    ) : null
    // Note: the Support section is rendered outside this array so it can own
    // its own loading placeholder and its own collapsing Separator. Without
    // that separation, a dangling divider would remain above the collapsed
    // section.
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      {visibleSections.map((section, index) => (
        <div key={index} className="space-y-6">
          {index > 0 ? <Separator /> : null}
          {section}
        </div>
      ))}
      {matchesSettingsSearch(searchQuery, GENERAL_SUPPORT_SEARCH_ENTRIES) ? (
        <SupportSection
          state={starState}
          hasPrecedingSections={visibleSections.length > 0}
          onStarClick={handleStarClick}
        />
      ) : null}
    </div>
  )
}

type SupportSectionProps = {
  state: 'loading' | 'not-starred' | 'starring' | 'starred' | 'hidden' | 'error'
  hasPrecedingSections: boolean
  onStarClick: () => void | Promise<void>
}

function SupportSection({
  state,
  hasPrecedingSections,
  onStarClick
}: SupportSectionProps): React.JSX.Element {
  // Why: 'hidden' means gh is unavailable or the user had already starred on a
  // previous session — in both cases we collapse the entire section (including
  // its leading Separator) so the settings pane doesn't carry an empty strip.
  // For every other state we render the full row so the initial layout is
  // stable: the skeleton-to-live swap happens in place and a post-click
  // "Starred" confirmation does not shift anything above or below it.
  const collapsed = state === 'hidden'

  return (
    <section
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
      }`}
      aria-hidden={collapsed}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="space-y-8">
          {hasPrecedingSections ? <Separator /> : null}
          <div className="space-y-4">
            <SettingsSubsectionHeader title="Korca 지원" />
            {state === 'loading' ? <SupportRowSkeleton /> : null}
            {state !== 'loading' && state !== 'hidden' ? (
              <SupportRow state={state} onStarClick={onStarClick} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function SupportRowSkeleton(): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2" aria-hidden="true">
      <div className="h-4 w-36 rounded bg-muted/50 animate-pulse" />
      <div className="h-8 w-24 rounded-md bg-muted/50 animate-pulse" />
    </div>
  )
}

function SupportRow({
  state,
  onStarClick
}: {
  state: 'not-starred' | 'starring' | 'starred' | 'error'
  onStarClick: () => void | Promise<void>
}): React.JSX.Element {
  // Why: the left-hand label is the setting's identity and must not change
  // when the user clicks — the row should still read "Star Korca on GitHub"
  // afterwards. The right-hand control is what changes: before starring it
  // is a button; after a successful star we swap in a small inline "Thanks"
  // confirmation so the row keeps the same shape without showing a stale,
  // disabled button.
  return (
    <SearchableSetting
      title="GitHub에서 Korca 별점 주기"
      description="gh CLI를 통해 GitHub 별점으로 프로젝트를 지원합니다."
      keywords={['star', 'github', 'support', 'feedback', 'like']}
      className="flex items-center justify-between gap-4 py-2"
    >
      <Label>GitHub에서 Korca 별점 주기</Label>
      {state === 'starred' ? (
        <SupportRowThanks />
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => void onStarClick()}
          disabled={state === 'starring'}
          className="shrink-0 gap-1.5"
        >
          {state === 'starring' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Star className="size-3.5" />
          )}
          {state === 'starring' ? '별점 주는 중…' : state === 'error' ? '다시 시도' : '별점 주기'}
        </Button>
      )}
    </SearchableSetting>
  )
}

function SupportRowThanks(): React.JSX.Element {
  // Why: match the size="sm" button's h-8 / gap-1.5 / px-3 dimensions so the
  // row height stays identical when the button is swapped out. Without the
  // fixed height, the text baseline collapses ~6px and the entire row
  // shrinks, shifting everything below.
  return (
    <div
      className="shrink-0 inline-flex h-8 items-center gap-1.5 px-3 text-sm font-medium
        text-amber-400/90 animate-in fade-in slide-in-from-right-1 duration-300"
      role="status"
      aria-live="polite"
    >
      <Star className="size-3.5 fill-amber-400/80 text-amber-400/80" aria-hidden="true" />
      지원해 주셔서 감사합니다!
    </div>
  )
}
