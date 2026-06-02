/* eslint-disable max-lines -- Why: root and generated command help text live together so CLI discovery stays greppable. */
import type { CommandSpec } from './args'
import { findCommandSpec, isCommandGroup, supportsBrowserPageFlag } from './args'

const ROOT_HELP_TEXT = `korca

Usage: korca <command> [options]

Startup:
  open                      Launch Korca and wait for the runtime to be reachable
  serve                     Start a headless Korca runtime server
  status                    Show app/runtime/graph readiness

Environments:
  environment add           Save a remote Korca runtime from a pairing code
  environment list          List saved remote Korca runtimes
  environment show          Show one saved remote Korca runtime
  environment rm            Remove a saved remote Korca runtime

Automations:
  automations list          List scheduled Korca automations
  automations show          Show one Korca automation
  automations create        Create a scheduled Korca automation
  automations edit          Edit an Korca automation
  automations remove        Remove an Korca automation and its run history
  automations run           Run an Korca automation now
  automations runs          List automation run history

Repos:
  repo list                 List repos registered in Korca
  repo add                  Add a project to Korca by filesystem path
  repo show                 Show one registered repo
  repo set-base-ref         Set the repo's default base ref for future worktrees
  repo search-refs          Search branch/tag refs within a repo

Worktrees:
  worktree list             List Korca-managed worktrees
  worktree show             Show one worktree
  worktree current          Show the Korca-managed worktree for the current directory
  worktree create           Create a new Korca-managed worktree
  worktree set              Update Korca metadata for a worktree
  worktree rm               Remove a worktree from Korca and git
  worktree ps               Show a compact orchestration summary across worktrees

Files:
  file open                 Open a workspace file in the Korca editor
  file diff                 Open a workspace file diff in the Korca editor
  file open-changed         Open all git-changed files for a workspace

Terminals:
  terminal list             List live Korca-managed terminals
  terminal show             Show terminal metadata and preview
  terminal read             Read bounded terminal output
  terminal send             Send input to a live terminal
  terminal wait             Wait for a terminal condition (exit, tui-idle)
  terminal stop             Stop terminals for a worktree
  terminal create           Create a terminal session in a worktree
  terminal rename           Set or clear the title of a terminal tab
  terminal split            Split an existing terminal pane
  terminal switch           Bring a terminal tab to the foreground
  terminal focus            Alias for terminal switch
  terminal close            Close a terminal pane (or tab if last pane)

Orchestration:
  orchestration send        Send an inter-agent message
  orchestration check       Check messages for a terminal
  orchestration reply       Reply to a message
  orchestration inbox       Show all messages across recipients
  orchestration task-create Create an orchestration task
  orchestration task-list   List orchestration tasks
  orchestration task-update Update a task status
  orchestration dispatch    Dispatch a task to a terminal
  orchestration dispatch-show Show dispatch context for a task
  orchestration run         Start the coordinator loop
  orchestration run-stop    Stop the active coordinator run
  orchestration gate-create Create a decision gate blocking a task
  orchestration gate-resolve Resolve a pending decision gate
  orchestration gate-list   List decision gates
  orchestration reset       Reset orchestration state

Computer Use:
  computer permissions      Open the macOS permission setup for computer-use
  computer list-apps        List running apps available to computer-use
  computer list-windows     List visible windows for a target app
  computer get-app-state    Capture a compact accessibility snapshot of an app
  computer click            Click an app element or window coordinate
  computer perform-secondary-action Run an advertised accessibility action
  computer scroll           Scroll an app element
  computer drag             Drag between app elements or window coordinates
  computer type-text        Type literal text at the current app focus
  computer press-key        Press a key using xdotool-style syntax
  computer hotkey           Press a shortcut combination such as CmdOrCtrl+A
  computer paste-text       Paste text through the native clipboard path
  computer set-value        Set the value of a settable app element

Browser Automation:
  tab create                Create a new browser tab (navigates to --url)
  tab list                  List open browser tabs
  tab show                  Show one browser tab by page id
  tab current               Show the current browser tab
  tab profile list          List browser session profiles
  tab profile create        Create a browser session profile
  tab profile delete        Delete a browser session profile
  tab profile set           Switch a browser tab to a different profile
  tab profile show          Show the profile bound to a browser tab
  tab profile use-default   Switch a browser tab back to the default profile
  tab profile clone         Clone a browser tab into another profile
  tab switch                Switch the active browser tab by --index or --page
  tab close                 Close a browser tab by --index/--page or the current tab
  snapshot                  Accessibility snapshot with element refs (e.g. @e1, @e2)
  goto                      Navigate the active tab to --url
  click                     Click element by --element ref
  fill                      Clear and fill input by --element ref with --value
  type                      Type --input text at the current focus (no element needed)
  select                    Select dropdown option by --element ref and --value
  hover                     Hover element by --element ref
  keypress                  Press a key (e.g. --key Enter, --key Tab)
  scroll                    Scroll --direction (up/down) by --amount pixels
  back                      Navigate back in browser history
  reload                    Reload the active browser tab
  screenshot                Capture viewport screenshot (--format png|jpeg)
  eval                      Evaluate --expression JavaScript in the page context
  wait                      Wait for page idle or --timeout ms
  check                     Check a checkbox by --element ref
  uncheck                   Uncheck a checkbox by --element ref
  focus                     Focus an element by --element ref
  clear                     Clear an input by --element ref
  drag                      Drag --from ref to --to ref
  upload                    Upload --files to a file input by --element ref
  dblclick                  Double-click element by --element ref
  forward                   Navigate forward in browser history
  scrollintoview            Scroll --element into view
  get                       Get element property (--what: text, html, value, url, title)
  is                        Check element state (--what: visible, enabled, checked)
  inserttext                Insert text without key events
  mouse move                Move mouse to --x --y coordinates
  mouse down                Press mouse button
  mouse up                  Release mouse button
  mouse wheel               Scroll wheel --dy [--dx]
  find                      Find element by locator (--locator role|text|label --value <v>)
  set device                Emulate device (--name "iPhone 12")
  set offline               Toggle offline mode (--state on|off)
  set headers               Set HTTP headers (--headers '{"key":"val"}')
  set credentials           Set HTTP auth (--user <u> --pass <p>)
  set media                 Set color scheme (--color-scheme dark|light)
  clipboard read            Read clipboard contents
  clipboard write           Write --text to clipboard
  dialog accept             Accept browser dialog (--text for prompt response)
  dialog dismiss            Dismiss browser dialog
  storage local get         Get localStorage value by --key
  storage local set         Set localStorage --key --value
  storage local clear       Clear localStorage
  storage session get       Get sessionStorage value by --key
  storage session set       Set sessionStorage --key --value
  storage session clear     Clear sessionStorage
  download                  Download file via --selector to --path
  highlight                 Highlight --selector on page
  exec                      Run any agent-browser command (--command "...")

Common Commands:
  korca open [--json]
  korca serve [--port <port>] [--pairing-address <host>] [--mobile-pairing] [--no-pairing] [--json]
  korca status [--json]
  korca environment add --name <name> --pairing-code <code> [--json]
  korca environment list [--json]
  korca environment show --environment <selector> [--json]
  korca environment rm --environment <selector> [--json]
  korca worktree list [--repo <selector>] [--limit <n>] [--json]
  korca worktree create --repo <selector> --name <name> [--base-branch <ref>] [--issue <number>] [--comment <text>] [--parent-worktree <selector>] [--no-parent] [--run-hooks] [--activate] [--json]
  korca worktree show --worktree <selector> [--json]
  korca worktree current [--json]
  korca worktree set --worktree <selector> [--display-name <name>] [--issue <number|null>] [--comment <text>] [--workspace-status <id>] [--parent-worktree <selector>|--no-parent] [--json]
  korca worktree rm --worktree <selector> [--force] [--run-hooks] [--json]
  korca worktree ps [--limit <n>] [--json]
  korca file open <path> [--worktree <selector>] [--json]
  korca file diff <path> [--staged] [--worktree <selector>] [--json]
  korca file open-changed [--mode edit|diff|both] [--worktree <selector>] [--json]
  korca terminal list [--worktree <selector>] [--limit <n>] [--json]
  korca terminal show [--terminal <handle>] [--json]
  korca terminal read [--terminal <handle>] [--cursor <n>] [--limit <n>] [--json]
  korca terminal send [--terminal <handle>] [--text <text>] [--enter] [--interrupt] [--json]
  korca terminal wait [--terminal <handle>] --for exit|tui-idle [--timeout-ms <ms>] [--json]
  korca terminal stop --worktree <selector> [--json]
  korca terminal create [--worktree <selector>] [--title <name>] [--command <text>] [--focus] [--json]
  korca terminal split [--terminal <handle>] [--direction horizontal|vertical] [--json]
  korca terminal switch [--terminal <handle>] [--json]
  korca terminal close [--terminal <handle>] [--json]
  korca repo list [--json]
  korca repo add --path <path> [--json]
  korca repo show --repo <selector> [--json]
  korca repo set-base-ref --repo <selector> --ref <ref> [--json]
  korca repo search-refs --repo <selector> --query <text> [--limit <n>] [--json]

Selectors:
  --repo <selector>         Registered repo selector such as id:<id>, name:<name>, or path:<path>
  --worktree <selector>     Worktree selector such as id:<id>, branch:<branch>, issue:<number>, path:<path>, or active/current
  --terminal <handle>       Runtime-issued terminal handle returned by \`korca terminal list --json\`
  --parent-worktree <selector> Parent worktree selector; create infers a child of the caller/current worktree by default
  --no-parent               Force no parent lineage for unrelated worktree creation/update

Terminal Send Options:
  --text <text>             Text to send to the terminal
  --enter                   Append Enter after sending text
  --interrupt               Send as an interrupt-style input when supported

Wait Options:
  --for exit                Wait until the target terminal exits
  --timeout-ms <ms>         Maximum wait time before timing out

Output Options:
  --json                    Emit machine-readable JSON instead of human text
  --pairing-code <code>      Connect to a remote Korca runtime using an korca://pair?... code
  --environment <selector>   Connect using a saved environment id or name
  --help                    Show this help message

Behavior:
  Most commands require a running Korca runtime. If Korca is not open yet, run \`korca open\` first.
  Remote runtime access can also be supplied with KORCA_PAIRING_CODE or KORCA_ENVIRONMENT.
  Use selectors for discovery and handles for repeated live terminal operations.

Browser Workflow:
  1. Create or navigate:  korca tab create --url https://example.com
                          korca goto --url https://example.com
  2. Inspect the page:    korca snapshot
     (Returns an accessibility tree with element refs like e1, e2, e3)
     For concurrent workflows, prefer: korca tab list --json
     then reuse tabs[].browserPageId with --page <id> on later commands.
  3. Interact:            korca click --element e2
                          korca fill --element e5 --value "search query"
                          korca keypress --key Enter
  4. Re-inspect:          korca snapshot
     (Element refs change after navigation — always re-snapshot before interacting)

Browser Options:
  --element <ref>           Element ref from snapshot (e.g. @e3)
  --url <url>               URL to navigate to
  --value <text>            Value to fill or select
  --input <text>            Text to type at current focus (no element needed)
  --expression <js>         JavaScript expression to evaluate
  --key <key>               Key to press (Enter, Tab, Escape, Control+a, etc.)
  --direction <dir>         Scroll direction: up or down
  --amount <pixels>         Scroll distance in pixels (default: viewport height)
  --index <n>               Tab index (from \`tab list\`)
  --page <id>               Stable browser page id (preferred for concurrent workflows)
  --profile <id>            Browser profile id
  --show-profile            Include the tab's browser profile in text output
  --format <png|jpeg>       Screenshot image format
  --from <ref>              Drag source element ref
  --to <ref>                Drag target element ref
  --files <path,...>        Comma-separated file paths for upload
  --timeout <ms>            Wait timeout in milliseconds
  --worktree <selector>     Scope commands to a specific worktree's browser tabs

Examples:
  $ korca open
  $ korca status --json
  $ korca repo list
  $ korca worktree create --repo name:korca --name cli-test-1 --issue 273
  $ korca worktree show --worktree branch:Jinwoo-H/cli
  $ korca worktree current
  $ korca worktree set --worktree active --comment "waiting on review"
  $ korca worktree ps --limit 10
  $ korca file open-changed --mode diff
  $ korca file open src/App.tsx
  $ korca terminal list --worktree path:/Users/me/korca/workspaces/korca/cli-test-1 --json
  $ korca terminal send --terminal term_123 --text "hi" --enter
  $ korca terminal wait --terminal term_123 --for exit --timeout-ms 60000 --json
  $ korca tab current --json
  $ korca tab show --page page_123 --json
  $ korca tab create --url https://example.com --profile work
  $ korca tab profile clone --page page_123 --profile work --json
  $ korca snapshot
  $ korca click --element e3
  $ korca fill --element e5 --value "hello"
  $ korca goto --url https://example.com/login
  $ korca keypress --key Enter
  $ korca eval --expression "document.title"
  $ korca tab list --json`

