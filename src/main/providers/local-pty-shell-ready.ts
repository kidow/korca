/* eslint-disable max-lines -- Why: this module owns both shell wrapper file
   generation and the matching startup-command readiness scanner; splitting
   them would make the wrapper/marker contract harder to audit. */
/**
 * Shell-ready startup command support for local PTYs.
 *
 * Why: when Korca needs to inject a startup command (e.g. issue command runner),
 * it must wait until the shell has fully initialized before writing. This module
 * provides shell wrapper rcfiles that emit an OSC 777 marker after startup,
 * and a data scanner that detects that marker so the command can be written at
 * the right time.
 */
import { tmpdir } from 'os'
import { basename, win32 as pathWin32 } from 'path'
import { mkdirSync, writeFileSync, chmodSync, existsSync } from 'fs'
import { app } from 'electron'
import type * as pty from 'node-pty'
import {
  encodePowerShellCommand,
  getPowerShellOsc133Bootstrap,
  isPowerShellExecutableName
} from '../powershell-osc133-bootstrap'
import { getPosixOmpShellWrapper } from '../pty/omp-shell-wrapper'
import { getZshEnvTemplate } from '../shell-templates'

let didEnsureShellReadyWrappers = false

const STARTUP_COMMAND_READY_MAX_WAIT_MS = 1500
const SHELL_READY_MARKER = '\x1b]777;korca-shell-ready'
const SHELL_READY_MARKER_ESCAPED = '\\033]777;korca-shell-ready\\007'

// ── OSC 777 shell-ready scanner ─────────────────────────────────────

export type ShellReadyScanState = {
  matchPos: number
  heldBytes: string
}

export function createShellReadyScanState(): ShellReadyScanState {
  return { matchPos: 0, heldBytes: '' }
}

export function scanForShellReady(
  state: ShellReadyScanState,
  data: string
): { output: string; matched: boolean } {
  let output = ''

  for (let i = 0; i < data.length; i += 1) {
    const ch = data[i] as string
    if (state.matchPos < SHELL_READY_MARKER.length) {
      if (ch === SHELL_READY_MARKER[state.matchPos]) {
        state.heldBytes += ch
        state.matchPos += 1
      } else {
        output += state.heldBytes
        state.heldBytes = ''
        state.matchPos = 0
        if (ch === SHELL_READY_MARKER[0]) {
          state.heldBytes = ch
          state.matchPos = 1
        } else {
          output += ch
        }
      }
    } else if (ch === '\x07') {
      const remaining = data.slice(i + 1)
      state.heldBytes = ''
      state.matchPos = 0
      return { output: output + remaining, matched: true }
    } else {
      state.heldBytes += ch
    }
  }

  return { output, matched: false }
}

// ── Shell wrapper files ─────────────────────────────────────────────

function getShellReadyWrapperRoot(): string {
  const userDataPath = app?.getPath?.('userData') ?? process.env.KORCA_USER_DATA_PATH ?? tmpdir()
  return `${userDataPath}/shell-ready`
}

function getRequiredShellReadyWrapperPaths(root = getShellReadyWrapperRoot()): string[] {
  return [
    `${root}/zsh/.zshenv`,
    `${root}/zsh/.zprofile`,
    `${root}/zsh/.zshrc`,
    `${root}/zsh/.zlogin`,
    `${root}/bash/rcfile`
  ]
}

function shellReadyWrappersExist(): boolean {
  return getRequiredShellReadyWrapperPaths().every((path) => existsSync(path))
}

