import type { SshConnectionStatus } from '../../../../shared/ssh-types'
import type { Repo } from '../../../../shared/types'
import { isGitRepoKind } from '../../../../shared/repo-kind'
import { getSelectedRepoSshGate } from '../../lib/new-workspace-ssh-gate'

export type RepoHeaderCreateState = {
  disabled: boolean
  tooltip: string
  ariaLabel: string
  requiresSshReconnect: boolean
}

export function getRepoHeaderCreateState(input: {
  repo: Repo
  label: string
  sshStatus: SshConnectionStatus | null
}): RepoHeaderCreateState {
  if (!isGitRepoKind(input.repo)) {
    return {
      disabled: false,
      tooltip: `Create workspace for ${input.label}`,
      ariaLabel: `Create workspace for ${input.label}`,
      requiresSshReconnect: false
    }
  }

  const sshGate = getSelectedRepoSshGate({
    connectionId: input.repo.connectionId,
    status: input.repo.connectionId ? input.sshStatus : null
  })
  if (sshGate.selectedRepoRequiresConnection) {
    return {
      disabled: true,
      tooltip: '작업 공간을 만들기 전에 SSH 대상을 다시 연결하세요',
      ariaLabel: `${input.label}의 작업 공간을 만들기 전에 SSH 대상을 다시 연결하세요`,
      requiresSshReconnect: true
    }
  }

  return {
    disabled: false,
    tooltip: `Create new worktree for ${input.label}`,
    ariaLabel: `Create new worktree for ${input.label}`,
    requiresSshReconnect: false
  }
}
