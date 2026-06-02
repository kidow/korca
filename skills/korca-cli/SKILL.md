---
name: korca-cli
description: >-
  Use the `korca` CLI to drive a running Korca editor — manage Korca worktrees;
  create and manage scheduled automations; create, read, and run shell commands
  in Korca-managed terminals; and automate Korca's built-in browser
  (snapshot/click/fill/screenshot/tabs). Use this
  instead of raw `git worktree`, ad hoc shell PTYs, or Playwright whenever the
  task touches Korca state. Coding agents inside an Korca worktree should also use
  it to keep the worktree comment fresh at meaningful checkpoints. Boundary with
  `orchestration`: if the recipient of a terminal write is another AI agent
  (Claude Code, Gemini, Codex, a worker), use `orchestration` — it is the only
  correct way to send messages, nudges, replies, or task hand-offs to agents.
  korca-cli writes are for non-agent terminals (shells, build/test commands);
  reading or `wait`ing on any terminal — including agent terminals — stays in
  korca-cli.
---

# Korca CLI

Use this skill when the task should go through Korca's control plane rather than directly through `git`, shell PTYs, or ad hoc filesystem access.

## Platform Note

On Linux, the CLI command is `korca-ide` (not `korca`) to avoid conflicting with GNOME Korca, the accessibility screen reader. Everywhere this document says `korca <subcommand>`, Linux users should substitute `korca-ide <subcommand>`. macOS and Windows are unaffected.

## When To Use

Use `korca` (or `korca-ide` on Linux) for:

- worktree orchestration inside a running Korca app
- updating the current worktree comment with meaningful progress checkpoints
- reading Korca-managed terminals and sending input to non-agent terminals
- stopping or waiting on Korca-managed terminals
- creating and managing scheduled Korca automations
- accessing repos known to Korca
  Do not use `korca` / `korca-ide` when plain shell tools are simpler and Korca state does not matter.

Examples:

- creating one Korca worktree per GitHub issue
- updating the current worktree comment after a significant checkpoint, such as reproducing a bug, validating a fix, or handing off for review
- finding the Claude Code terminal for a worktree and reading its status
- checking which Korca worktrees have live terminal activity
- creating a scheduled automation that runs a prompt against a known repo or worktree

## Preconditions

- Prefer the public `korca` command first (`korca-ide` on Linux)
- Korca editor/runtime should already be running, or the agent should start it with `korca open`
- Do not begin by inspecting Korca source files just to decide how to invoke the CLI. The first step is to check whether the installed `korca` / `korca-ide` command exists.
- Do not assume a generic shell environment variable proves the agent is "inside Korca". For normal agent flows, the public CLI is the supported surface, but avoid wasting a round trip on probe-only checks when a direct Korca action would answer the question.

First verify the public CLI is installed:

```bash
# macOS / Windows
command -v korca
# Linux
command -v korca-ide
```

Then use the public command:

```bash
korca status --json        # or korca-ide on Linux
```

If the task is about Korca worktrees or Korca terminals, do this before any codebase exploration:

```bash
command -v korca           # or korca-ide on Linux
korca status --json
```

If the agent truly needs to confirm that the current directory is inside an Korca-managed worktree, use:

```bash
korca worktree current --json
```

If `korca` / `korca-ide` is not on PATH, say so explicitly and stop or ask the user to install/register the CLI before continuing.

## Core Workflow

1. Confirm Korca runtime availability:

```bash
korca status --json
```

If Korca is not running yet:

```bash
korca open --json
korca status --json
```

2. Discover current Korca state:

```bash
korca worktree ps --json
korca terminal list --json
```

3. Resolve a target worktree or terminal handle.

4. Act through Korca:

- `worktree create/set/rm`
- `automations list/show/create/edit/remove/run/runs`
- `terminal read/send/wait/stop`

5. When the agent reaches a significant checkpoint in the current worktree, update the Korca worktree comment so the UI reflects the latest work-in-progress:

```bash
korca worktree set --worktree active --comment "reproduced auth failure with aws sts; testing credential-chain fix" --json
```

Why: the worktree comment is Korca's lightweight, agent-writable status field. Keeping it current gives the user an at-a-glance summary of what the agent most recently proved, changed, or is waiting on.

## Command Surface

### Repo