// Why: if our own process inherited ZDOTDIR from a parent shell that was
// itself an Korca PTY (e.g. the user launched `pn dev` from a terminal inside
// a running Korca), that ZDOTDIR points at an Korca shell-ready wrapper dir.
// Propagating it as the new PTY's KORCA_ORIG_ZDOTDIR makes the wrapper's
// `source "$KORCA_ORIG_ZDOTDIR/.zshenv"` line source itself recursively —
// zsh gives "job table full or recursion limit exceeded" and the shell
// never reaches a usable prompt.
//
// Any path component ending in `/shell-ready/zsh` is an Korca wrapper dir
// (regardless of whether it came from this app's userData, a packaged Korca,
// or a different dev build). Treat it as if ZDOTDIR were unset so the caller
// falls back to HOME for the user's real config root.
function normalizeOriginalZdotdirCandidate(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  // Why: tolerate trailing slashes — some shell startup scripts export
  // `ZDOTDIR="$dir/"`, and without normalization the suffix check would
  // miss the self-loop path and restore the recursion bug. Also collapses
  // a pathological `ZDOTDIR=/` to empty so we fall back to HOME rather than
  // sourcing `/.zshenv` (which is never the user's real config).
  const normalized = value.replace(/\/+$/, '')
  if (!normalized || normalized.endsWith('/shell-ready/zsh')) {
    return null
  }
  return value
}

function resolveOriginalZdotdir(): string {
  return (
    normalizeOriginalZdotdirCandidate(process.env.ZDOTDIR) ||
    normalizeOriginalZdotdirCandidate(process.env.KORCA_ORIG_ZDOTDIR) ||
    process.env.HOME ||
    ''
  )
}

function resolveOriginalZshenvSourceDir(): string {
  return normalizeOriginalZdotdirCandidate(process.env.ZDOTDIR) || process.env.HOME || ''
}

