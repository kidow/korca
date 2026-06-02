/* eslint-disable max-lines */
import { homedir } from 'os'
import { join } from 'path'
import type { SFTPWrapper } from 'ssh2'
import type { AgentHookInstallState, AgentHookInstallStatus } from '../../shared/agent-hook-types'
import {
  createManagedCommandMatcher,
  buildWindowsAgentHookPostCommand,
  getSharedManagedScriptPath,
  readHooksJson,
  removeManagedCommands,
  wrapPosixHookCommand,
  writeHooksJson,
  writeManagedScript,
  type HookDefinition
} from '../agent-hooks/installer-utils'
import {
  readHooksJsonRemote,
  writeHooksJsonRemote,
  writeManagedScriptRemote
} from '../agent-hooks/installer-utils-remote'

const COMMAND_CODE_EVENTS = [
  {
    eventName: 'PreToolUse',
    definition: { matcher: '.*', hooks: [{ type: 'command', command: '' }] }
  },
  {
    eventName: 'PostToolUse',
    definition: { matcher: '.*', hooks: [{ type: 'command', command: '' }] }
  },
  { eventName: 'Stop', definition: { hooks: [{ type: 'command', command: '' }] } }
] as const

function getConfigPath(): string {
  return join(homedir(), '.commandcode', 'settings.json')
}

function getManagedScriptFileName(): string {
  return process.platform === 'win32' ? 'command-code-hook.cmd' : 'command-code-hook.sh'
}

function getManagedScriptPath(): string {
  return getSharedManagedScriptPath(getManagedScriptFileName())
}

function getManagedCommand(scriptPath: string): string {
  return process.platform === 'win32' ? scriptPath : wrapPosixHookCommand(scriptPath)
}

