// Why: OMP 15.x discovers built-in user extensions from ~/.omp/agent, not
// PI_CODING_AGENT_DIR/extensions. Korca's per-PTY status extension must be
// passed explicitly when users type `omp` in an existing terminal.

const OMP_SUBCOMMANDS = [
  'acp',
  'agents',
  'auth-broker',
  'auth-gateway',
  'commit',
  'config',
  'grep',
  'grievances',
  'plugin',
  'setup',
  'shell',
  'read',
  'ssh',
  'stats',
  'update',
  'worktree',
  'wt',
  'search',
  'q'
] as const

export function getPosixOmpShellWrapper(): string {
  const subcommands = OMP_SUBCOMMANDS.join('|')
  return `# Why: OMP does not auto-load Korca's PTY overlay extensions; wrap only
# interactive launch invocations so subcommands such as \`omp config\` keep
# their normal argv shape.
__korca_omp_is_subcommand() {
  case "\${1:-}" in
    ${subcommands}) return 0 ;;
  esac
  return 1
}
__korca_omp_should_skip_extension() {
  case "\${1:-}" in
    help|--help|-h|--version|-v) return 0 ;;
  esac
  __korca_omp_is_subcommand "\${1:-}"
}
__korca_omp() {
  local __korca_prev_pi="\${PI_CODING_AGENT_DIR-}"
  local __korca_had_pi=0
  [[ -n "\${PI_CODING_AGENT_DIR+x}" ]] && __korca_had_pi=1
  [[ -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" ]] && export PI_CODING_AGENT_DIR="\${KORCA_OMP_CODING_AGENT_DIR}"

  local __korca_status=0
  if [[ -n "\${KORCA_OMP_STATUS_EXTENSION:-}" && -f "\${KORCA_OMP_STATUS_EXTENSION}" ]] && ! __korca_omp_should_skip_extension "\${1:-}"; then
    if [[ "\${1:-}" == "launch" ]]; then
      shift
      command omp launch --extension "\${KORCA_OMP_STATUS_EXTENSION}" "$@"
    else
      command omp --extension "\${KORCA_OMP_STATUS_EXTENSION}" "$@"
    fi
  else
    command omp "$@"
  fi
  __korca_status=$?

  if [[ $__korca_had_pi -eq 1 ]]; then
    export PI_CODING_AGENT_DIR="$__korca_prev_pi"
  else
    unset PI_CODING_AGENT_DIR
  fi
  return $__korca_status
}
if [[ -n "\${KORCA_OMP_CODING_AGENT_DIR:-}" || -n "\${KORCA_OMP_STATUS_EXTENSION:-}" ]]; then
  omp() { __korca_omp "$@"; }
fi
`
}

export function getPowerShellOmpShellWrapper(): string {
  const subcommands = OMP_SUBCOMMANDS.map((value) => `'${value}'`).join(', ')
  return `# Why: OMP does not auto-load Korca's PTY overlay extensions; wrap only
# interactive launch invocations so subcommands such as \`omp config\` keep
# their normal argv shape.
function Global:__KorcaOmpIsSubcommand {
    param([string]$Name)
    $subcommands = @(${subcommands})
    return $subcommands -contains $Name
}
function Global:__KorcaOmpShouldSkipExtension {
    param([string]$Name)
    if (@("help", "--help", "-h", "--version", "-v") -contains $Name) { return $true }
    return __KorcaOmpIsSubcommand -Name $Name
}
if ($env:KORCA_OMP_CODING_AGENT_DIR -or $env:KORCA_OMP_STATUS_EXTENSION) {
    function Global:omp {
        $korcaPrevPi = $env:PI_CODING_AGENT_DIR
        $korcaHadPi = Test-Path Env:PI_CODING_AGENT_DIR
        if ($env:KORCA_OMP_CODING_AGENT_DIR) {
            $env:PI_CODING_AGENT_DIR = $env:KORCA_OMP_CODING_AGENT_DIR
        }

        $korcaStatus = 0
        $korcaCommand = Get-Command omp -CommandType Application,ExternalScript -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $korcaCommand) {
            Write-Error "omp executable not found"
            $korcaStatus = 127
        } elseif ($env:KORCA_OMP_STATUS_EXTENSION -and
            (Test-Path -LiteralPath $env:KORCA_OMP_STATUS_EXTENSION) -and
            -not (__KorcaOmpShouldSkipExtension -Name ([string]($args[0])))) {
            if ($args.Count -gt 0 -and $args[0] -eq "launch") {
                $korcaLaunchArgs = @($args | Select-Object -Skip 1)
                & $korcaCommand.Source launch --extension $env:KORCA_OMP_STATUS_EXTENSION @korcaLaunchArgs
            } else {
                & $korcaCommand.Source --extension $env:KORCA_OMP_STATUS_EXTENSION @args
            }
            $korcaStatus = $LASTEXITCODE
        } else {
            & $korcaCommand.Source @args
            $korcaStatus = $LASTEXITCODE
        }

        if ($korcaHadPi) {
            $env:PI_CODING_AGENT_DIR = $korcaPrevPi
        } else {
            Remove-Item Env:PI_CODING_AGENT_DIR -ErrorAction SilentlyContinue
        }
        $global:LASTEXITCODE = $korcaStatus
    }
}
`
}
