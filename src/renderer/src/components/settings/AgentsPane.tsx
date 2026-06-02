/* eslint-disable max-lines -- Why: the Agents pane keeps catalog rows, default
   selection, per-agent controls, and runtime location together so settings
   reconciliation stays visible in one file. */
import { useMemo, useState } from 'react'
import { Check, ChevronDown, ExternalLink, RefreshCw, Terminal } from 'lucide-react'
import type { GlobalSettings, TuiAgent } from '../../../../shared/types'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import { useDetectedAgents } from '@/hooks/useDetectedAgents'
import { useAppStore } from '@/store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'
import { AgentAwakeSetting } from './AgentAwakeSetting'
import {
  AGENT_GENERATED_TAB_TITLES_DESCRIPTION,
  AGENT_GENERATED_TAB_TITLES_TITLE
} from './agent-generated-tab-title-copy'
import { AgentLocationSetting } from './AgentLocationSetting'
import { AGENT_STATUS_HOOKS_DESCRIPTION, AGENT_STATUS_HOOKS_TITLE } from './agent-status-hooks-copy'
import {
  SettingsBadge,
  SettingsSegmentedControl,
  SettingsSubsectionHeader,
  SettingsSwitchRow
} from './SettingsFormControls'
import {
  isTuiAgentEnabled,
  normalizeDisabledTuiAgents
} from '../../../../shared/tui-agent-selection'

export { AGENTS_PANE_SEARCH_ENTRIES } from './agents-search'

type AgentsPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  wslSupportedPlatform?: boolean
  wslAvailable?: boolean
  wslDistros?: string[]
  wslCapabilitiesLoading?: boolean
}

type AgentAvailabilityUpdateQueueOptions = {
  getSettings: () => GlobalSettings | null | undefined
  fallbackSettings: GlobalSettings
  updateSettings: AgentsPaneProps['updateSettings']
  agentId: TuiAgent
  enabled: boolean
}

type AgentRowProps = {
  agentId: TuiAgent
  label: string
  homepageUrl: string
  defaultCmd: string
  isDetected: boolean
  isEnabled: boolean
  isDefault: boolean
  cmdOverride: string | undefined
  onSetDefault: () => void
  onSetEnabled: (enabled: boolean) => void
  onSaveOverride: (value: string) => void
}

type AgentCommandOverrideInputProps = {
  defaultCmd: string
  cmdOverride: string | undefined
  onSaveOverride: (value: string) => void
}

type AgentAvailability = 'enabled' | 'disabled'

type AgentAvailabilityControlProps = {
  label: string
  isEnabled: boolean
  onSetEnabled: (enabled: boolean) => void
}

export function buildAgentAvailabilitySettingsUpdate(
  settings: Pick<GlobalSettings, 'defaultTuiAgent' | 'disabledTuiAgents'>,
  id: TuiAgent,
  enabled: boolean
): Pick<GlobalSettings, 'disabledTuiAgents'> & Partial<Pick<GlobalSettings, 'defaultTuiAgent'>> {
  const latestDisabled = normalizeDisabledTuiAgents(settings.disabledTuiAgents)
  const nextDisabled = enabled
    ? latestDisabled.filter((agent) => agent !== id)
    : latestDisabled.includes(id)
      ? latestDisabled
      : [...latestDisabled, id]

  return {
    disabledTuiAgents: nextDisabled,
    ...(settings.defaultTuiAgent === id && !enabled ? { defaultTuiAgent: null } : {})
  }
}

export function createAgentAvailabilityUpdateQueue(): (
  options: AgentAvailabilityUpdateQueueOptions
) => Promise<void> {
  let pendingUpdate: Promise<unknown> = Promise.resolve()

  return ({ getSettings, fallbackSettings, updateSettings, agentId, enabled }) => {
    // Why: serialize full-array replacements so each write sees the store after
    // the previous IPC has reconciled, while preserving the user's requested state.
    pendingUpdate = pendingUpdate
      .catch(() => {})
      .then(() =>
        updateSettings(
          buildAgentAvailabilitySettingsUpdate(getSettings() ?? fallbackSettings, agentId, enabled)
        )
      )
    return pendingUpdate.then(() => undefined)
  }
}

const enqueueAgentAvailabilityUpdate = createAgentAvailabilityUpdateQueue()