function getManagedScript(target: 'local' | 'posix' = 'local'): string {
  if (target === 'local' && process.platform === 'win32') {
    return [
      '@echo off',
      'setlocal',
      'if "%KORCA_AGENT_HOOK_PORT%"=="" if defined KORCA_AGENT_HOOK_ENDPOINT if exist "%KORCA_AGENT_HOOK_ENDPOINT%" call "%KORCA_AGENT_HOOK_ENDPOINT%" 2>nul',
      'if "%KORCA_AGENT_HOOK_TOKEN%"=="" if not "%KORCA_AGENT_HOOK_PORT%"=="" call :sourceEndpointByPort',
      'if "%KORCA_AGENT_HOOK_PORT%"=="" exit /b 0',
      'if "%KORCA_AGENT_HOOK_TOKEN%"=="" exit /b 0',
      'if "%KORCA_PANE_KEY%"=="" exit /b 0',
      buildWindowsAgentHookPostCommand('command-code'),
      'exit /b 0',
      ':sourceEndpointByPort',
      'if not defined APPDATA exit /b 0',
      'if exist "%APPDATA%\\korca-dev\\agent-hooks" for /r "%APPDATA%\\korca-dev\\agent-hooks" %%F in (endpoint.cmd) do call :maybeSourceEndpoint "%%~fF"',
      'if "%KORCA_AGENT_HOOK_TOKEN%"=="" if exist "%APPDATA%\\korca\\agent-hooks" for /r "%APPDATA%\\korca\\agent-hooks" %%F in (endpoint.cmd) do call :maybeSourceEndpoint "%%~fF"',
      'exit /b 0',
      ':maybeSourceEndpoint',
      'if not "%KORCA_AGENT_HOOK_TOKEN%"=="" exit /b 0',
      'for /f "tokens=2 delims==" %%P in (\'findstr /b /c:"set KORCA_AGENT_HOOK_PORT=" "%~1" 2^>nul\') do if "%%P"=="%KORCA_AGENT_HOOK_PORT%" call "%~1" 2>nul',
      'exit /b 0',
      ''
    ].join('\r\n')
  }

  return [
    '#!/bin/sh',
    '__korca_read_ancestor_var() {',
    '  __korca_name="$1"',
    '  __korca_pid="${PPID:-}"',
    '  while [ -n "$__korca_pid" ] && [ "$__korca_pid" != "0" ] && [ "$__korca_pid" != "1" ]; do',
    '    __korca_value=""',
    '    if [ -r "/proc/$__korca_pid/environ" ]; then',
    '      __korca_value=$(tr "\\000" "\\n" < "/proc/$__korca_pid/environ" 2>/dev/null | sed -n "s/^${__korca_name}=//p" | head -n 1)',
    '    fi',
    '    if [ -z "$__korca_value" ]; then',
    '      __korca_value=$(ps eww -p "$__korca_pid" -o command= 2>/dev/null | tr " " "\\n" | sed -n "s/^${__korca_name}=//p" | head -n 1)',
    '    fi',
    '    if [ -n "$__korca_value" ]; then',
    '      printf "%s\\n" "$__korca_value"',
    '      return 0',
    '    fi',
    '    __korca_pid=$(ps -o ppid= -p "$__korca_pid" 2>/dev/null | tr -d " ")',
    '  done',
    '  return 1',
    '}',
    '__korca_fill_from_ancestor() {',
    '  __korca_name="$1"',
    '  case "$__korca_name" in',
    '    KORCA_AGENT_HOOK_ENDPOINT) [ -z "${KORCA_AGENT_HOOK_ENDPOINT:-}" ] || return 0 ;;',
    '    KORCA_AGENT_HOOK_PORT) [ -z "${KORCA_AGENT_HOOK_PORT:-}" ] || return 0 ;;',
    '    KORCA_AGENT_HOOK_TOKEN) [ -z "${KORCA_AGENT_HOOK_TOKEN:-}" ] || return 0 ;;',
    '    KORCA_AGENT_HOOK_ENV) [ -z "${KORCA_AGENT_HOOK_ENV:-}" ] || return 0 ;;',
    '    KORCA_AGENT_HOOK_VERSION) [ -z "${KORCA_AGENT_HOOK_VERSION:-}" ] || return 0 ;;',
    '    KORCA_PANE_KEY) [ -z "${KORCA_PANE_KEY:-}" ] || return 0 ;;',
    '    KORCA_TAB_ID) [ -z "${KORCA_TAB_ID:-}" ] || return 0 ;;',
    '    KORCA_WORKTREE_ID) [ -z "${KORCA_WORKTREE_ID:-}" ] || return 0 ;;',
    '    *) return 0 ;;',
    '  esac',
    '  __korca_value=$(__korca_read_ancestor_var "$__korca_name") || return 0',
    '  [ -n "$__korca_value" ] && export "$__korca_name=$__korca_value"',
    '}',
    '__korca_endpoint_value() {',
    '  __korca_endpoint_name="$1"',
    '  __korca_endpoint_path="$2"',
    '  sed -n "s/^${__korca_endpoint_name}=//p" "$__korca_endpoint_path" 2>/dev/null | head -n 1',
    '}',
    '__korca_fill_from_endpoint_file() {',
    '  __korca_endpoint_path="$1"',
    '  [ -r "$__korca_endpoint_path" ] || return 0',
    '  __korca_endpoint_port=$(__korca_endpoint_value KORCA_AGENT_HOOK_PORT "$__korca_endpoint_path")',
    '  if [ -n "${KORCA_AGENT_HOOK_PORT:-}" ] && [ -n "$__korca_endpoint_port" ] && [ "$__korca_endpoint_port" != "$KORCA_AGENT_HOOK_PORT" ]; then',
    '    return 0',
    '  fi',
    '  for __korca_endpoint_name in KORCA_AGENT_HOOK_PORT KORCA_AGENT_HOOK_TOKEN KORCA_AGENT_HOOK_ENV KORCA_AGENT_HOOK_VERSION; do',
    '    eval "__korca_current=\\${$__korca_endpoint_name:-}"',
    '    [ -z "$__korca_current" ] || continue',
    '    __korca_endpoint_value=$(__korca_endpoint_value "$__korca_endpoint_name" "$__korca_endpoint_path")',
    '    [ -n "$__korca_endpoint_value" ] && export "$__korca_endpoint_name=$__korca_endpoint_value"',
    '  done',
    '}',
    '# Why: Command Code sanitizes hook subprocess env. The parent TUI process',
    '# still has Korca pane/hook metadata, so recover it before posting.',
    'for __korca_name in KORCA_AGENT_HOOK_ENDPOINT KORCA_AGENT_HOOK_PORT KORCA_AGENT_HOOK_TOKEN KORCA_AGENT_HOOK_ENV KORCA_AGENT_HOOK_VERSION KORCA_PANE_KEY KORCA_TAB_ID KORCA_WORKTREE_ID; do',
    '  __korca_fill_from_ancestor "$__korca_name"',
    'done',
    'if [ -n "$KORCA_AGENT_HOOK_ENDPOINT" ] && [ -r "$KORCA_AGENT_HOOK_ENDPOINT" ]; then',
    '  __korca_fill_from_endpoint_file "$KORCA_AGENT_HOOK_ENDPOINT"',
    'fi',
    '# Why: Command Code strips TOKEN-like env vars before invoking hooks. If',
    '# KORCA_AGENT_HOOK_ENDPOINT was not exported into this PTY, recover the',
    '# matching endpoint file by the unstripped loopback port.',
    'if [ -z "$KORCA_AGENT_HOOK_TOKEN" ] && [ -n "$KORCA_AGENT_HOOK_PORT" ]; then',
    '  for endpoint in \\',
    '    "$HOME/Library/Application Support/korca-dev/agent-hooks"/*/endpoint.env \\',
    '    "$HOME/Library/Application Support/korca-dev/agent-hooks/endpoint.env" \\',
    '    "${XDG_CONFIG_HOME:-$HOME/.config}/korca-dev/agent-hooks"/*/endpoint.env \\',
    '    "${XDG_CONFIG_HOME:-$HOME/.config}/korca-dev/agent-hooks/endpoint.env" \\',
    '    "$HOME/Library/Application Support/korca/agent-hooks/endpoint.env" \\',
    '    "${XDG_CONFIG_HOME:-$HOME/.config}/korca/agent-hooks/endpoint.env"; do',
    '    [ -r "$endpoint" ] || continue',
    '    endpoint_port=$(sed -n "s/^KORCA_AGENT_HOOK_PORT=//p" "$endpoint" | head -n 1)',
    '    if [ "$endpoint_port" = "$KORCA_AGENT_HOOK_PORT" ]; then',
    '      __korca_fill_from_endpoint_file "$endpoint"',
    '      break',
    '    fi',
    '  done',
    'fi',
    'if [ -z "$KORCA_AGENT_HOOK_PORT" ] || [ -z "$KORCA_AGENT_HOOK_TOKEN" ] || [ -z "$KORCA_PANE_KEY" ]; then',
    '  exit 0',
    'fi',
    'payload=$(cat)',
    'if [ -z "$payload" ]; then',
    '  exit 0',
    'fi',
    // Timeout caps best-effort hook posts if the local listener stalls.
    'curl -sS -X POST "http://127.0.0.1:${KORCA_AGENT_HOOK_PORT}/hook/command-code" \\',
    '  --connect-timeout 0.5 --max-time 1.5 \\',
    '  -H "Content-Type: application/x-www-form-urlencoded" \\',
    '  -H "X-Korca-Agent-Hook-Token: ${KORCA_AGENT_HOOK_TOKEN}" \\',
    '  --data-urlencode "paneKey=${KORCA_PANE_KEY}" \\',
    '  --data-urlencode "tabId=${KORCA_TAB_ID}" \\',
    '  --data-urlencode "worktreeId=${KORCA_WORKTREE_ID}" \\',
    '  --data-urlencode "env=${KORCA_AGENT_HOOK_ENV}" \\',
    '  --data-urlencode "version=${KORCA_AGENT_HOOK_VERSION}" \\',
    '  --data-urlencode "payload=${payload}" >/dev/null 2>&1 || true',
    'exit 0',
    ''
  ].join('\n')
}

