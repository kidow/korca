import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { basename, dirname, join } from 'path'
import { getPosixOmpShellWrapper } from '../main/pty/omp-shell-wrapper'

const RELAY_SHELL_READY_DIR = '.korca-relay/shell-ready'
const POSIX_LOGIN_ARGS = ['-l']

export type RelayShellLaunchConfig = {
  args: string[]
  env: Record<string, string>
}

function quotePosixSingle(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function hasOverlayRestoreEnv(env: Record<string, string>): boolean {
  return Boolean(
    env.KORCA_OPENCODE_CONFIG_DIR ||
    env.KORCA_PI_CODING_AGENT_DIR ||
    env.KORCA_OMP_CODING_AGENT_DIR ||
    env.KORCA_REMOTE_CLI_BIN_DIR
  )
}

function getWrapperRoot(env: Record<string, string>): string {
  return join(env.HOME || process.env.HOME || homedir(), RELAY_SHELL_READY_DIR)
}

function normalizeOriginalZdotdirCandidate(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  const normalized = value.replace(/\/+$/, '')
  if (!normalized || normalized.endsWith('/shell-ready/zsh')) {
    return null
  }
  return value
}

function resolveOriginalZdotdir(env: Record<string, string>): string {
  return (
    normalizeOriginalZdotdirCandidate(env.ZDOTDIR) ||
    normalizeOriginalZdotdirCandidate(env.KORCA_ORIG_ZDOTDIR) ||
    env.HOME ||
    process.env.HOME ||
    ''
  )
}

function ensureOverlayRestoreWrappers(root: string): void {
  const zshDir = join(root, 'zsh')
  const bashDir = join(root, 'bash')

  const zshEnv = `# Korca relay zsh overlay wrapper
export KORCA_ORIG_ZDOTDIR="\${KORCA_ORIG_ZDOTDIR:-$HOME}"
case "\${KORCA_ORIG_ZDOTDIR%/}" in
  */shell-ready/zsh) export KORCA_ORIG_ZDOTDIR="$HOME" ;;
esac
[[ -f "$KORCA_ORIG_ZDOTDIR/.zshenv" ]] && source "$KORCA_ORIG_ZDOTDIR/.zshenv"
export KORCA_USER_ZDOTDIR="\${ZDOTDIR:-\${KORCA_ORIG_ZDOTDIR:-$HOME}}"
case "\${KORCA_USER_ZDOTDIR%/}" in
  */shell-ready/zsh) export KORCA_USER_ZDOTDIR="$HOME" ;;
esac
export ZDOTDIR=${quotePosixSingle(zshDir)}
`
  const zshProfile = `# Korca relay zsh overlay wrapper
_korca_home="\${KORCA_USER_ZDOTDIR:-\${KORCA_ORIG_ZDOTDIR:-$HOME}}"
case "\${_korca_home%/}" in
  */shell-ready/zsh) _korca_home="$HOME" ;;
esac
[[ -f "$_korca_home/.zprofile" ]] && source "$_korca_home/.zprofile"
`
  const zshRc = `# Korca relay zsh overlay wrapper
_korca_home="\${KORCA_USER_ZDOTDIR:-\${KORCA_ORIG_ZDOTDIR:-$HOME}}"
case "\${_korca_home%/}" in
  */shell-ready/zsh) _korca_home="$HOME" ;;
esac
if [[ -o interactive && -f "$_korca_home/.zshrc" ]]; then
  source "$_korca_home/.zshrc"
fi
if [[ ! -o login ]]; then
  # Why: remote startup files can re-export user defaults after relay spawn.
  [[ -n "\${KORCA_OPENCODE_CONFIG_DIR:-}" ]] && export OPENCODE_CONFIG_DIR="\${KORCA_OPENCODE_CONFIG_DIR}"
  [[ -n "\${KORCA_PI_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_PI_CODING_AGENT_DIR}"
  if [[ -z "\${KORCA_PI_CODING_AGENT_DIR:-}" && -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]]; then
    export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"
  fi
  [[ -n "\${KORCA_REMOTE_CLI_BIN_DIR:-}" ]] && case ":$PATH:" in *:"\${KORCA_REMOTE_CLI_BIN_DIR}":*) ;; *) export PATH="\${KORCA_REMOTE_CLI_BIN_DIR}:$PATH" ;; esac
  ${getPosixOmpShellWrapper()}
fi
`
  const zshLogin = `# Korca relay zsh overlay wrapper
_korca_home="\${KORCA_USER_ZDOTDIR:-\${KORCA_ORIG_ZDOTDIR:-$HOME}}"
case "\${_korca_home%/}" in
  */shell-ready/zsh) _korca_home="$HOME" ;;
esac
if [[ -o interactive && -f "$_korca_home/.zlogin" ]]; then
  source "$_korca_home/.zlogin"
fi
# Why: .zlogin is the final zsh login startup file before the prompt.
[[ -n "\${KORCA_OPENCODE_CONFIG_DIR:-}" ]] && export OPENCODE_CONFIG_DIR="\${KORCA_OPENCODE_CONFIG_DIR}"
[[ -n "\${KORCA_PI_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_PI_CODING_AGENT_DIR}"
if [[ -z "\${KORCA_PI_CODING_AGENT_DIR:-}" && -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]]; then
  export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"
fi
[[ -n "\${KORCA_REMOTE_CLI_BIN_DIR:-}" ]] && case ":$PATH:" in *:"\${KORCA_REMOTE_CLI_BIN_DIR}":*) ;; *) export PATH="\${KORCA_REMOTE_CLI_BIN_DIR}:$PATH" ;; esac
${getPosixOmpShellWrapper()}
`
  const bashRc = `# Korca relay bash overlay wrapper
[[ -f /etc/profile ]] && source /etc/profile
if [[ -f "$HOME/.bash_profile" ]]; then
  source "$HOME/.bash_profile"
elif [[ -f "$HOME/.bash_login" ]]; then
  source "$HOME/.bash_login"
elif [[ -f "$HOME/.profile" ]]; then
  source "$HOME/.profile"
fi
# Why: remote startup files can re-export user defaults after relay spawn.
[[ -n "\${KORCA_OPENCODE_CONFIG_DIR:-}" ]] && export OPENCODE_CONFIG_DIR="\${KORCA_OPENCODE_CONFIG_DIR}"
[[ -n "\${KORCA_PI_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_PI_CODING_AGENT_DIR}"
if [[ -z "\${KORCA_PI_CODING_AGENT_DIR:-}" && -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]]; then
  export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"
fi
[[ -n "\${KORCA_REMOTE_CLI_BIN_DIR:-}" ]] && case ":$PATH:" in *:"\${KORCA_REMOTE_CLI_BIN_DIR}":*) ;; *) export PATH="\${KORCA_REMOTE_CLI_BIN_DIR}:$PATH" ;; esac
${getPosixOmpShellWrapper()}
# Why: SSH bash sessions need the same command lifecycle markers as local
# bash so agent rows stop showing "working" when the foreground command exits.
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
  case "$BASH_COMMAND" in
    *__korca_osc133_precmd*|*__korca_osc133_prompt_done*) return ;;
  esac
  printf "\\033]133;C\\007"
  __korca_in_command=1
}
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
__korca_append_prompt_command "__korca_osc133_prompt_done"
__korca_debug_trap_spec="$(trap -p DEBUG)"
if [[ -n "$__korca_debug_trap_spec" ]]; then
  __korca_debug_trap_command="\${__korca_debug_trap_spec#trap -- }"
  __korca_debug_trap_command="\${__korca_debug_trap_command% DEBUG}"
  eval "__korca_user_debug_trap=$__korca_debug_trap_command"
fi
unset __korca_debug_trap_spec __korca_debug_trap_command
unset -f __korca_normalize_prompt_command __korca_prepend_prompt_command __korca_append_prompt_command
# Why: arm DEBUG after wrapper setup so the relay rcfile itself does not emit
# fake command-start/end markers before the first prompt.
trap '__korca_osc133_preexec' DEBUG
`

  const files = [
    [join(zshDir, '.zshenv'), zshEnv],
    [join(zshDir, '.zprofile'), zshProfile],
    [join(zshDir, '.zshrc'), zshRc],
    [join(zshDir, '.zlogin'), zshLogin],
    [join(bashDir, 'rcfile'), bashRc]
  ] as const

  for (const [path, content] of files) {
    mkdirSync(dirname(path), { recursive: true })
    let existing: string | null = null
    try {
      existing = readFileSync(path, 'utf8')
    } catch {
      existing = null
    }
    // Why: relay wrapper files persist under ~/.korca-relay across app
    // upgrades. Existence alone is not enough; stale wrappers would miss
    // later fixes such as preserving post-.zshenv ZDOTDIR.
    if (existing !== content) {
      writeFileSync(path, content, 'utf8')
    }
    chmodSync(path, 0o644)
  }
}

export function getRelayShellLaunchConfig(
  shellPath: string,
  env: Record<string, string>
): RelayShellLaunchConfig {
  if (process.platform === 'win32') {
    return { args: POSIX_LOGIN_ARGS, env: {} }
  }

  const shellName = basename(shellPath).toLowerCase()
  if (shellName !== 'zsh' && shellName !== 'bash') {
    return { args: POSIX_LOGIN_ARGS, env: {} }
  }
  if (shellName === 'zsh' && !hasOverlayRestoreEnv(env)) {
    return { args: POSIX_LOGIN_ARGS, env: {} }
  }

  const root = getWrapperRoot(env)
  ensureOverlayRestoreWrappers(root)

  if (shellName === 'zsh') {
    return {
      args: POSIX_LOGIN_ARGS,
      env: {
        KORCA_ORIG_ZDOTDIR: resolveOriginalZdotdir(env),
        ZDOTDIR: join(root, 'zsh')
      }
    }
  }

  return {
    args: ['--rcfile', join(root, 'bash', 'rcfile')],
    env: {}
  }
}