export function printHelp(specs: CommandSpec[], commandPath: string[] = []): void {
  const exactSpec = findCommandSpec(specs, commandPath)
  if (exactSpec) {
    console.log(formatCommandHelp(exactSpec))
    return
  }

  if (isCommandGroup(commandPath)) {
    console.log(formatGroupHelp(specs, commandPath[0]))
    return
  }

  if (commandPath.length > 0) {
    console.log(`Unknown command: ${commandPath.join(' ')}\n`)
  }

  console.log(ROOT_HELP_TEXT)
}

export function formatCommandHelp(spec: CommandSpec): string {
  const lines = [`korca ${spec.path.join(' ')}`, '', `Usage: ${spec.usage}`, '', spec.summary]
  const displayedFlags = supportsBrowserPageFlag(spec.path)
    ? [...spec.allowedFlags, 'page']
    : spec.allowedFlags

  if (displayedFlags.length > 0) {
    lines.push('', 'Options:')
    for (const flag of displayedFlags) {
      lines.push(`  ${formatFlagHelp(flag)}`)
    }
  }

  if (spec.notes && spec.notes.length > 0) {
    lines.push('', 'Notes:')
    for (const note of spec.notes) {
      lines.push(`  ${note}`)
    }
  }

  if (spec.examples && spec.examples.length > 0) {
    lines.push('', 'Examples:')
    for (const example of spec.examples) {
      lines.push(`  $ ${example}`)
    }
  }

  return lines.join('\n')
}

