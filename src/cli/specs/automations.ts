import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

const AUTOMATION_TARGET_FLAGS = ['repo', 'workspace', 'workspace-mode', 'base-branch']
const AUTOMATION_SCHEDULE_FLAGS = ['trigger', 'schedule', 'time', 'day', 'timezone']
const AUTOMATION_PRECHECK_FLAGS = ['precheck', 'precheck-timeout']
const AUTOMATION_STATE_FLAGS = [
  'enabled',
  'disabled',
  'missed-run-grace-minutes',
  'reuse-session',
  'fresh-session'
]

export const AUTOMATION_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['automations', 'list'],
    summary: 'List scheduled Korca automations',
    usage: 'korca automations list [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['korca automations list', 'korca automations list --json']
  },
  {
    path: ['automations', 'show'],
    summary: 'Show one Korca automation',
    usage: 'korca automations show <id> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'id'],
    positionalArgs: ['id'],
    examples: ['korca automations show 2f9e...', 'korca automations show --id 2f9e... --json']
  },
  {
    path: ['automations', 'create'],
    summary: 'Create a scheduled Korca automation',
    usage:
      'korca automations create --name <name> --trigger <preset|cron|rrule> --prompt <text> --provider <agent> [--precheck <command>] [--repo <selector>|--workspace <selector>] [--json]',
    allowedFlags: [
      ...GLOBAL_FLAGS,
      'name',
      'prompt',
      'provider',
      ...AUTOMATION_PRECHECK_FLAGS,
      ...AUTOMATION_TARGET_FLAGS,
      ...AUTOMATION_SCHEDULE_FLAGS,
      ...AUTOMATION_STATE_FLAGS
    ],
    notes: [
      'Trigger accepts hourly, daily, weekdays, weekly, a 5-field cron expression, or an RRULE string.',
      'When --repo is omitted, the CLI uses the enclosing Korca worktree when one can be resolved from cwd.',
      'Use --workspace to run in an existing worktree; otherwise the automation creates a new worktree per run.',
      'Use --precheck to run a bounded command before scheduled runs; exit code 0 continues, anything else records a skipped run.',
      'Use --reuse-session only with existing-workspace automations to submit later runs to the previous live automation session when it is still available. Use --fresh-session to disable reuse.'
    ],
    examples: [
      'korca automations create --name "Daily review" --trigger daily --prompt "Review open changes" --provider codex',
      'korca automations create --name "Weekday triage" --trigger "0 9 * * 1-5" --prompt "Triage issues" --provider claude --repo my-repo',
      'korca automations create --name "PR review" --trigger hourly --precheck "gh pr list --json number -q .[0].number" --prompt "Review requested PRs" --provider codex'
    ]
  },
  {
    path: ['automations', 'edit'],
    summary: 'Edit an Korca automation',
    usage: 'korca automations edit <id> [--name <name>] [--trigger <preset|cron|rrule>] [--json]',
    allowedFlags: [
      ...GLOBAL_FLAGS,
      'id',
      'name',
      'prompt',
      'provider',
      ...AUTOMATION_PRECHECK_FLAGS,
      ...AUTOMATION_TARGET_FLAGS,
      ...AUTOMATION_SCHEDULE_FLAGS,
      ...AUTOMATION_STATE_FLAGS
    ],
    positionalArgs: ['id'],
    examples: [
      'korca automations edit 2f9e... --disabled',
      'korca automations edit --id 2f9e... --trigger "30 * * * *" --json'
    ]
  },
  {
    path: ['automations', 'remove'],
    summary: 'Remove an Korca automation and its run history',
    usage: 'korca automations remove <id> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'id'],
    positionalArgs: ['id'],
    examples: ['korca automations remove 2f9e...', 'korca automations remove --id 2f9e... --json']
  },
  {
    path: ['automations', 'run'],
    summary: 'Run an Korca automation now',
    usage: 'korca automations run <id> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'id'],
    positionalArgs: ['id'],
    examples: ['korca automations run 2f9e...', 'korca automations run --id 2f9e... --json']
  },
  {
    path: ['automations', 'runs'],
    summary: 'List automation run history',
    usage: 'korca automations runs [--id <automation-id>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'id'],
    examples: ['korca automations runs', 'korca automations runs --id 2f9e... --json']
  }
]
