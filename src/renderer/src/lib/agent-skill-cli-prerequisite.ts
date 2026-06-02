import { toast } from 'sonner'
import type { CliInstallStatus } from '../../../shared/cli-install-types'

type EnsureKorcaCliAvailableOptions = {
  onStatusChange?: (status: CliInstallStatus) => void
  registrationPromptDelayMs?: number
}

export const AGENT_SKILL_CLI_PREREQUISITE_NOTICE =
  'Before opening setup, Korca may show a system prompt to register the Korca CLI command on PATH.'

export const CLI_PREREQUISITE_REGISTRATION_TOAST = 'Korca needs to register its CLI on PATH.'
export const CLI_PREREQUISITE_REGISTRATION_TOAST_DESCRIPTION =
  'Approve the system prompt so skill setup can use the Korca CLI command.'

export function isKorcaCliAvailableOnPath(status: CliInstallStatus | null | undefined): boolean {
  return status?.state === 'installed' && status.pathConfigured
}

export async function ensureKorcaCliAvailableForAgentSkillTerminal({
  onStatusChange,
  registrationPromptDelayMs = 700
}: EnsureKorcaCliAvailableOptions = {}): Promise<CliInstallStatus | null> {
  try {
    const status = await window.api.cli.getInstallStatus()
    onStatusChange?.(status)

    if (!status.supported) {
      showCliPrerequisiteWarning(status)
      return status
    }

    if (status.state !== 'installed' || !status.pathConfigured) {
      // Why: macOS may immediately show a native authorization prompt, so the
      // user needs app-level context before that OS dialog appears.
      await showKorcaCliRegistrationPromptToast(registrationPromptDelayMs)
      const next = await window.api.cli.install()
      onStatusChange?.(next)
      showCliPrerequisiteWarning(next)
      return next
    }

    return status
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to register the Korca CLI in PATH.')
    return null
  }
}

export async function showKorcaCliRegistrationPromptToast(delayMs = 700): Promise<void> {
  toast.message(CLI_PREREQUISITE_REGISTRATION_TOAST, {
    description: CLI_PREREQUISITE_REGISTRATION_TOAST_DESCRIPTION
  })
  await delay(delayMs)
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function showCliPrerequisiteWarning(status: CliInstallStatus): void {
  if (!status.supported) {
    toast.warning('Korca CLI registration is unavailable', {
      description: status.detail ?? 'Install the Korca CLI before running agent skill setup.'
    })
    return
  }

  if (status.state !== 'installed') {
    toast.warning('Korca CLI registration needs attention', {
      description: status.detail ?? 'Install the Korca CLI before running agent skill setup.'
    })
    return
  }

  if (!status.pathConfigured) {
    // Why: the skill installer opens a real shell; agents only get the expected
    // Korca affordances when that shell can resolve the Korca CLI command.
    toast.warning('Korca CLI is not visible on PATH yet', {
      description:
        status.detail ?? 'Restart your shell or add the Korca CLI directory to PATH before setup.'
    })
  }
}