```bash
korca repo list --json
korca repo show --repo id:<repoId> --json
korca repo add --path /abs/repo --json
korca repo set-base-ref --repo id:<repoId> --ref origin/main --json
korca repo search-refs --repo id:<repoId> --query main --limit 10 --json
```

### Worktree

```bash
korca worktree list --repo id:<repoId> --json
korca worktree ps --json
korca worktree current --json
korca worktree show --worktree id:<worktreeId> --json
korca worktree create --repo id:<repoId> --name my-task --issue 123 --comment "seed" --json
korca worktree create --repo id:<repoId> --name related-task --parent-worktree active --json
korca worktree create --repo id:<repoId> --name independent-task --no-parent --json
korca worktree set --worktree id:<worktreeId> --display-name "My Task" --json
korca worktree set --worktree active --comment "reproduced bug; collecting logs from staging" --json
korca worktree set --worktree active --comment "waiting on review" --json
korca worktree rm --worktree id:<worktreeId> --force --json
```

Worktree selectors supported in focused v1:

- `id:<worktree-id>`
- `path:<absolute-path>`
- `branch:<branch-name>`
- `issue:<number>`
- `active` / `current` to resolve the enclosing Korca-managed worktree from the shell `cwd`

### Worktree Lineage

Worktree lineage records intent; it is not a required flag sequence. When creating a worktree from inside an Korca-managed worktree, decide whether the new work is related to the current work or independent of it.

For related work, rely on Korca's inferred parent. Use `--parent-worktree active` when the current worktree relationship should be explicit or when the shell context might not make the intended parent obvious.

```bash
korca worktree create --repo id:<repoId> --name related-task --json
korca worktree create --repo id:<repoId> --name related-task --parent-worktree active --json
```

For independent work, pass `--no-parent`.

```bash
korca worktree create --repo id:<repoId> --name independent-task --no-parent --json
```

A different branch, issue, or name is not enough by itself to make the work independent. Treat lineage as a record of why the workspace exists, not as a property of the branch name.

### Automations

```bash
korca automations list --json
korca automations show <automationId> --json
korca automations create --name "Daily review" --trigger daily --time 09:00 --prompt "Review open changes" --provider codex --repo id:<repoId> --json
korca automations create --name "Weekday triage" --trigger "0 9 * * 1-5" --prompt "Triage issues" --provider claude --repo path:/abs/repo --disabled --json
korca automations create --name "Inbox digest" --trigger hourly --prompt "Summarize unread mail" --provider codex --workspace active --reuse-session --json
korca automations edit <automationId> --name "Weekday review" --trigger weekdays --time 09:30 --fresh-session --json
korca automations run <automationId> --json
korca automations runs --id <automationId> --json
korca automations remove <automationId> --json
```

Automation schedules accept `hourly`, `daily`, `weekdays`, `weekly`, a 5-field cron expression, or an RRULE string. Use `--time <HH:MM>` with `daily`, `weekdays`, or `weekly`; use `--day <0-6>` only with `weekly`, where Sunday is `0`.

Use `--repo <selector>` for a new worktree per run, or `--workspace <selector>` / `--workspace-mode existing` when the automation should run in an existing Korca worktree. `--repo` and `--workspace` are mutually exclusive.

Use `--reuse-session` only for existing-workspace automations when later runs should submit into the previous live automation terminal. Use `--fresh-session` to turn reuse back off. If the previous live terminal is gone, Korca falls back to a fresh session.

Why: automations are persisted through the running Korca runtime, so use the CLI instead of editing automation storage files directly. Prefer `--disabled` when creating an automation during tests or setup so it cannot run before the user reviews it.

### Terminal

Use selectors to discover terminals, then use the returned handle for repeated live interaction.

```bash
korca terminal list --worktree id:<worktreeId> --json
korca terminal show --terminal <handle> --json
korca terminal read --terminal <handle> --json
korca terminal read --terminal <handle> --cursor <oldestCursor> --limit 1000 --json
korca terminal send --terminal <handle> --text "continue" --enter --json
korca terminal wait --terminal <handle> --for exit --timeout-ms 5000 --json
korca terminal wait --terminal <handle> --for tui-idle --timeout-ms 30000 --json
korca terminal stop --worktree id:<worktreeId> --json
korca terminal create --json
korca terminal create --title "My Terminal" --json
korca terminal create --worktree path:/projects/myapp --command "npm test" --json
korca terminal split --terminal <handle> --direction vertical --json
korca terminal split --terminal <handle> --direction horizontal --command "npm run dev" --json
korca terminal rename --terminal <handle> --title "New Name" --json
korca terminal switch --terminal <handle> --json
korca terminal close --terminal <handle> --json
korca terminal send --text "echo hello" --enter --json
korca terminal read --json
```

