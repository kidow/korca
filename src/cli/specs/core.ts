import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const CORE_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['open'],
    summary: 'Launch Korca and wait for the runtime to be reachable',
    usage: 'korca open [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['korca open', 'korca open --json']
  },
  {
    path: ['serve'],
    summary: 'Start an Korca runtime server without opening a desktop window',
    usage:
      'korca serve [--port <port>] [--pairing-address <host>] [--mobile-pairing] [--no-pairing] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'port', 'pairing-address', 'mobile-pairing', 'no-pairing'],
    notes: [
      'Runs in the foreground and prints the runtime endpoint. Stop it with Ctrl+C.',
      'Use --pairing-address when clients should connect through a LAN, Tailscale, SSH-forward, or public tunnel address.',
      'Use --mobile-pairing to print a mobile-scoped pairing QR/link instead of the default runtime-environment pairing link.',
      'When the web client bundle is available, the server also prints a browser URL with the pairing data embedded.'
    ],
    examples: [
      'korca serve',
      'korca serve --json',
      'korca serve --port 6768 --pairing-address 100.64.1.20',
      'korca serve --pairing-address 100.64.1.20 --mobile-pairing'
    ]
  },
  {
    path: ['status'],
    summary: 'Show app/runtime/graph readiness',
    usage: 'korca status [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['korca status', 'korca status --json']
  },
  {
    path: ['repo', 'list'],
    summary: 'List repos registered in Korca',
    usage: 'korca repo list [--json]',
    allowedFlags: [...GLOBAL_FLAGS]
  },
  {
    path: ['repo', 'add'],
    summary: 'Add a project to Korca by filesystem path',
    usage: 'korca repo add --path <path> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'path']
  },
  {
    path: ['repo', 'show'],
    summary: 'Show one registered repo',
    usage: 'korca repo show --repo <selector> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'repo']
  },
  {
    path: ['repo', 'set-base-ref'],
    summary: "Set the repo's default base ref for future worktrees",
    usage: 'korca repo set-base-ref --repo <selector> --ref <ref> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'repo', 'ref']
  },
  {
    path: ['repo', 'search-refs'],
    summary: 'Search branch/tag refs within a repo',
    usage: 'korca repo search-refs --repo <selector> --query <text> [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'repo', 'query', 'limit']
  },
  {
    path: ['worktree', 'list'],
    summary: 'List Korca-managed worktrees',
    usage: 'korca worktree list [--repo <selector>] [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'repo', 'limit']
  },
  {
    path: ['worktree', 'show'],
    summary: 'Show one worktree',
    usage: 'korca worktree show --worktree <selector> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree']
  },
  {
    path: ['worktree', 'current'],
    summary: 'Show the Korca-managed worktree for the current directory',
    usage: 'korca worktree current [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    notes: [
      'Resolves the current shell directory to a path: selector so agents can target the enclosing Korca worktree without spelling out $PWD.'
    ],
    examples: ['korca worktree current', 'korca worktree current --json']
  },
  {
    path: ['worktree', 'create'],
    summary: 'Create a new Korca-managed worktree',
    usage:
      'korca worktree create --repo <selector> --name <name> [--base-branch <ref>] [--issue <number>] [--comment <text>] [--parent-worktree <selector>] [--no-parent] [--run-hooks] [--activate] [--json]',
    allowedFlags: [
      ...GLOBAL_FLAGS,
      'repo',
      'name',
      'base-branch',
      'issue',
      'comment',
      'parent-worktree',
      'no-parent',
      'run-hooks',
      'activate'
    ],
    notes: [
      'By default, Korca records the new worktree as a child of the caller workspace when it can infer one from the Korca terminal or current directory.',
      'For related work, use the inferred parent or pass --parent-worktree active to make the current workspace relationship explicit.',
      'Use --no-parent when the new worktree should be independent of the current workspace.',
      'By default this creates the worktree and its first terminal without switching the active Korca workspace.',
      'Repo-defined setup hooks follow the repository setup policy; pass --run-hooks to force them.',
      'Pass --activate when the CLI caller intentionally wants to reveal the new worktree in the app.',
      'Passing --run-hooks reveals the worktree so the setup hook can run in its first terminal.'
    ],
    examples: [
      'korca worktree create --repo id:<repoId> --name related-task --json',
      'korca worktree create --repo id:<repoId> --name related-task --parent-worktree active --json',
      'korca worktree create --repo id:<repoId> --name independent-task --no-parent --json'
    ]
  },
  {
    path: ['worktree', 'set'],
    summary: 'Update Korca metadata for a worktree',
    usage:
      'korca worktree set --worktree <selector> [--display-name <name>] [--issue <number|null>] [--comment <text>] [--workspace-status <id>] [--parent-worktree <selector>|--no-parent] [--json]',
    allowedFlags: [
      ...GLOBAL_FLAGS,
      'worktree',
      'display-name',
      'issue',
      'comment',
      'workspace-status',
      'parent-worktree',
      'no-parent'
    ],
    notes: [
      'Workspace status ids match the board columns (defaults: todo, in-progress, in-review, completed); custom statuses use their configured id.'
    ]
  },
  {
    path: ['worktree', 'rm'],
    summary: 'Remove a worktree from Korca and git',
    usage: 'korca worktree rm --worktree <selector> [--force] [--run-hooks] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree', 'force', 'run-hooks'],
    notes: ['Repo-defined korca.yaml archive hooks are skipped unless --run-hooks is passed.']
  },
  {
    path: ['worktree', 'ps'],
    summary: 'Show a compact orchestration summary across worktrees',
    usage: 'korca worktree ps [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'limit']
  },
  {
    path: ['terminal', 'list'],
    summary: 'List live Korca-managed terminals',
    usage: 'korca terminal list [--worktree <selector>] [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree', 'limit']
  },
  {
    path: ['terminal', 'show'],
    summary: 'Show terminal metadata and preview',
    usage: 'korca terminal show [--terminal <handle>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal']
  },
  {
    path: ['terminal', 'read'],
    summary: 'Read bounded terminal output',
    usage: 'korca terminal read [--terminal <handle>] [--cursor <n>] [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal', 'cursor', 'limit'],
    notes: [
      'Omit --terminal to target the active terminal in the current worktree.',
      'Use --cursor with the nextCursor value from a previous read to get only new output since that read.',
      'Use --limit to request more retained lines for long agent responses; output reports oldestCursor when older lines were dropped.',
      'Useful for capturing the response to a command: read before sending, then read --cursor <prev> after waiting.'
    ],
    examples: [
      'korca terminal read --json',
      'korca terminal read --terminal term_abc123 --cursor 42 --limit 1000 --json'
    ]
  },
  {
    path: ['terminal', 'send'],
    summary: 'Send input to a live terminal',
    usage:
      'korca terminal send [--terminal <handle>] [--text <text>] [--enter] [--interrupt] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal', 'text', 'enter', 'interrupt']
  },
  {
    path: ['terminal', 'wait'],
    summary: 'Wait for a terminal condition',
    usage:
      'korca terminal wait [--terminal <handle>] --for exit|tui-idle [--timeout-ms <ms>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal', 'for', 'timeout-ms']
  },
  {
    path: ['terminal', 'stop'],
    summary: 'Stop terminals for a worktree',
    usage: 'korca terminal stop --worktree <selector> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree']
  },
  {
    path: ['terminal', 'create'],
    summary: 'Create a terminal session in the current worktree',
    usage:
      'korca terminal create [--worktree <selector>] [--title <name>] [--command <text>] [--focus] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree', 'command', 'title', 'focus'],
    notes: [
      'Creates a visible terminal tab without switching focus when possible; falls back to a background handle if the UI cannot adopt it. Pass --focus to switch to it.'
    ],
    examples: [
      'korca terminal create --json',
      'korca terminal create --worktree path:/projects/myapp --title "RUNNER" --command "opencode"',
      'korca terminal create --worktree path:/projects/myapp --command "opencode" --focus'
    ]
  },
  {
    path: ['terminal', 'switch'],
    summary: 'Switch to a terminal tab in the UI',
    usage: 'korca terminal switch [--terminal <handle>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal'],
    examples: ['korca terminal switch --terminal term_abc123']
  },
  {
    path: ['terminal', 'focus'],
    summary: 'Switch to a terminal tab in the UI (alias for terminal switch)',
    usage: 'korca terminal focus [--terminal <handle>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal'],
    examples: ['korca terminal focus --terminal term_abc123']
  },
  {
    path: ['terminal', 'close'],
    summary: 'Close a terminal tab (kills PTY if running)',
    usage: 'korca terminal close [--terminal <handle>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal'],
    examples: ['korca terminal close --terminal term_abc123']
  },
  {
    path: ['terminal', 'rename'],
    summary: 'Set or clear the title of a terminal tab',
    usage: 'korca terminal rename [--terminal <handle>] [--title <text>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal', 'title'],
    notes: ['Omit --title or pass an empty string to reset to the auto-generated title.'],
    examples: [
      'korca terminal rename --terminal term_abc123 --title "RUNNER"',
      'korca terminal rename --terminal term_abc123 --json'
    ]
  },
  {
    path: ['terminal', 'split'],
    summary: 'Split an existing terminal pane',
    usage:
      'korca terminal split [--terminal <handle>] [--direction horizontal|vertical] [--command <text>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'terminal', 'direction', 'command'],
    examples: [
      'korca terminal split --terminal term_abc123 --direction horizontal --json',
      'korca terminal split --terminal term_abc123 --command "codex"'
    ]
  }
]