export function AgentAvailabilityControl({
  label,
  isEnabled,
  onSetEnabled
}: AgentAvailabilityControlProps): React.JSX.Element {
  const value: AgentAvailability = isEnabled ? 'enabled' : 'disabled'

  return (
    <SettingsSegmentedControl<AgentAvailability>
      value={value}
      onChange={(next) => {
        if (next !== value) {
          onSetEnabled(next === 'enabled')
        }
      }}
      ariaLabel={`${label} availability`}
      size="sm"
      options={[
        { value: 'enabled', label: 'Enabled' },
        { value: 'disabled', label: '사용 안 함' }
      ]}
    />
  )
}

function AgentCommandOverrideInput({
  defaultCmd,
  cmdOverride,
  onSaveOverride
}: AgentCommandOverrideInputProps): React.JSX.Element {
  const draftSeed = cmdOverride ?? defaultCmd
  const [cmdDraft, setCmdDraft] = useState(draftSeed)

  const commitCmd = (): void => {
    const trimmed = cmdDraft.trim()
    if (!trimmed || trimmed === defaultCmd) {
      onSaveOverride('')
      setCmdDraft(defaultCmd)
    } else {
      onSaveOverride(trimmed)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">명령</span>
      <Input
        value={cmdDraft}
        onChange={(e) => setCmdDraft(e.target.value)}
        onBlur={commitCmd}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitCmd()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setCmdDraft(draftSeed)
            e.currentTarget.blur()
          }
        }}
        placeholder={defaultCmd}
        spellCheck={false}
        className="h-7 flex-1 font-mono text-xs"
      />
      {cmdOverride && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            onSaveOverride('')
            setCmdDraft(defaultCmd)
          }}
          className="h-7 shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          초기화
        </Button>
      )}
    </div>
  )
}

function AgentRow({
  agentId,
  label,
  homepageUrl,
  defaultCmd,
  isDetected,
  isEnabled,
  isDefault,
  cmdOverride,
  onSetDefault,
  onSetEnabled,
  onSaveOverride
}: AgentRowProps): React.JSX.Element {
  const [cmdOpen, setCmdOpen] = useState(Boolean(cmdOverride))
  const availabilityDescription = isEnabled
    ? isDetected
      ? '실행 및 기본 선택에 표시됩니다.'
      : '실행 및 기본 선택에서 사용하려면 설치하세요.'
    : isDetected
      ? '실행 및 기본 선택에서 숨김.'
      : '설치되면 실행 및 기본 선택에서 숨깁니다.'

  return (
    <div className={cn('py-3', !isDetected && 'opacity-70')}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/50">
          <AgentIcon agent={agentId} size={16} />
        </div>

        <div className="min-w-0 flex-1 sm:min-w-[12rem]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium leading-none">{label}</span>
            {isDetected ? (
              <SettingsBadge tone="accent">감지됨</SettingsBadge>
            ) : (
              <SettingsBadge tone="muted">미설치</SettingsBadge>
            )}
            {!isEnabled && <SettingsBadge tone="muted">비활성</SettingsBadge>}
          </div>
          <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {cmdOverride ? (
              <span>
                <span className="text-muted-foreground/60 line-through">{defaultCmd}</span>
                <span className="ml-1.5 text-foreground/80">{cmdOverride}</span>
              </span>
            ) : (
              defaultCmd
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{availabilityDescription}</div>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <AgentAvailabilityControl
            label={label}
            isEnabled={isEnabled}
            onSetEnabled={onSetEnabled}
          />

          {isDetected && isEnabled && (
            <Button
              type="button"
              variant={isDefault ? 'secondary' : 'ghost'}
              size="xs"
              onClick={onSetDefault}
              title={isDefault ? '기본 에이전트' : '기본으로 설정'}
              className="h-7 gap-1 text-xs"
            >
              {isDefault && <Check className="size-3" />}
              {isDefault ? '기본' : '기본으로 설정'}
            </Button>
          )}

          {isDetected && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setCmdOpen((prev) => !prev)}
              title="명령 사용자 지정"
              aria-expanded={cmdOpen}
              className={cn(
                'size-7 text-muted-foreground hover:text-foreground',
                (cmdOpen || cmdOverride) && 'text-foreground'
              )}
            >
              <Terminal className="size-3.5" />
            </Button>
          )}

          <a
            href={homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={isDetected ? '문서' : '설치'}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>

          {isDetected && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setCmdOpen((prev) => !prev)}
              aria-label={cmdOpen ? '명령 재정의 접기' : '명령 재정의 펼치기'}
              className="size-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={cn('size-3.5 transition-transform', cmdOpen && 'rotate-180')}
              />
            </Button>
          )}
        </div>
      </div>

      {isDetected && cmdOpen && (
        <div className="mt-3 pl-10">
          {/* Why: key by the persisted seed so settings changes reset the draft during reconciliation, not in a follow-up effect commit. */}
          <AgentCommandOverrideInput
            key={cmdOverride ?? defaultCmd}
            defaultCmd={defaultCmd}
            cmdOverride={cmdOverride}
            onSaveOverride={onSaveOverride}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            이 에이전트를 실행할 때 사용할 바이너리 경로나 이름을 바꿉니다.
          </p>
        </div>
      )}
    </div>
  )
}

type DefaultAgentPillProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function DefaultAgentPill({ active, onClick, children }: DefaultAgentPillProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'border-muted-foreground/40 bg-accent font-medium text-accent-foreground'
          : 'border-border bg-background/50 text-muted-foreground hover:border-muted-foreground/35 hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function AgentsPane({
  settings,
  updateSettings,
  wslSupportedPlatform = false,
  wslAvailable = false,
  wslDistros = [],
  wslCapabilitiesLoading = false
}: AgentsPaneProps): React.JSX.Element {
  const { detectedIds: detectedList, isRefreshing, refresh } = useDetectedAgents()
  // Why: refresh re-spawns the user's login shell to re-capture PATH
  // (preflight:refreshAgents on the main side). This handles the
  // "installed a new CLI, Korca doesn't see it yet" case without a restart.
  const handleRefresh = (): void => {
    void refresh()
  }
  const detectedIds = useMemo<Set<string> | null>(
    () => (detectedList ? new Set(detectedList) : null),
    [detectedList]
  )

  const defaultAgent = settings.defaultTuiAgent
  const cmdOverrides = settings.agentCmdOverrides ?? {}
  const disabledAgents = normalizeDisabledTuiAgents(settings.disabledTuiAgents)

  const setDefault = (id: TuiAgent | 'blank' | null): void => {
    updateSettings({ defaultTuiAgent: id })
  }

  const setAgentEnabled = (id: TuiAgent, enabled: boolean): void => {
    void enqueueAgentAvailabilityUpdate({
      getSettings: () => useAppStore.getState().settings,
      fallbackSettings: settings,
      updateSettings,
      agentId: id,
      enabled
    })
  }

  const saveOverride = (id: TuiAgent, value: string): void => {
    const next = { ...cmdOverrides }
    if (value) {
      next[id] = value
    } else {
      delete next[id]
    }
    updateSettings({ agentCmdOverrides: next })
  }

  // Why: null means detection is in flight, not "all agents are installed".
  // Showing the full catalog here makes the default-agent picker flash invalid
  // options while switching between Windows and WSL detection contexts.
  const detectedAgents =
    detectedIds === null ? [] : AGENT_CATALOG.filter((agent) => detectedIds.has(agent.id))
  const enabledDetectedAgents = detectedAgents.filter((agent) =>
    isTuiAgentEnabled(agent.id, disabledAgents)
  )
  const undetectedAgents = AGENT_CATALOG.filter(
    (a) => detectedIds !== null && !detectedIds.has(a.id)
  )

  // Why: 'blank' is an explicit no-agent preference, not an auto fallback,
  // so the Auto pill should only light up when the default is null OR when a
  // selected agent id is no longer detected on PATH.
  const isAutoDefault =
    defaultAgent === null ||
    (defaultAgent !== 'blank' &&
      (!detectedIds?.has(defaultAgent) || !isTuiAgentEnabled(defaultAgent, disabledAgents)))
  const isBlankDefault = defaultAgent === 'blank'

  return (
    <div className="space-y-8">
      <AgentLocationSetting
        settings={settings}
        updateSettings={updateSettings}
        refresh={refresh}
        wslSupportedPlatform={wslSupportedPlatform}
        wslAvailable={wslAvailable}
        wslDistros={wslDistros}
        wslCapabilitiesLoading={wslCapabilitiesLoading}
      />

      <section className="space-y-4">
        <SettingsSubsectionHeader
          title="기본 에이전트"
          description="새 작업 공간을 열 때 미리 선택되는 에이전트입니다."
        />

        <div className="flex flex-wrap gap-2">
          <DefaultAgentPill active={isAutoDefault} onClick={() => setDefault(null)}>
            {isAutoDefault && <Check className="size-3.5" />}
            자동
          </DefaultAgentPill>

          {/* Why: users who prefer to open a raw shell by default need a
              first-class "no agent" choice here — without it, the Auto pill
              is the closest option but silently launches the first detected
              agent, which is the opposite of what they want. */}
          <DefaultAgentPill active={isBlankDefault} onClick={() => setDefault('blank')}>
            <Terminal className="size-3.5" />
            에이전트 없음(빈 터미널)
            {isBlankDefault && <Check className="size-3.5" />}
          </DefaultAgentPill>

          {enabledDetectedAgents.map((agent) => {
            const isActive = defaultAgent === agent.id
            return (
              <DefaultAgentPill
                key={agent.id}
                active={isActive}
                onClick={() => setDefault(agent.id)}
              >
                <AgentIcon agent={agent.id} size={14} />
                {agent.label}
                {isActive && <Check className="size-3.5" />}
              </DefaultAgentPill>
            )
          })}
        </div>
      </section>

      <AgentStatusHooksSetting settings={settings} updateSettings={updateSettings} />

      <AgentGeneratedTabTitlesSetting settings={settings} updateSettings={updateSettings} />

      <AgentAwakeSetting settings={settings} updateSettings={updateSettings} />

      {detectedAgents.length > 0 && (
        <section className="space-y-3">
          <SettingsSubsectionHeader
            title={
              <span className="flex items-center gap-2">
                설치됨
                <SettingsBadge tone="accent">{detectedAgents.length}개 감지됨</SettingsBadge>
              </span>
            }
            action={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="셸 PATH를 다시 읽어 설치된 에이전트를 재감지합니다"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn('size-3', isRefreshing && 'animate-spin')} />
                {isRefreshing ? '새로고침 중…' : '새로고침'}
              </Button>
            }
          />

          <div className="divide-y divide-border/40">
            {detectedAgents.map((agent) => (
              <AgentRow
                key={agent.id}
                agentId={agent.id}
                label={agent.label}
                homepageUrl={agent.homepageUrl}
                defaultCmd={agent.cmd}
                isDetected
                isEnabled={isTuiAgentEnabled(agent.id, disabledAgents)}
                isDefault={defaultAgent === agent.id}
                cmdOverride={cmdOverrides[agent.id]}
                onSetDefault={() => setDefault(agent.id)}
                onSetEnabled={(enabled) => setAgentEnabled(agent.id, enabled)}
                onSaveOverride={(v) => saveOverride(agent.id, v)}
              />
            ))}
          </div>
        </section>
      )}

      {undetectedAgents.length > 0 && (
        <section className="space-y-3">
          <SettingsSubsectionHeader
            title={
              <span className="flex items-center gap-2 text-muted-foreground">
                설치 가능
                <SettingsBadge tone="muted">{undetectedAgents.length}개 에이전트</SettingsBadge>
              </span>
            }
          />

          <div className="divide-y divide-border/40">
            {undetectedAgents.map((agent) => (
              <AgentRow
                key={agent.id}
                agentId={agent.id}
                label={agent.label}
                homepageUrl={agent.homepageUrl}
                defaultCmd={agent.cmd}
                isDetected={false}
                isEnabled={isTuiAgentEnabled(agent.id, disabledAgents)}
                isDefault={false}
                cmdOverride={undefined}
                onSetDefault={() => {}}
                onSetEnabled={(enabled) => setAgentEnabled(agent.id, enabled)}
                onSaveOverride={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {detectedIds === null && (
        <div className="flex items-center justify-center rounded-md border border-dashed border-border/50 py-6 text-sm text-muted-foreground">
          Detecting installed agents…
        </div>
      )}
    </div>
  )
}

export function AgentStatusHooksSetting({
  settings,
  updateSettings
}: AgentsPaneProps): React.JSX.Element {
  const enabled = settings.agentStatusHooksEnabled !== false
  return (
    <section className="space-y-3">
      <SettingsSwitchRow
        label={AGENT_STATUS_HOOKS_TITLE}
        description={AGENT_STATUS_HOOKS_DESCRIPTION}
        checked={enabled}
        onChange={() =>
          updateSettings({
            agentStatusHooksEnabled: !enabled
          })
        }
        ariaLabel={AGENT_STATUS_HOOKS_TITLE}
      />
    </section>
  )
}

export function AgentGeneratedTabTitlesSetting({
  settings,
  updateSettings
}: AgentsPaneProps): React.JSX.Element {
  const enabled = settings.tabAutoGenerateTitle === true
  return (
    <section className="space-y-3">
      <SettingsSwitchRow
        label={AGENT_GENERATED_TAB_TITLES_TITLE}
        description={AGENT_GENERATED_TAB_TITLES_DESCRIPTION}
        checked={enabled}
        onChange={() =>
          updateSettings({
            tabAutoGenerateTitle: !enabled
          })
        }
        ariaLabel={AGENT_GENERATED_TAB_TITLES_TITLE}
      />
    </section>
  )
}