export function getBashShellReadyRcfileContent(): string {
  return `# Korca bash shell-ready wrapper
[[ -f /etc/profile ]] && source /etc/profile
if [[ -f "$HOME/.bash_profile" ]]; then
  source "$HOME/.bash_profile"
elif [[ -f "$HOME/.bash_login" ]]; then
  source "$HOME/.bash_login"
elif [[ -f "$HOME/.profile" ]]; then
  source "$HOME/.profile"
fi
# Why: preserve bash's normal login-shell contract. Many users already source
# ~/.bashrc from ~/.bash_profile; forcing ~/.bashrc again here would duplicate
# PATH edits, hooks, and prompt init in Korca startup-command shells.
__korca_restore_attribution_path() {
  [[ -n "\${KORCA_ATTRIBUTION_SHIM_DIR:-}" ]] || return 0
  case "$PATH" in
    "\${KORCA_ATTRIBUTION_SHIM_DIR}"|"\${KORCA_ATTRIBUTION_SHIM_DIR}:"*) return 0 ;;
  esac
  export PATH="\${KORCA_ATTRIBUTION_SHIM_DIR}:$PATH"
}
__korca_restore_attribution_path
# Why: user startup files may set the default OpenCode config after Korca's
# spawn env; restore the PTY-scoped overlay before the first prompt.
[[ -n "\${KORCA_OPENCODE_CONFIG_DIR:-}" ]] && export OPENCODE_CONFIG_DIR="\${KORCA_OPENCODE_CONFIG_DIR}"
# Why: bare shells carry both Pi and OMP shadows so a later typed OMP can
# switch on demand. Keep Pi as the shell default unless this PTY is OMP-only.
[[ -n "\${KORCA_PI_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_PI_CODING_AGENT_DIR}"
if [[ -z "\${KORCA_PI_CODING_AGENT_DIR:-}" && -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]]; then
  export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"
fi
${getPosixOmpShellWrapper()}
# Why: Codex must keep using Korca's runtime CODEX_HOME after profile scripts.
[[ -n "\${KORCA_CODEX_HOME:-}" ]] && export CODEX_HOME="\${KORCA_CODEX_HOME}"
# Why: emit OSC 133 C/D so terminal-command-lifecycle can drop stale agent
# status when the foreground command (e.g. an interrupted Claude/Codex CLI)
# exits — mirrors the zsh wrapper. Without this, bash users (default on most
# Linux distros) keep a stuck 'working' spinner for up to 30 min after the
# CLI exits without sending a Stop/SessionEnd hook.
__korca_osc133_precmd() {
  local exit_code=$?
  __korca_in_prompt_command=1
  if [[ -n "\${__korca_in_command:-}" ]]; then
    printf "\\033]133;D;%s\\007" "$exit_code"
    unset __korca_in_command
  fi
  printf "\\033]133;A\\007"
}
__korca_osc133_prompt_done() {
  unset __korca_in_prompt_command
}
__korca_run_user_debug_trap() {
  if [[ -n "\${__korca_user_debug_trap:-}" ]]; then
    eval "$__korca_user_debug_trap" || true
  fi
}
__korca_osc133_preexec() {
  __korca_run_user_debug_trap
  [[ -z "\${__korca_in_prompt_command:-}" ]] || return
  # Why: bash DEBUG fires for every simple command, including PROMPT_COMMAND
  # bodies. Skip our own prompt-time helpers so they don't mark the shell as
  # "in command" before the prompt has even drawn.
  case "$BASH_COMMAND" in
    *__korca_osc133_precmd*|*__korca_osc133_prompt_done*|*__korca_prompt_mark*) return ;;
  esac
  printf "\\033]133;C\\007"
  __korca_in_command=1
}
# Why: prepend so we capture $? before the user's PROMPT_COMMAND chain mutates it.
__korca_normalize_prompt_command() {
  local __korca_joined="" __korca_prompt_part
  if [[ "$(declare -p PROMPT_COMMAND 2>/dev/null)" == "declare -a"* ]]; then
    for __korca_prompt_part in "\${PROMPT_COMMAND[@]}"; do
      [[ -n "$__korca_prompt_part" ]] || continue
      if [[ -n "$__korca_joined" ]]; then
        __korca_joined="$__korca_joined;$__korca_prompt_part"
      else
        __korca_joined="$__korca_prompt_part"
      fi
    done
    PROMPT_COMMAND="$__korca_joined"
  fi
}
__korca_prepend_prompt_command() {
  __korca_normalize_prompt_command
  PROMPT_COMMAND="__korca_osc133_precmd\${PROMPT_COMMAND:+;\${PROMPT_COMMAND}}"
}
__korca_append_prompt_command() {
  local command="$1"
  __korca_normalize_prompt_command
  if [[ -n "\${PROMPT_COMMAND:-}" ]]; then
    PROMPT_COMMAND="\${PROMPT_COMMAND};$command"
  else
    PROMPT_COMMAND="$command"
  fi
}
__korca_prepend_prompt_command
# Why: append the marker through PROMPT_COMMAND so it fires after the login
# startup files have rebuilt the prompt, without re-running user rc files.
if [[ "\${KORCA_SHELL_READY_MARKER:-0}" == "1" ]]; then
  __korca_prompt_mark() {
    printf "${SHELL_READY_MARKER_ESCAPED}"
  }
  __korca_append_prompt_command "__korca_prompt_mark"
fi
__korca_append_prompt_command "__korca_osc133_prompt_done"
__korca_debug_trap_spec="$(trap -p DEBUG)"
if [[ -n "$__korca_debug_trap_spec" ]]; then
  __korca_debug_trap_command="\${__korca_debug_trap_spec#trap -- }"
  __korca_debug_trap_command="\${__korca_debug_trap_command% DEBUG}"
  eval "__korca_user_debug_trap=$__korca_debug_trap_command"
fi
unset __korca_debug_trap_spec __korca_debug_trap_command
unset -f __korca_normalize_prompt_command __korca_prepend_prompt_command __korca_append_prompt_command
# Why: arm DEBUG after wrapper setup; otherwise bash treats our own rcfile
# commands as a foreground command and emits a fake C/D before the first prompt.
trap '__korca_osc133_preexec' DEBUG
`
}

