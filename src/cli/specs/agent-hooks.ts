import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const AGENT_HOOK_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['agent', 'hooks', 'status'],
    summary: 'Show whether Korca-managed agent status hooks are enabled',
    usage: 'korca agent hooks status [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['korca agent hooks status', 'korca agent hooks status --json']
  },
  {
    path: ['agent', 'hooks', 'off'],
    summary: 'Disable Korca-managed agent status hooks and remove local hook entries',
    usage: 'korca agent hooks off [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['korca agent hooks off']
  },
  {
    path: ['agent', 'hooks', 'on'],
    summary: 'Enable Korca-managed agent status hooks',
    usage: 'korca agent hooks on [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['korca agent hooks on']
  }
]
