/* eslint-disable max-lines -- Why: this module owns the daemon-side shell
   wrapper generation for zsh, bash, and PowerShell plus the launch-config
   plumbing; keeping them together lets the wrapper/marker contract be
   reviewed as a unit (mirrors src/main/providers/local-pty-shell-ready.ts). */
import { tmpdir } from 'os'
import { basename, dirname, join, win32 as pathWin32 } from 'path'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import {
  encodePowerShellCommand,
  getPowerShellOsc133Bootstrap,
  isPowerShellExecutableName
} from '../powershell-osc133-bootstrap'
import { getPosixOmpShellWrapper } from '../pty/omp-shell-wrapper'
import { getZshEnvTemplate } from '../shell-templates'

const KORCA_USER_DATA_PATH_ENV = 'KORCA_USER_DATA_PATH'
const SHELL_READY_MARKER = '\\033]777;korca-shell-ready\\007'

let didEnsureShellReadyWrappers = false

function getShellReadyWrapperRoot(): string {
  const userDataPath = process.env[KORCA_USER_DATA_PATH_ENV]
  // Why: older/test launchers may not seed KORCA_USER_DATA_PATH. Keep a
  // fallback so daemon startup does not fail before the parent can be fixed.
  return join(userDataPath || tmpdir(), userDataPath ? 'shell-ready' : 'korca-shell-ready')
}

// Why: if our own process inherited ZDOTDIR from a parent shell that was
// itself an Korca PTY (e.g. the user launched Korca from a terminal inside a
// running Korca), that ZDOTDIR points at an Korca shell-ready wrapper dir.
// Propagating it as the new PTY's KORCA_ORIG_ZDOTDIR makes the wrapper's
// `source "$KORCA_ORIG_ZDOTDIR/.zshenv"` line source itself recursively —
// zsh gives "job table full or recursion limit exceeded" and the shell
// never reaches a usable prompt.
//
// Any path component ending in `/shell-ready/zsh` is an Korca wrapper dir
// (regardless of whether it came from this daemon's userData, a packaged
// Korca, or a different dev build). Treat it as if ZDOTDIR were unset so the
// caller falls back to HOME for the user's real config root.
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

function getRequiredShellReadyWrapperPaths(root = getShellReadyWrapperRoot()): string[] {
  return [
    join(root, 'zsh', '.zshenv'),
    join(root, 'zsh', '.zprofile'),
    join(root, 'zsh', '.zshrc'),
    join(root, 'zsh', '.zlogin'),
    join(root, 'bash', 'rcfile')
  ]
}

function shellReadyWrappersExist(): boolean {
  return getRequiredShellReadyWrapperPaths().every((path) => existsSync(path))
}