export function getZshShellReadyRcfileContent(): string {
  return `# Korca zsh shell-ready wrapper
_korca_home="\${KORCA_ORIG_ZDOTDIR:-$HOME}"
if [[ "$_korca_home" != "$ZDOTDIR" && -o interactive && -f "$_korca_home/.zshrc" ]]; then
  source "$_korca_home/.zshrc"
fi
__korca_restore_attribution_path() {
  [[ -n "\${KORCA_ATTRIBUTION_SHIM_DIR:-}" ]] || return 0
  case "$PATH" in
    "\${KORCA_ATTRIBUTION_SHIM_DIR}"|"\${KORCA_ATTRIBUTION_SHIM_DIR}:"*) return 0 ;;
  esac
  export PATH="\${KORCA_ATTRIBUTION_SHIM_DIR}:$PATH"
}
[[ ! -o login ]] && __korca_restore_attribution_path
if [[ ! -o login ]]; then
  # Why: ~/.zshrc can export the user's default OpenCode config after spawn.
  [[ -n "\${KORCA_OPENCODE_CONFIG_DIR:-}" ]] && export OPENCODE_CONFIG_DIR="\${KORCA_OPENCODE_CONFIG_DIR}"
  # Why: bare shells carry both Pi and OMP shadows; keep Pi as the default and
  # let the OMP wrapper switch to OMP only for that command.
  [[ -n "\${KORCA_PI_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_PI_CODING_AGENT_DIR}"
  if [[ -z "\${KORCA_PI_CODING_AGENT_DIR:-}" && -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]]; then
    export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"
  fi
  ${getPosixOmpShellWrapper()}
  # Why: Codex must keep using Korca's runtime CODEX_HOME after rc files.
  [[ -n "\${KORCA_CODEX_HOME:-}" ]] && export CODEX_HOME="\${KORCA_CODEX_HOME}"
fi
__korca_osc133_precmd() {
  local exit_code=$?
  if [[ -n "\${__korca_in_command:-}" ]]; then
    printf "\\033]133;D;%s\\007" "$exit_code"
    unset __korca_in_command
  fi
  printf "\\033]133;A\\007"
}
__korca_osc133_preexec() {
  printf "\\033]133;C\\007"
  __korca_in_command=1
}
# Why: prepend so Korca captures $? before user prompt hooks can overwrite it.
precmd_functions=(__korca_osc133_precmd \${precmd_functions[@]})
preexec_functions=(__korca_osc133_preexec \${preexec_functions[@]})
`
}