export function formatGroupHelp(specs: CommandSpec[], group: string): string {
  const groupSpecs = specs.filter((spec) => spec.path[0] === group)
  const lines = [`korca ${group}`, '', `Usage: korca ${group} <command> [options]`, '', 'Commands:']
  for (const spec of groupSpecs) {
    lines.push(`  ${spec.path.slice(1).join(' ').padEnd(18)} ${spec.summary}`)
  }
  lines.push('', `Run \`korca ${group} <command> --help\` for command-specific usage.`)
  return lines.join('\n')
}

export function formatFlagHelp(flag: string): string {
  const helpByFlag: Record<string, string> = {
    'base-branch': '--base-branch <ref>    Base branch/ref to create the worktree from',
    command: '--command <text>       Command to run in the terminal on startup',
    comment: '--comment <text>       Comment stored in Korca metadata',
    cursor: '--cursor <n>           Line cursor from a previous read (returns only new output)',
    action: '--action <name>       Secondary accessibility action name',
    activate: '--activate             Reveal the new worktree in the Korca app',
    app: '--app <app>            App name, bundle ID, or pid:N',
    direction:
      '--direction <dir>      Direction: up|down|left|right for scroll, horizontal|vertical for split',
    'display-name': '--display-name <name>  Override the Korca display name',
    'element-index': '--element-index <n>   Element index from get-app-state',
    title: '--title <text>         Custom title for the terminal tab (omit to reset)',
    enter: '--enter                Append Enter after sending text',
    force: '--force                Force worktree removal when supported',
    focus: '--focus                Reveal the created terminal session in Korca',
    for: '--for exit|tui-idle    Wait condition to satisfy',
    'from-element-index': '--from-element-index <n> Source element index from get-app-state',
    'from-x': '--from-x <x>           Source window-local x coordinate',
    'from-y': '--from-y <y>           Source window-local y coordinate',
    help: '--help                 Show this help message',
    interrupt: '--interrupt            Send as an interrupt-style input when supported',
    issue: '--issue <number|null>  Linked GitHub issue number',
    json: '--json                 Emit machine-readable JSON',
    key: '--key <key>            Key or combo to press, e.g. Escape or CmdOrCtrl+L',
    limit: '--limit <n>            Maximum number of rows to return',
    mode: '--mode <mode>          Mode such as edit, diff, or both',
    'mouse-button': '--mouse-button <btn>   Mouse button: left, right, or middle',
    name: '--name <name>          Name for the new worktree or automation',
    'no-parent': '--no-parent            Force no parent lineage for unrelated work',
    'no-screenshot': '--no-screenshot       Skip screenshot capture after the operation',
    pages: '--pages <n>           Number of scroll pages',
    'parent-worktree':
      '--parent-worktree <selector> Parent selector; create infers the caller/current worktree by default',
    path: '--path <path>          Path argument for the command',
    query: '--query <text>        Search text for matching refs',
    ref: '--ref <ref>            Base ref to persist for the repo',
    repo: '--repo <selector>      Repo selector such as id:<id>, name:<name>, or path:<path>',
    'restore-window':
      '--restore-window     Bring the target app/window forward before the operation',
    session: '--session <id>        Snapshot namespace for a related computer-use workflow',
    terminal: '--terminal <handle>  Runtime-issued terminal handle',
    text: '--text <text>          Text payload to send or type',
    'text-stdin': '--text-stdin          Read text payload from stdin',
    'timeout-ms': '--timeout-ms <ms>     Maximum wait time before timing out',
    'to-element-index': '--to-element-index <n> Destination element index from get-app-state',
    'to-x': '--to-x <x>             Destination window-local x coordinate',
    'to-y': '--to-y <y>             Destination window-local y coordinate',
    worktree:
      '--worktree <selector>  Worktree selector such as id:<id>, branch:<branch>, issue:<number>, path:<path>, or active/current',
    workspace: '--workspace <selector> Existing worktree selector for automation runs',
    'workspace-status':
      '--workspace-status <id> Board status id (defaults: todo, in-progress, in-review, completed)',
    prompt: '--prompt <text>        Automation prompt to pass to the agent',
    staged: '--staged               Open staged source-control changes',
    provider: '--provider <agent>     Agent id such as codex, claude, or gemini',
    trigger: '--trigger <schedule>   Automation schedule preset, cron, or RRULE',
    schedule: '--schedule <schedule>  Alias for --trigger',
    time: '--time <HH:MM>        Time used with daily/weekdays/weekly presets',
    day: '--day <0-6>           Day used with weekly preset, Sunday=0',
    timezone: '--timezone <tz>       IANA timezone for the automation',
    enabled: '--enabled              Enable the automation',
    disabled: '--disabled             Disable the automation',
    'reuse-session':
      '--reuse-session        Reuse the previous live session for existing-workspace runs',
    'fresh-session': '--fresh-session        Disable session reuse for future runs',
    'workspace-mode': '--workspace-mode <mode> existing or new-per-run',
    'missed-run-grace-minutes': '--missed-run-grace-minutes <n> Missed-run grace window',
    'value-stdin': '--value-stdin         Read set-value payload from stdin',
    'window-id': '--window-id <id>      Target a window id from list-windows',
    'window-index': '--window-index <n>   Target a window index from list-windows',
    // Browser automation flags
    element: '--element <ref>        Element ref from snapshot (e.g. e3)',
    url: '--url <url>            URL to navigate to',
    value: '--value <text>         Value to fill or select',
    input: '--input <text>         Text to type at current focus',
    expression: '--expression <js>     JavaScript expression to evaluate',
    amount: '--amount <pixels>      Scroll distance in pixels',
    index: '--index <n>            Tab index to switch to',
    page: '--page <id>            Stable browser page id from `korca tab list --json`',
    profile: '--profile <id>        Browser profile id',
    'show-profile': '--show-profile        Include tab profile in text output',
    format: '--format <png|jpeg>    Screenshot image format'
  }

  return helpByFlag[flag] ?? `--${flag}`
}