Why: `--terminal` is optional for most commands. When omitted, Korca auto-resolves to the active terminal in the current worktree (same as browser commands target the active tab). Use explicit `--terminal <handle>` when operating on a specific pane.

Why: `terminal create` creates a background session unless `--focus` is explicit. Interactive local agent commands such as bare `codex` or bare `claude` use Korca's renderer-backed terminal path so they can start at the app's measured terminal geometry without stealing focus from the user.

Why: long terminal transcripts should be read with cursors. After a limited tail preview without an input cursor, page retained transcript from `oldestCursor`; in that case `nextCursor` already equals `latestCursor` and would skip omitted output. After a cursor read, if `limited` remains true and `nextCursor !== latestCursor`, continue with the returned `nextCursor`. Cursor reads default to the retained transcript size; `--limit` can request a smaller page. If `truncated` is true, older output has already fallen out of the retained buffer; use `oldestCursor` as the earliest available cursor.

Why: terminal handles are runtime-scoped and may go stale after reloads. If Korca returns `terminal_handle_stale`, reacquire a fresh handle with `terminal list`.

Why: `--direction horizontal` splits the pane **left and right** (new pane appears to the right). `--direction vertical` splits the pane **top and bottom** (new pane appears below). This matches VS Code's split convention. Default is horizontal.

## Agent Guidance

- If the user says to create/manage an Korca worktree, use `korca worktree ...`, not raw `git worktree ...`.
- If the user says to create/manage a scheduled Korca automation, use `korca automations ...`, not direct persistence edits.
- Treat Korca as the source of truth for Korca worktree and terminal tasks. Do not mix Korca-managed state with ad hoc git worktree commands unless Korca explicitly cannot perform the requested action.
- Prefer `--json` for all machine-driven use.
- Use `worktree ps` as the first summary view when many worktrees may exist.
- Use `worktree current` or `--worktree active` when the agent is already running inside the target worktree.
- When creating a worktree from an existing workspace, choose lineage based on intent: related work should keep parent context, independent work should use `--no-parent`.
- Let Korca infer the parent when the current/caller workspace is the right parent; use `--parent-worktree active` when making that relationship explicit is useful.
- Treat `korca worktree set --worktree active --comment ... --json` as a default coding-agent behavior whenever the agent reaches a meaningful checkpoint in the current Korca-managed worktree; the user does not need to explicitly ask for each update.
- Update the worktree comment at significant checkpoints, not every trivial command. Good checkpoints include reproducing a bug, confirming a hypothesis, starting a risky migration, finishing a meaningful implementation slice, switching from investigation to fix, or blocking on external input.
- Write comments as short status snapshots of the current state, for example `debugging AWS CLI profile resolution`, `confirmed flaky test is caused by temp-dir race`, or `fix implemented; running integration tests`.
- Prefer optimistic execution over probe-first flows for checkpoint updates: if `korca` (or `korca-ide` on Linux) is on `PATH`, call `korca worktree set --worktree active --comment ... --json` directly at the checkpoint instead of spending an extra cycle on `korca worktree current`.
- If that direct update fails because Korca is unavailable or the shell is not inside an Korca-managed worktree, continue the main task and treat the comment update as best-effort unless the user explicitly made Korca state part of the task.
- Use `korca worktree current --json` only when the agent actually needs the worktree identity for later logic, not as a preflight before every comment update.
- Korca only injects `KORCA_WORKTREE_PATH`-style variables for some setup-hook flows, so they are not a general detection contract for agents.
- Use `terminal list` to reacquire handles after Korca reloads.
- Use `terminal read` before `terminal send` unless the next input is obvious.
- For long agent responses, use `terminal read --json` with `oldestCursor`, `nextCursor`, `--cursor`, and `--limit` instead of relying on the default human preview. After a limited tail preview, start at `oldestCursor`; after a cursor read, continue with `nextCursor` only while `limited` is true and `nextCursor !== latestCursor`. Treat `truncated` as a signal that the requested cursor was older than the retained output.
- Use `terminal wait --terminal <handle> --for exit` only when the task actually depends on process completion.
- Use `terminal wait --terminal <handle> --for tui-idle` to wait for an agent CLI (Claude Code, Gemini, Codex, etc.) to finish its current task. This detects the working→idle OSC title transition. Always pass `--timeout-ms` as a safety net — unsupported CLIs will hang until timeout.
- Use `terminal create` to spin up new terminal tabs programmatically, optionally with a `--command` for startup (e.g. `--command "claude"` to launch Claude Code) and `--title` for labeling. In local Korca sessions, `--command "codex"` is routed through Korca's visible terminal path automatically so Codex does not start as a headless/background PTY. After creating a `--command` terminal, use `terminal wait --for tui-idle` to wait for the agent to boot before dispatching.
- Use `terminal split` to create split panes within an existing terminal tab. Pass `--command` to run a command in the new pane.
- Prefer Korca worktree selectors over hardcoded paths when Korca identity already exists.
- If the user asks for CLI UX feedback, test the public `korca` / `korca-ide` command first. Only inspect `src/cli` or use `node out/cli/index.js` if the public command is missing or the task is explicitly about implementation internals.
- If a command fails, prefer retrying with the public `korca` / `korca-ide` command before concluding the CLI is broken, unless the failure already came from the CLI itself.

