// Why: local PTYs and the daemon/SSH path must use identical ZDOTDIR discovery;
// small drift here breaks different terminal transports in different ways.

function quotePosixSingle(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function getZshEnvTemplate(zshDir: string, headerPrefix = ''): string {
  const header = headerPrefix
    ? `Korca ${headerPrefix} zsh shell-ready wrapper`
    : 'Korca zsh shell-ready wrapper'
  return `# ${header}
_korca_spawn_orig_zdotdir="\${KORCA_ORIG_ZDOTDIR:-}"
_korca_user_zdotdir="\${_korca_spawn_orig_zdotdir:-$HOME}"
_korca_zshenv_source_dir="\${KORCA_ZSHENV_SOURCE_DIR:-$HOME}"
_korca_zshenv_path=""
unset KORCA_ZSHENV_SOURCE_DIR

# Normalize fallback and source roots before reading user .zshenv so nested
# Korca PTYs never source another Korca wrapper recursively.
while [[ "\${_korca_user_zdotdir}" == */ ]]; do
  _korca_user_zdotdir="\${_korca_user_zdotdir%/}"
done
case "\${_korca_user_zdotdir}" in
  ""|*/shell-ready/zsh) _korca_user_zdotdir="$HOME" ;;
esac
while [[ "\${_korca_zshenv_source_dir}" == */ ]]; do
  _korca_zshenv_source_dir="\${_korca_zshenv_source_dir%/}"
done
case "\${_korca_zshenv_source_dir}" in
  ""|*/shell-ready/zsh) _korca_zshenv_source_dir="$HOME" ;;
esac

# Why: source at wrapper top level, not in a function/subshell, so .zshenv
# exports, functions, path/fpath typesets, and zsh options keep normal scope.
unset ZDOTDIR
if [[ -n "\${_korca_zshenv_source_dir:-}" && -f "\${_korca_zshenv_source_dir}/.zshenv" ]]; then
  _korca_zshenv_path="\${_korca_zshenv_source_dir}/.zshenv"
fi
if [[ -n "\${_korca_zshenv_path:-}" ]]; then
  source "\${_korca_zshenv_path}"
fi

_korca_discovered_zdotdir="\${ZDOTDIR:-}"

while [[ "\${_korca_discovered_zdotdir}" == */ ]]; do
  _korca_discovered_zdotdir="\${_korca_discovered_zdotdir%/}"
done

case "\${_korca_discovered_zdotdir}" in
  *[![:space:]]*) ;;
  *) _korca_discovered_zdotdir="" ;;
esac

if [[ -n "\${_korca_discovered_zdotdir}" && ! -d "\${_korca_discovered_zdotdir}" ]]; then
  [[ "\${KORCA_DEBUG:-0}" == "1" ]] && echo "[korca-shell-ready] Discovered ZDOTDIR '\${_korca_discovered_zdotdir}' does not exist, falling back" >&2
  _korca_discovered_zdotdir=""
fi

export KORCA_ORIG_ZDOTDIR="\${_korca_discovered_zdotdir:-\${_korca_user_zdotdir:-$HOME}}"

while [[ "\${KORCA_ORIG_ZDOTDIR}" == */ ]]; do
  KORCA_ORIG_ZDOTDIR="\${KORCA_ORIG_ZDOTDIR%/}"
done

case "\${KORCA_ORIG_ZDOTDIR}" in
  ""|*/shell-ready/zsh) export KORCA_ORIG_ZDOTDIR="$HOME" ;;
esac

export ZDOTDIR=${quotePosixSingle(zshDir)}
unset _korca_spawn_orig_zdotdir _korca_user_zdotdir _korca_zshenv_source_dir _korca_zshenv_path _korca_discovered_zdotdir
`
}
