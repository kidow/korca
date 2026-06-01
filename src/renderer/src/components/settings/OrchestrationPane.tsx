import { useEffect, useState } from 'react'
import { Workflow } from 'lucide-react'
import { Label } from '../ui/label'
import { ORCHESTRATION_SKILL_NAME } from '@/lib/agent-feature-install-commands'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureOrcaCliAvailableForAgentSkillTerminal
} from '@/lib/agent-skill-cli-prerequisite'
import { ORCHESTRATION_SKILL_INSTALL_COMMAND } from '@/lib/orchestration-install-command'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import {
  ORCHESTRATION_ENABLED_STORAGE_KEY,
  ORCHESTRATION_SETUP_STATE_EVENT,
  isOrchestrationSetupEnabled,
  notifyOrchestrationSetupStateChanged
} from '@/lib/orchestration-setup-state'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { useAppStore } from '../../store'
import { ORCHESTRATION_PANE_SEARCH_ENTRIES } from './orchestration-search'
import { AgentSkillSetupPanel } from './AgentSkillSetupPanel'

export function OrchestrationPane(): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const showOrchestration = matchesSettingsSearch(searchQuery, ORCHESTRATION_PANE_SEARCH_ENTRIES)

  const [orchestrationEnabled, setOrchestrationEnabled] = useState<boolean>(() => {
    return isOrchestrationSetupEnabled()
  })

  const {
    installed: orchestrationSkillDetected,
    loading: orchestrationSkillLoading,
    error: orchestrationSkillError,
    refresh: refreshOrchestrationSkill
  } = useInstalledAgentSkill(ORCHESTRATION_SKILL_NAME, {
    enabled: orchestrationEnabled,
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })

  useEffect(() => {
    const syncSetupState = (): void => {
      setOrchestrationEnabled(isOrchestrationSetupEnabled())
    }
    window.addEventListener(ORCHESTRATION_SETUP_STATE_EVENT, syncSetupState)
    return () => {
      window.removeEventListener(ORCHESTRATION_SETUP_STATE_EVENT, syncSetupState)
    }
  }, [])

  const toggleOrchestration = (value: boolean): void => {
    setOrchestrationEnabled(value)
    localStorage.setItem(ORCHESTRATION_ENABLED_STORAGE_KEY, value ? '1' : '0')
    if (value) {
      useAppStore.getState().recordFeatureInteraction('agent-orchestration-setup')
    }
    notifyOrchestrationSetupStateChanged()
  }

  if (!showOrchestration) {
    return <div />
  }

  return (
    <SearchableSetting
      title="에이전트 조정"
      description="메시지, 작업 DAG, 배정, 의사결정 게이트를 통해 여러 코딩 에이전트를 조정합니다."
      keywords={ORCHESTRATION_PANE_SEARCH_ENTRIES[0].keywords}
      className="space-y-3 py-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 shrink space-y-0.5">
          <Label>에이전트 조정</Label>
          <p className="text-xs text-muted-foreground">
            메시지, 작업 DAG, preamble 삽입이 포함된 배정, 의사결정 게이트, 조정 루프로 여러 코딩 에이전트를 조정합니다.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={orchestrationEnabled}
          onClick={() => toggleOrchestration(!orchestrationEnabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            orchestrationEnabled ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
              orchestrationEnabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {orchestrationEnabled ? (
        <AgentSkillSetupPanel
          title="조정 스킬"
          description="에이전트가 컨텍스트를 넘기고 Orca를 통해 작업을 조정할 수 있게 합니다."
          command={ORCHESTRATION_SKILL_INSTALL_COMMAND}
          terminalTitle="조정 설정"
          terminalAriaLabel="조정 스킬 설치 터미널"
          terminalWorktreeId="settings-orchestration-skill-terminal"
          installed={orchestrationSkillDetected}
          loading={orchestrationSkillLoading}
          error={orchestrationSkillError}
          icon={<Workflow className="size-5" />}
          preInstallNotice={AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
          onBeforeOpenTerminal={async () => {
            useAppStore.getState().recordFeatureInteraction('agent-orchestration-setup')
            await ensureOrcaCliAvailableForAgentSkillTerminal()
          }}
          onRecheck={refreshOrchestrationSkill}
        />
      ) : null}
    </SearchableSetting>
  )
}
