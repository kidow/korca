import type { JSX } from 'react'
import {
  AGENT_SKILL_CLI_PREREQUISITE_NOTICE,
  ensureKorcaCliAvailableForAgentSkillTerminal
} from '@/lib/agent-skill-cli-prerequisite'
import { ORCHESTRATION_SKILL_INSTALL_COMMAND } from '@/lib/orchestration-install-command'
import type { InstalledAgentSkillState } from '@/hooks/useInstalledAgentSkills'
import { AgentSkillSetupPanel } from './AgentSkillSetupPanel'

export function OrchestrationSetupCard(props: {
  compact?: boolean
  terminalHeightPx?: number
  skill: InstalledAgentSkillState
}): JSX.Element {
  const { compact, terminalHeightPx, skill } = props

  const setupPanel = (
    <AgentSkillSetupPanel
      className={compact ? 'w-full max-w-[520px]' : undefined}
      title="오케스트레이션 스킬"
      description="에이전트가 문맥을 넘기고 Korca 안에서 작업을 조율할 수 있게 합니다."
      command={ORCHESTRATION_SKILL_INSTALL_COMMAND}
      terminalTitle="오케스트레이션 설정"
      terminalAriaLabel="오케스트레이션 스킬 설치 터미널"
      terminalWorktreeId="feature-wall-orchestration-skill-terminal"
      installed={skill.installed}
      loading={skill.loading}
      error={skill.error}
      terminalHeightPx={terminalHeightPx}
      preInstallNotice={AGENT_SKILL_CLI_PREREQUISITE_NOTICE}
      onBeforeOpenTerminal={async () => {
        await ensureKorcaCliAvailableForAgentSkillTerminal()
      }}
      showRecheckWhenInstalled={false}
      onRecheck={skill.refresh}
    />
  )

  if (compact) {
    return <div className="flex min-h-24 flex-1 items-center justify-center">{setupPanel}</div>
  }
  return <div className="flex">{setupPanel}</div>
}