export function getDaemonBashShellReadyRcfileContent(): string {
  return `# Korca daemon bash shell-ready wrapper
[[ -f /etc/profile ]] && source /etc/profile
if [[ -f "$HOME/.bash_profile" ]]; then
  source "$HOME/.bash_profile"
elif [[ -f "$HOME/.bash_login" ]]; then
  source "$HOME/.bash_login"
elif [[ -f "$HOME/.profile" ]]; then
  source "$HOME/.profile"
fi
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
# status when the foreground command exits — mirrors the zsh daemon wrapper.
# Without this, bash users (default on most Linux distros) keep a stuck
# 'working' spinner after the CLI exits without a Stop/SessionEnd hook.
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
if [[ "\${KORCA_SHELL_READY_MARKER:-0}" == "1" ]]; then
  __korca_prompt_mark() {
    printf "${SHELL_READY_MARKER}"
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

export function getDaemonZshShellReadyRcfileContent(): string {
  return `# Korca daemon zsh shell-ready wrapper
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
  const zshDir = join(root, 'zsh')
  const bashDir = join(root, 'bash')

  const zshEnv = getZshEnvTemplate(zshDir, 'daemon')
  const zshProfile = `# Korca daemon zsh shell-ready wrapper
_korca_home="\${KORCA_ORIG_ZDOTDIR:-$HOME}"
case "\${_korca_home%/}" in
  */shell-ready/zsh) _korca_home="$HOME" ;;
esac
[[ -f "$_korca_home/.zprofile" ]] && source "$_korca_home/.zprofile"
`
  const zshRc = getDaemonZshShellReadyRcfileContent()
  const zshLogin = `# Korca daemon zsh shell-ready wrapper
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
if [[ "\${KORCA_SHELL_READY_MARKER:-0}" == "1" ]]; then
  __korca_prompt_mark() {
    printf "${SHELL_READY_MARKER}"
  }
  # Why: zsh precmd fires before zle switches the PTY into line-editing mode,
  # so writing startup input there can be echoed once outside the prompt.
  autoload -Uz add-zle-hook-widget
  zle -N __korca_prompt_mark
  add-zle-hook-widget line-init __korca_prompt_mark
fi
`
  const bashRc = getDaemonBashShellReadyRcfileContent()

  const files = [
    [join(zshDir, '.zshenv'), zshEnv],
    [join(zshDir, '.zprofile'), zshProfile],
    [join(zshDir, '.zshrc'), zshRc],
    [join(zshDir, '.zlogin'), zshLogin],
    [join(bashDir, 'rcfile'), bashRc]
  ] as const

  try {
    for (const [path, content] of files) {
      mkdirSync(dirname(path), { recursive: true })
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
    console.error(`[daemon/shell-ready] Failed to create wrapper files in ${root}: ${errorMessage}`)
    console.error('[daemon/shell-ready] Shell will launch without wrapper (no shell-ready marker)')
    // Reset the flag so next attempt will try again
    didEnsureShellReadyWrappers = false
  }
}

export function resolvePtyShellPath(env: Record<string, string>): string {
  if (process.platform === 'win32') {
    return env.KORCA_TERMINAL_WINDOWS_SHELL || 'powershell.exe'
  }
  return env.SHELL || process.env.SHELL || '/bin/zsh'
}

export function supportsPtyStartupBarrier(env: Record<string, string>): boolean {
  if (process.platform === 'win32') {
    return false
  }
  const resolvedShell = resolvePtyShellPath(env)
  const shellName = pathWin32.basename(basename(resolvedShell)).toLowerCase()
  return shellName === 'zsh' || shellName === 'bash'
}

type ShellLaunchConfig = {
  args: string[] | null
  env: Record<string, string>
  supportsReadyMarker: boolean
}

function getWrappedShellLaunchConfig(
  shellPath: string,
  options: { emitReadyMarker: boolean }
): ShellLaunchConfig {
  const shellName = pathWin32.basename(basename(shellPath)).toLowerCase()

  if (shellName === 'zsh') {
    ensureShellReadyWrappers()
    const root = getShellReadyWrapperRoot()
    return {
      args: ['-l'],
      env: {
        KORCA_ORIG_ZDOTDIR: resolveOriginalZdotdir(),
        KORCA_ZSHENV_SOURCE_DIR: resolveOriginalZshenvSourceDir(),
        ZDOTDIR: join(root, 'zsh'),
        KORCA_SHELL_READY_MARKER: options.emitReadyMarker ? '1' : '0'
      },
      supportsReadyMarker: options.emitReadyMarker
    }
  }

  if (shellName === 'bash') {
    ensureShellReadyWrappers()
    const root = getShellReadyWrapperRoot()
    return {
      args: ['--rcfile', join(root, 'bash', 'rcfile')],
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

export function getShellReadyLaunchConfig(shellPath: string): ShellLaunchConfig {
  return getWrappedShellLaunchConfig(shellPath, { emitReadyMarker: true })
}

export function getAttributionShellLaunchConfig(shellPath: string): ShellLaunchConfig {
  return getWrappedShellLaunchConfig(shellPath, { emitReadyMarker: false })
}