function buildInstalledConfig(
  config: NonNullable<ReturnType<typeof readHooksJson>>,
  command: string,
  scriptFileName: string
): void {
  const nextHooks = { ...config.hooks }
  const isManagedCommand = createManagedCommandMatcher(scriptFileName)
  const managedEvents = new Set<string>(COMMAND_CODE_EVENTS.map((event) => event.eventName))

  // Why: Korca owns only command-code-hook.* entries. Sweep retired managed
  // events while preserving user-authored Command Code hooks.
  for (const [eventName, definitions] of Object.entries(nextHooks)) {
    if (managedEvents.has(eventName) || !Array.isArray(definitions)) {
      continue
    }
    const cleaned = removeManagedCommands(definitions, isManagedCommand)
    if (cleaned.length === 0) {
      delete nextHooks[eventName]
    } else {
      nextHooks[eventName] = cleaned
    }
  }

  for (const event of COMMAND_CODE_EVENTS) {
    const current = Array.isArray(nextHooks[event.eventName]) ? nextHooks[event.eventName] : []
    const cleaned = removeManagedCommands(current, isManagedCommand)
    const definition: HookDefinition = {
      ...event.definition,
      hooks: [{ type: 'command', command }]
    }
    nextHooks[event.eventName] = [...cleaned, definition]
  }

  config.hooks = nextHooks
}