function ensureShellReadyWrappers(): void {
  if (process.platform === 'win32') {
    return
  }
  if (didEnsureShellReadyWrappers && shellReadyWrappersExist()) {
    return
  }
  didEnsureShellReadyWrappers = true

  const root = getShellReadyWrapperRoot()
  const zshDir = `${root}/zsh`
  const bashDir = `${root}/bash`

  const zshEnv = getZshEnvTemplate(zshDir)
  const zshProfile = `# Korca zsh shell-ready wrapper
_korca_home="\${KORCA_ORIG_ZDOTDIR:-$HOME}"
case "\${_korca_home%/}" in
  */shell-ready/zsh) _korca_home="$HOME" ;;
esac
[[ -f "$_korca_home/.zprofile" ]] && source "$_korca_home/.zprofile"
`
  const zshRc = getZshShellReadyRcfileContent()
  const zshLogin = `# Korca zsh shell-ready wrapper
_korca_home="\${KORCA_ORIG_ZDOTDIR:-$HOME}"
case "\${_korca_home%/}" in
  */shell-ready/zsh) _korca_home="$HOME" ;;
esac
if [[ -o interactive && -f "$_korca_home/.zlogin" ]]; then
  source "$_korca_home/.zlogin"
fi
__korca_restore_attribution_path() {
  [[ -n "\${KORCA_ATTRIBUTION_SHIM_DIR:-}" ]] || return 0
  case "$PATH" in
    "\${KORCA_ATTRIBUTION_SHIM_DIR}"|"\${KORCA_ATTRIBUTION_SHIM_DIR}:"*) return 0 ;;
  esac
  export PATH="\${KORCA_ATTRIBUTION_SHIM_DIR}:$PATH"
}
__korca_restore_attribution_path
# Why: .zlogin is the final login startup file before the prompt is shown.
[[ -n "\${KORCA_OPENCODE_CONFIG_DIR:-}" ]] && export OPENCODE_CONFIG_DIR="\${KORCA_OPENCODE_CONFIG_DIR}"
[[ -n "\${KORCA_PI_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_PI_CODING_AGENT_DIR}"
if [[ -z "\${KORCA_PI_CODING_AGENT_DIR:-}" && -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]]; then
  export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"
fi
${getPosixOmpShellWrapper()}
[[ -n "\${KORCA_CODEX_HOME:-}" ]] && export CODEX_HOME="\${KORCA_CODEX_HOME}"
# Why: zsh precmd runs before the prompt is drawn and before zle owns input,
# which can double-echo startup commands. line-init fires when zle is ready.
if [[ "\${KORCA_SHELL_READY_MARKER:-0}" == "1" ]]; then
  __korca_prompt_mark() {
    printf "${SHELL_READY_MARKER_ESCAPED}"
  }
  autoload -Uz add-zle-hook-widget
  zle -N __korca_prompt_mark
  add-zle-hook-widget line-init __korca_prompt_mark
fi
`
  const bashRc = getBashShellReadyRcfileContent()

  const files = [
    [`${zshDir}/.zshenv`, zshEnv],
    [`${zshDir}/.zprofile`, zshProfile],
    [`${zshDir}/.zshrc`, zshRc],
    [`${zshDir}/.zlogin`, zshLogin],
    [`${bashDir}/rcfile`, bashRc]
  ] as const

  try {
    for (const [path, content] of files) {
      const dir = path.slice(0, path.lastIndexOf('/'))
      mkdirSync(dir, { recursive: true })
      writeFileSync(path, content, 'utf8')
      chmodSync(path, 0o644)
    }
  } catch (error) {
    // Why: wrapper file creation can fail due to read-only filesystems, permission
    // issues, or disk space. Rather than crashing, log the error and continue.
    // The shell will launch without the wrapper, which means no shell-ready marker
    // but at least the PTY is usable.
    const errorMessage =
      error instanceof Error
        ? `${error.message} (${(error as NodeJS.ErrnoException).code || 'unknown'})`
        : String(error)
    console.error(`[shell-ready] Failed to create wrapper files in ${root}: ${errorMessage}`)
    console.error('[shell-ready] Shell will launch without wrapper (no shell-ready marker)')
    // Reset the flag so next attempt will try again
    didEnsureShellReadyWrappers = false
  }
}

// ── Shell launch config ─────────────────────────────────────────────

export type ShellReadyLaunchConfig = {
  args: string[] | null
  env: Record<string, string>
  supportsReadyMarker: boolean
}

function getWrappedShellLaunchConfig(
  shellPath: string,
  options: { emitReadyMarker: boolean }
): ShellReadyLaunchConfig {
  const shellName = pathWin32.basename(basename(shellPath)).toLowerCase()

  if (shellName === 'zsh') {
    ensureShellReadyWrappers()
    return {
      args: ['-l'],
      env: {
        KORCA_ORIG_ZDOTDIR: resolveOriginalZdotdir(),
        KORCA_ZSHENV_SOURCE_DIR: resolveOriginalZshenvSourceDir(),
        ZDOTDIR: `${getShellReadyWrapperRoot()}/zsh`,
        KORCA_SHELL_READY_MARKER: options.emitReadyMarker ? '1' : '0'
      },
      supportsReadyMarker: options.emitReadyMarker
    }
  }

  if (shellName === 'bash') {
    ensureShellReadyWrappers()
    return {
      args: ['--rcfile', `${getShellReadyWrapperRoot()}/bash/rcfile`],
      env: {
        KORCA_SHELL_READY_MARKER: options.emitReadyMarker ? '1' : '0'
      },
      supportsReadyMarker: options.emitReadyMarker
    }
  }

  if (isPowerShellExecutableName(shellName)) {
    return {
      args: [
        '-NoLogo',
        '-NoExit',
        '-EncodedCommand',
        encodePowerShellCommand(getPowerShellOsc133Bootstrap())
      ],
      env: {},
      supportsReadyMarker: false
    }
  }

  return {
    args: null,
    env: {},
    supportsReadyMarker: false
  }
}