## Browser Automation

The `korca` CLI (or `korca-ide` on Linux) also drives the built-in Korca browser. The core workflow is a **snapshot-interact-re-snapshot** loop:

1. **Snapshot** the page to see interactive elements and their refs.
2. **Interact** using refs (`@e1`, `@e3`, etc.) to click, fill, or select.
3. **Re-snapshot** after interactions to see the updated page state.

```bash
korca goto --url https://example.com --json
korca snapshot --json
# Read the refs from the snapshot output
korca click --element @e3 --json
korca snapshot --json
```

### Element Refs

Refs like `@e1`, `@e5` are short identifiers assigned to interactive page elements during a snapshot. They are:

- **Assigned by snapshot**: Run `korca snapshot` to get current refs.
- **Scoped to one tab**: Refs from one tab are not valid in another.
- **Invalidated by navigation**: If the page navigates after a snapshot, refs become stale. Re-snapshot to get fresh refs.
- **Invalidated by tab switch**: Switching tabs with `korca tab switch` invalidates refs. Re-snapshot after switching.

If a ref is stale, the command returns `browser_stale_ref` — re-snapshot and retry.

### Worktree Scoping

Browser commands default to the **current worktree** — only tabs belonging to the agent's worktree are visible and targetable. Tab indices are relative to the filtered tab list.

```bash
# Default: operates on tabs in the current worktree
korca snapshot --json

# Explicitly target all worktrees (cross-worktree access)
korca snapshot --worktree all --json

# Tab indices are relative to the worktree-filtered list
korca tab list --json         # Shows tabs [0], [1], [2] for this worktree
korca tab switch --index 1 --json   # Switches to tab [1] within this worktree
```

If no tabs are open in the current worktree, commands return `browser_no_tab`.

### Stable Page Targeting

For single-agent flows, bare browser commands are fine: Korca will target the active browser tab in the current worktree.

For concurrent or multi-process browser automation, prefer a stable page id instead of ambient active-tab state:

1. Run `korca tab list --json`.
2. Read `tabs[].browserPageId` from the result.
3. Pass `--page <browserPageId>` to follow-up commands like `snapshot`, `click`, `goto`, `screenshot`, `tab switch`, or `tab close`.

Why: active-tab state and tab indices can change while another Korca CLI process is working. `browserPageId` pins the command to one concrete tab.

```bash
korca tab list --json
korca snapshot --page page-123 --json
korca click --page page-123 --element @e3 --json
korca screenshot --page page-123 --json
korca tab switch --page page-123 --json
korca tab close --page page-123 --json
```

If you also pass `--worktree`, Korca treats it as extra scoping/validation for that page id. Without `--page`, commands still fall back to the current worktree's active tab.

### Navigation

```bash
korca goto --url <url> [--json]           # Navigate to URL, waits for page load
korca back [--json]                       # Go back in browser history
korca forward [--json]                    # Go forward in browser history
korca reload [--json]                     # Reload the current page
```

### Observation