export class CommandCodeHookService {
  getStatus(): AgentHookInstallStatus {
    const configPath = getConfigPath()
    const scriptPath = getManagedScriptPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return {
        agent: 'command-code',
        state: 'error',
        configPath,
        managedHooksPresent: false,
        detail: 'Could not parse Command Code settings.json'
      }
    }

    const command = getManagedCommand(scriptPath)
    const missing: string[] = []
    let presentCount = 0
    for (const event of COMMAND_CODE_EVENTS) {
      const definitions = Array.isArray(config.hooks?.[event.eventName])
        ? config.hooks![event.eventName]!
        : []
      const hasCommand = definitions.some((definition) =>
        (definition.hooks ?? []).some((hook) => hook.command === command)
      )
      if (hasCommand) {
        presentCount += 1
      } else {
        missing.push(event.eventName)
      }
    }

    const managedHooksPresent = presentCount > 0
    let state: AgentHookInstallState
    let detail: string | null
    if (missing.length === 0) {
      state = 'installed'
      detail = null
    } else if (presentCount === 0) {
      state = 'not_installed'
      detail = null
    } else {
      state = 'partial'
      detail = `Managed hook missing for events: ${missing.join(', ')}`
    }
    return { agent: 'command-code', state, configPath, managedHooksPresent, detail }
  }

  install(): AgentHookInstallStatus {
    const configPath = getConfigPath()
    const scriptPath = getManagedScriptPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return {
        agent: 'command-code',
        state: 'error',
        configPath,
        managedHooksPresent: false,
        detail: 'Could not parse Command Code settings.json'
      }
    }

    buildInstalledConfig(config, getManagedCommand(scriptPath), getManagedScriptFileName())
    writeManagedScript(scriptPath, getManagedScript())
    writeHooksJson(configPath, config)
    return this.getStatus()
  }

  async installRemote(sftp: SFTPWrapper, remoteHome: string): Promise<AgentHookInstallStatus> {
    const home = remoteHome.replace(/\/$/, '')
    const remoteConfigPath = `${home}/.commandcode/settings.json`
    const remoteScriptPath = `${home}/.korca/agent-hooks/command-code-hook.sh`
    try {
      const config = await readHooksJsonRemote(sftp, remoteConfigPath)
      if (!config) {
        return {
          agent: 'command-code',
          state: 'error',
          configPath: remoteConfigPath,
          managedHooksPresent: false,
          detail: 'Could not parse remote Command Code settings.json'
        }
      }

      buildInstalledConfig(config, wrapPosixHookCommand(remoteScriptPath), 'command-code-hook.sh')
      await writeManagedScriptRemote(sftp, remoteScriptPath, getManagedScript('posix'))
      await writeHooksJsonRemote(sftp, remoteConfigPath, config)

      return {
        agent: 'command-code',
        state: 'installed',
        configPath: remoteConfigPath,
        managedHooksPresent: true,
        detail: null
      }
    } catch (err) {
      return {
        agent: 'command-code',
        state: 'error',
        configPath: remoteConfigPath,
        managedHooksPresent: false,
        detail: err instanceof Error ? err.message : String(err)
      }
    }
  }

  remove(): AgentHookInstallStatus {
    const configPath = getConfigPath()
    const config = readHooksJson(configPath)
    if (!config) {
      return {
        agent: 'command-code',
        state: 'error',
        configPath,
        managedHooksPresent: false,
        detail: 'Could not parse Command Code settings.json'
      }
    }

    const nextHooks = { ...config.hooks }
    const isManagedCommand = createManagedCommandMatcher(getManagedScriptFileName())
    for (const [eventName, definitions] of Object.entries(nextHooks)) {
      if (!Array.isArray(definitions)) {
        continue
      }
      const cleaned = removeManagedCommands(definitions, isManagedCommand)
      if (cleaned.length === 0) {
        delete nextHooks[eventName]
      } else {
        nextHooks[eventName] = cleaned
      }
    }

    config.hooks = nextHooks
    writeHooksJson(configPath, config)
    return this.getStatus()
  }
}

export const commandCodeHookService = new CommandCodeHookService()
