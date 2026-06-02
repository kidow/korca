import type { JSX } from 'react'
import { KORCA_CLI_SKILL_INSTALL_COMMAND } from '@/lib/agent-feature-install-commands'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureKorcaCliAvailableForAgentSkillTerminal
} from '@/lib/agent-skill-cli-prerequisite'
import { BROWSER_USE_ENABLED_STORAGE_KEY } from '@/lib/browser-use-setup-state'
import type { InstalledAgentSkillState } from '@/hooks/useInstalledAgentSkills'
import { AgentSkillSetupPanel } from '@/components/settings/AgentSkillSetupPanel'

export function BrowserUseSkillSetupCard(props: {
  compact?: boolean
  terminalHeightPx?: number
  skill: InstalledAgentSkillState
}): JSX.Element {
  const { compact, terminalHeightPx, skill } = props

  const handleBeforeOpenTerminal = async (): Promise<void> => {
    await ensureKorcaCliAvailableForAgentSkillTerminal()
    localStorage.setItem(BROWSER_USE_ENABLED_STORAGE_KEY, '1')
  }

  const setupPanel = (
    <AgentSkillSetupPanel
      className={compact ? 'w-full max-w-[520px]' : undefined}
      title="Browser Use 스킬"
      description="에이전트가 Korca 브라우저에서 페이지를 탐색하고 검증할 수 있게 합니다."
      command={KORCA_CLI_SKILL_INSTALL_COMMAND}
      terminalTitle="Browser Use 설정"
      terminalAriaLabel="Browser Use 스킬 설치 터미널"
      terminalWorktreeId="feature-wall-browser-use-skill-terminal"
      installed={skill.installed}
      loading={skill.loading}
      error={skill.error}
      terminalHeightPx={terminalHeightPx}
      preInstallNotice={AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
      onBeforeOpenTerminal={handleBeforeOpenTerminal}
      showRecheckWhenInstalled={false}
      onRecheck={skill.refresh}
    />
  )

  if (compact) {
    return <div className="flex min-h-24 flex-1 items-center justify-center pt-3">{setupPanel}</div>
  }
  return <div className="flex">{setupPanel}</div>
}