```bash
korca snapshot [--page <browserPageId>] [--json]                   # Accessibility tree snapshot with element refs
korca screenshot [--page <browserPageId>] [--format <png|jpeg>] [--json]  # Viewport screenshot (base64)
korca full-screenshot [--page <browserPageId>] [--format <png|jpeg>] [--json]  # Full-page screenshot (base64)
korca pdf [--page <browserPageId>] [--json]                        # Export page as PDF (base64)
```

### Interaction

```bash
korca click --element <ref> [--page <browserPageId>] [--json]      # Click an element by ref
korca dblclick --element <ref> [--page <browserPageId>] [--json]   # Double-click an element
korca fill --element <ref> --value <text> [--page <browserPageId>] [--json]  # Clear and fill an input
korca type --input <text> [--page <browserPageId>] [--json]        # Type at current focus (no element targeting)
korca select --element <ref> --value <value> [--page <browserPageId>] [--json]  # Select dropdown option
korca check --element <ref> [--page <browserPageId>] [--json]      # Check a checkbox
korca uncheck --element <ref> [--page <browserPageId>] [--json]    # Uncheck a checkbox
korca scroll --direction <up|down> [--amount <pixels>] [--page <browserPageId>] [--json]  # Scroll viewport
korca scrollintoview --element <ref> [--page <browserPageId>] [--json]  # Scroll element into view
korca hover --element <ref> [--page <browserPageId>] [--json]      # Hover over an element
korca focus --element <ref> [--page <browserPageId>] [--json]      # Focus an element
korca drag --from <ref> --to <ref> [--page <browserPageId>] [--json]  # Drag from one element to another
korca clear --element <ref> [--page <browserPageId>] [--json]      # Clear an input field
korca select-all --element <ref> [--page <browserPageId>] [--json] # Select all text in an element
korca keypress --key <key> [--page <browserPageId>] [--json]       # Press a key (Enter, Tab, Escape, etc.)
korca upload --element <ref> --files <paths> [--page <browserPageId>] [--json]  # Upload files to a file input
```

### Tab Management

```bash
korca tab list [--json]                   # List open browser tabs
korca tab switch (--index <n> | --page <browserPageId>) [--json]     # Switch active tab (invalidates refs)
korca tab create [--url <url>] [--json]   # Open a new browser tab
korca tab close [--index <n> | --page <browserPageId>] [--json]    # Close a browser tab
```

### Wait / Synchronization

```bash
korca wait [--timeout <ms>] [--json]                        # Wait for timeout (default 1000ms)
korca wait --selector <css> [--state <visible|hidden>] [--timeout <ms>] [--json]  # Wait for element
korca wait --text <string> [--timeout <ms>] [--json]        # Wait for text to appear on page
korca wait --url <substring> [--timeout <ms>] [--json]      # Wait for URL to contain substring
korca wait --load <networkidle|load|domcontentloaded> [--timeout <ms>] [--json]   # Wait for load state
korca wait --fn <js-expression> [--timeout <ms>] [--json]   # Wait for JS condition to be truthy
```

After any page-changing action, pick one:

- Wait for specific content: `korca wait --text "Dashboard" --json`
- Wait for URL change: `korca wait --url "/dashboard" --json`
- Wait for network idle (catch-all for SPA navigation): `korca wait --load networkidle --json`
- Wait for an element: `korca wait --selector ".results" --json`

Avoid bare `korca wait --timeout 2000` except when debugging — it makes scripts slow and flaky.

### Data Extraction

```bash
korca exec --command "get text @e1" [--json]   # Get visible text of an element
korca exec --command "get html @e1" [--json]   # Get innerHTML
korca exec --command "get value @e1" [--json]  # Get input value
korca exec --command "get attr @e1 href" [--json]  # Get element attribute
korca exec --command "get title" [--json]      # Get page title
korca exec --command "get url" [--json]        # Get current URL
korca exec --command "get count .item" [--json]      # Count matching elements
```

### State Checks

```bash
korca exec --command "is visible @e1" [--json]  # Check if element is visible
korca exec --command "is enabled @e1" [--json]  # Check if element is enabled
korca exec --command "is checked @e1" [--json]  # Check if checkbox is checked
```

### Page Inspection

```bash
korca eval --expression <js> [--json]     # Evaluate JS in page context
```

### Cookie Management

```bash
korca cookie get [--url <url>] [--json]   # List cookies
korca cookie set --name <n> --value <v> [--domain <d>] [--json]  # Set a cookie
korca cookie delete --name <n> [--domain <d>] [--json]  # Delete a cookie
```