export function getShellReadyLaunchConfig(shellPath: string): ShellReadyLaunchConfig {
  return getWrappedShellLaunchConfig(shellPath, { emitReadyMarker: true })
}

export function getAttributionShellLaunchConfig(shellPath: string): ShellReadyLaunchConfig {
  return getWrappedShellLaunchConfig(shellPath, { emitReadyMarker: false })
}

// ── Startup command writer ──────────────────────────────────────────

export function writeStartupCommandWhenShellReady(
  readyPromise: Promise<void>,
  proc: pty.IPty,
  startupCommand: string,
  onExit: (cleanup: () => void) => void
): void {
  let sent = false
  let postReadyTimer: ReturnType<typeof setTimeout> | null = null
  let postReadyDataDisposable: { dispose: () => void } | null = null

  const cleanup = (): void => {
    sent = true
    if (postReadyTimer !== null) {
      clearTimeout(postReadyTimer)
      postReadyTimer = null
    }
    postReadyDataDisposable?.dispose()
    postReadyDataDisposable = null
  }

  const flush = (): void => {
    if (sent) {
      return
    }
    sent = true
    postReadyDataDisposable?.dispose()
    postReadyDataDisposable = null
    if (postReadyTimer !== null) {
      clearTimeout(postReadyTimer)
      postReadyTimer = null
    }
    // Why: run startup commands inside the same interactive shell Korca keeps
    // open for the pane. Spawning `shell -c <command>; exec shell -l` would
    // avoid the race, but it would also replace the session after the agent
    // exits and break "stay in this terminal" workflows.
    // Why CR on Windows: PowerShell's PSReadLine and cmd.exe submit the line
    // on CR (`\r`) — a bare LF leaves the command typed at the prompt but
    // unsubmitted, forcing the user to press Enter after Korca launches the
    // agent or setup script. POSIX shells (bash/zsh) treat either CR or LF as
    // Enter under ICRNL, so CR works there too, but this code path is reached
    // on Windows as well as POSIX via writeStartupCommandWhenShellReady.
    const submit = process.platform === 'win32' ? '\r' : '\n'
    const endsWithSubmit = startupCommand.endsWith('\r') || startupCommand.endsWith('\n')
    const payload = endsWithSubmit ? startupCommand : `${startupCommand}${submit}`
    // Why: startup commands are usually long, quoted agent launches. Writing
    // them in one PTY call after the shell-ready barrier avoids the incremental
    // paste behavior that still dropped characters in practice.
    proc.write(payload)
  }

  readyPromise.then(() => {
    if (sent) {
      return
    }
    // Why: the shell-ready marker fires from precmd/PROMPT_COMMAND,
    // before the prompt is drawn and before zle/readline switches the PTY into
    // raw mode. Writing the command while the kernel still has ECHO enabled
    // causes the characters to be echoed once by the kernel and then redisplayed
    // by the line editor after the prompt — producing a visible duplicate.
    //
    // Strategy: wait for the next PTY data event after the ready marker. That
    // data is the shell drawing its prompt, which means the shell is about to
    // (or has already) switched to raw mode. A brief follow-up delay covers the
    // gap between the last prompt write() and the tcsetattr() that enables raw
    // mode. The 50ms fallback timeout handles the case where the prompt data
    // arrived in the same chunk as the ready marker (no subsequent onData).
    postReadyDataDisposable = proc.onData(() => {
      postReadyDataDisposable?.dispose()
      postReadyDataDisposable = null
      if (postReadyTimer !== null) {
        clearTimeout(postReadyTimer)
      }
      postReadyTimer = setTimeout(flush, 30)
    })
    postReadyTimer = setTimeout(() => {
      postReadyDataDisposable?.dispose()
      postReadyDataDisposable = null
      postReadyTimer = null
      flush()
    }, 50)
  })
  onExit(cleanup)
}

export { STARTUP_COMMAND_READY_MAX_WAIT_MS }