### Emulation

```bash
korca viewport --width <w> --height <h> [--scale <n>] [--mobile] [--json]
korca geolocation --latitude <lat> --longitude <lng> [--accuracy <m>] [--json]
```

### Request Interception

```bash
korca intercept enable [--patterns <list>] [--json]  # Start intercepting requests
korca intercept disable [--json]          # Stop intercepting
korca intercept list [--json]             # List paused requests
```

> **Note:** Per-request `intercept continue` and `intercept block` are not yet supported.
> They will be added once agent-browser supports per-request interception decisions.

### Console / Network Capture

```bash
korca capture start [--json]              # Start capturing console + network
korca capture stop [--json]               # Stop capturing
korca console [--limit <n>] [--json]      # Read captured console entries
korca network [--limit <n>] [--json]      # Read captured network entries
```

### Mouse Control

```bash
korca exec --command "mouse move 100 200" [--json]   # Move mouse to coordinates
korca exec --command "mouse down left" [--json]      # Press mouse button
korca exec --command "mouse up left" [--json]        # Release mouse button
korca exec --command "mouse wheel 100" [--json]      # Scroll wheel
```

### Keyboard

```bash
korca exec --command "keyboard inserttext \"text\"" [--json]  # Insert text bypassing key events
korca exec --command "keyboard type \"text\"" [--json]        # Raw keystrokes
korca exec --command "keydown Shift" [--json]                 # Hold key down
korca exec --command "keyup Shift" [--json]                   # Release key
```

### Frames (Iframes)

Iframes are auto-inlined in snapshots — refs inside iframes work transparently. For scoped interaction:

```bash
korca exec --command "frame @e3" [--json]        # Switch to iframe by ref
korca exec --command "frame \"#iframe\"" [--json] # Switch to iframe by CSS selector
korca exec --command "frame main" [--json]       # Return to main frame
```

### Semantic Locators (alternative to refs)

When refs aren't available or you want to skip a snapshot:

```bash
korca exec --command "find role button click --name \"Submit\"" [--json]
korca exec --command "find text \"Sign In\" click" [--json]
korca exec --command "find label \"Email\" fill \"user@test.com\"" [--json]
korca exec --command "find placeholder \"Search\" type \"query\"" [--json]
korca exec --command "find testid \"submit-btn\" click" [--json]
```

### Dialogs

`alert` and `beforeunload` are auto-accepted. For `confirm` and `prompt`:

```bash
korca exec --command "dialog status" [--json]        # Check for pending dialog
korca exec --command "dialog accept" [--json]        # Accept
korca exec --command "dialog accept \"text\"" [--json]  # Accept with prompt input
korca exec --command "dialog dismiss" [--json]       # Dismiss/cancel
```

### Extended Commands (Passthrough)

```bash
korca exec --command "<agent-browser command>" [--json]
```

The `exec` command provides access to agent-browser's full command surface. Useful for commands without typed Korca handlers:

```bash
korca exec --command "set device \"iPhone 14\"" --json   # Emulate device
korca exec --command "set offline on" --json             # Toggle offline mode
korca exec --command "set media dark" --json             # Emulate color scheme
korca exec --command "network requests" --json           # View tracked network requests
korca exec --command "help" --json                       # See all available commands
```

**Important:** Do not use `korca exec --command "tab ..."` for tab management. Use `korca tab list/create/close/switch` instead — those operate at the Korca level and keep the UI synchronized.

### `fill` vs `type`

- **`fill`** targets a specific element by ref, clears its value first, then enters text. Use for form fields.
- **`type`** types at whatever currently has focus. Use for search boxes or after clicking into an input.

If neither works on a custom input component, try:

```bash
korca focus --element @e1 --json
korca exec --command "keyboard inserttext \"text\"" --json   # bypasses key events
```

### Browser Error Codes

| Error Code              | Meaning                                      | Recovery                                                                                     |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `browser_no_tab`        | No browser tab is open in this worktree      | Open a tab, or use `--worktree all` to check other worktrees                                 |
| `browser_stale_ref`     | Ref is invalid (page changed since snapshot) | Run `korca snapshot` to get fresh refs                                                        |
| `browser_tab_not_found` | Tab index does not exist                     | Run `korca tab list` to see available tabs                                                    |
| `browser_error`         | Error from the browser automation engine     | Read the message for details; common causes: element not found, navigation timeout, JS error |

### Browser Worked Example

Agent fills a login form and verifies the dashboard loads:

```bash
# Navigate to the login page
korca goto --url https://app.example.com/login --json

# See what's on the page
korca snapshot --json
# Output includes:
#   [@e1] text input "Email"
#   [@e2] text input "Password"
#   [@e3] button "Sign In"

# Fill the form
korca fill --element @e1 --value "user@example.com" --json
korca fill --element @e2 --value "s3cret" --json

# Submit
korca click --element @e3 --json

# Verify the dashboard loaded
korca snapshot --json
# Output should show dashboard content, not the login form
```

### Browser Troubleshooting

**"Ref not found" / `browser_stale_ref`**
Page changed since the snapshot. Run `korca snapshot --json` again, then use the new refs.

**Element exists but not in snapshot**
It may be off-screen or not yet rendered. Try:

```bash
korca scroll --direction down --amount 1000 --json
korca snapshot --json
# or wait for it:
korca wait --text "..." --json
korca snapshot --json
```

**Click does nothing / overlay swallows the click**
Modals or cookie banners may be blocking. Snapshot, find the dismiss button, click it, then re-snapshot.

**Fill/type doesn't work on a custom input**
Some components intercept key events. Use `keyboard inserttext`:

```bash
korca focus --element @e1 --json
korca exec --command "keyboard inserttext \"text\"" --json
```

**`browser_no_tab` error**
No browser tab is open in the current worktree. Open one with `korca tab create --url <url> --json`.

### Auto-Switch Worktree

Browser commands automatically activate the target worktree in the Korca UI when needed. If the agent issues a browser command targeting a worktree that isn't currently active, Korca will switch to that worktree before executing the command.

### Tab Create Auto-Activation

When `korca tab create` opens a new tab, it is automatically set as the active tab for the worktree. Subsequent commands (`snapshot`, `click`, etc.) will target the newly created tab without needing an explicit `tab switch`.

### Browser Agent Guidance

- Always snapshot before interacting with elements.
- After navigation (`goto`, `back`, `reload`, clicking a link), re-snapshot to get fresh refs.
- After switching tabs, re-snapshot.
- If you get `browser_stale_ref`, re-snapshot and retry with the new refs.
- Use `korca tab list` before `korca tab switch` to know which tabs exist.
- For concurrent browser workflows, prefer `korca tab list --json` and reuse `tabs[].browserPageId` with `--page` on later commands.
- Use `korca wait` to synchronize after actions that trigger async updates (form submits, SPA navigation, modals) instead of arbitrary sleeps.
- Use `korca eval` as an escape hatch for interactions not covered by other commands.
- Use `korca exec --command "help"` to discover extended commands.
- Worktree scoping is automatic — you'll only see tabs from your worktree by default.
- Bare browser commands without `--page` still target the current worktree's active tab, which is convenient but less robust for multi-process automation.
- Tab creation auto-activates the new tab — no need for `tab switch` after `tab create`.
- Browser commands auto-switch the active worktree if needed — no manual worktree activation required.

## Important Constraints

- Korca CLI only talks to a running Korca editor.
- Terminal handles are ephemeral and tied to the current Korca runtime. If Korca restarts, handles change.
- `terminal wait` supports `--for exit` (wait for process exit) and `--for tui-idle` (wait for a recognized agent CLI like Claude Code, Gemini, or Codex to finish its current task, detected via OSC title transitions). `tui-idle` defaults to a 5-minute timeout if `--timeout-ms` is not specified. Real coding tasks routinely take 15-60 minutes — always pass `--timeout-ms` explicitly.
- Korca is the source of truth for worktree/terminal state; do not duplicate that state with manual assumptions.
- The public `korca` command (`korca-ide` on Linux) is the interface users experience. Agents should validate and use that surface, not repo-local implementation entrypoints.
- The default bounded `terminal read` preview is for status monitoring. For retained transcript extraction, use `terminal read --json` with `oldestCursor`/`nextCursor`, `--cursor`, and `--limit`.

## References

See these docs in this repo when behavior is unclear:

- `docs/korca-cli-focused-v1-status.md`
- `docs/korca-cli-v1-spec.md`
- `docs/korca-runtime-layer-design.md`
