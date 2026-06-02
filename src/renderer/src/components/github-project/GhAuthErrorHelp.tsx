/**
 * Inline guidance for `auth_required` / `scope_missing` errors from gh.
 *
 * Why: the canned remediation `gh auth refresh -s project ...` silently
 * no-ops when GITHUB_TOKEN/GH_TOKEN is exported in the user's shell — gh
 * prefers env tokens and refuses to refresh them. Users follow the
 * instructions, see no error, retry, and stay stuck. This component runs
 * a one-shot diagnostic and rewrites the suggested fix to match what gh
 * is actually doing: env-shadow vs. plain missing-scope vs. not-installed.
 */
import { useEffect, useState } from 'react'
import { Copy, ExternalLink, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { GitHubProjectViewError } from '@/../../shared/github-project-types'
import type { GhAuthDiagnostic } from '@/../../shared/github-auth-types'

type AuthErrorKind = 'auth_required' | 'scope_missing'

const REFRESH_CMD = 'gh auth refresh -s project -s read:org -s repo'
const LOGIN_CMD = 'gh auth login'

// AGENTS.md requires platform-specific shell guidance. The env-shadow
// remediation needs different commands per host shell — bash/zsh on
// macOS/Linux vs PowerShell on Windows.
const IS_WINDOWS = typeof navigator !== 'undefined' && /Win(dows|32|64)/i.test(navigator.userAgent)

function reloadKorcaRenderer(): void {
  const reload = window.api.app.reload
  if (typeof reload !== 'function') {
    window.location.reload()
    return
  }
  void reload().catch(() => {
    window.location.reload()
  })
}

function findEnvVarCommand(varName: string): { label: string; command: string } {
  if (IS_WINDOWS) {
    return {
      label: '설정 여부 확인 (PowerShell)',
      command: `Get-ChildItem Env:${varName}`
    }
  }
  return {
    label: '설정 위치 찾기',
    command: `grep -RIn '${varName}' ~/.zshrc ~/.zshenv ~/.bashrc ~/.bash_profile ~/.profile ~/.config 2>/dev/null`
  }
}

function unsetEnvVarCommand(varName: string): { label: string; command: string } {
  if (IS_WINDOWS) {
    // Persistent removal at the user scope; the user still needs a fresh
    // shell/Korca relaunch for the change to take effect.
    return {
      label: '해제 (PowerShell, 유지)',
      command: `Remove-Item Env:${varName}; [Environment]::SetEnvironmentVariable('${varName}', $null, 'User')`
    }
  }
  return { label: '현재 셸에서 해제', command: `unset ${varName}` }
}

function openExternal(url: string): void {
  // In Electron renderers, raw `window.open` doesn't reliably route to the
  // user's default browser. Use the same shell IPC the rest of the app
  // uses (see SidebarToolbar.openExternalUrl).
  void window.api.shell.openUrl(url)
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await window.api.ui.writeClipboardText(text)
    toast.success('클립보드에 복사했습니다')
  } catch {
    toast.error('복사하지 못했습니다')
  }
}

type Remediation = {
  /** Short human-readable summary of why the error is happening. */
  summary: string
  /** Optional follow-up paragraph explaining the fix. */
  detail?: string
  /** Commands to surface as copyable buttons, in order. */
  commands: { label: string; command: string }[]
  /** Optional external doc link. */
  docsUrl?: string
}

function buildRemediation(
  errorMessage: string,
  kind: AuthErrorKind,
  diag: GhAuthDiagnostic | null
): Remediation {
  // Diagnostic still loading or unavailable — fall back to the canned advice
  // so the UI never gets worse than the pre-diagnosis behavior.
  if (!diag) {
    return {
      summary: errorMessage,
      commands: [
        { label: '명령 복사', command: kind === 'auth_required' ? LOGIN_CMD : REFRESH_CMD }
      ]
    }
  }

  if (!diag.ghAvailable) {
    return {
      summary: 'GitHub CLI(`gh`)가 설치되어 있지 않거나 PATH에 없습니다.',
      detail:
        'Korca는 `gh`를 사용해 GitHub Projects와 통신합니다. cli.github.com에서 설치한 뒤 로그인하세요.',
      commands: [{ label: '로그인 명령 복사', command: LOGIN_CMD }],
      docsUrl: 'https://cli.github.com/'
    }
  }

  const active = diag.activeAccount
  // Most insidious failure mode: gh is using a token from the environment,
  // so `gh auth refresh` prints "GITHUB_TOKEN is being used... first clear
  // the value from the environment" and exits 0 without doing anything.
  if (active?.envToken) {
    const varName = active.envToken
    const fallback = diag.hasKeyringFallback
      ? ' Your keyring already has a `gh` login that will take over once the env var is gone.'
      : ' After unsetting it, run `gh auth login` to sign in normally, then retry.'
    return {
      summary: `환경 변수에 \`${varName}\`가 설정되어 있어 \`gh\`가 키링 로그인 대신 그 토큰을 사용하고 있습니다. \`gh auth refresh\`는 환경 변수 토큰을 수정할 수 없어서 실행해도 해결되지 않았습니다.`,
      detail: IS_WINDOWS
        ? `\`${varName}\`가 설정된 위치(시스템/사용자 환경 변수 또는 PowerShell 프로필)를 찾아 제거한 뒤 Korca를 다시 시작해 새 환경을 반영하세요.${fallback}`
        : `\`${varName}\`가 export된 위치(보통 \`~/.zshrc\`, \`~/.zshenv\`, \`~/.bashrc\`, \`~/.profile\` 또는 셸 비밀 관리 도구)를 찾아 제거한 뒤 Korca를 다시 시작해 새 환경을 반영하세요.${fallback}`,
      commands: [findEnvVarCommand(varName), unsetEnvVarCommand(varName)],
      docsUrl: 'https://cli.github.com/manual/gh_help_environment'
    }
  }

  // gh is not the problem, but the Electron process inherited GITHUB_TOKEN
  // from the parent shell. Even after the user runs `gh auth refresh` in a
  // separate terminal, Korca's gh subprocess sees the env var and uses it.
  if (diag.envTokenInProcess && (!active || diag.missingScopes.length > 0)) {
    const varName = diag.envTokenInProcess
    return {
      summary: `Korca가 셸에서 \`${varName}\`를 상속했고 \`gh\`가 그 토큰을 사용하고 있습니다. \`gh auth refresh\`는 환경 변수 토큰에는 적용되지 않습니다.`,
      detail: `Korca를 실행하는 셸${
        IS_WINDOWS ? ' (또는 사용자 환경 변수)' : ' (또는 셸 rc 파일)'
      }에서 \`${varName}\`를 해제한 뒤 Korca를 다시 시작하세요.`,
      commands: [findEnvVarCommand(varName), unsetEnvVarCommand(varName)],
      docsUrl: 'https://cli.github.com/manual/gh_help_environment'
    }
  }

  if (kind === 'auth_required' || !active) {
    return {
      summary: '`gh`로 GitHub에 로그인되어 있지 않습니다.',
      commands: [{ label: '로그인 명령 복사', command: LOGIN_CMD }]
    }
  }

  // Plain missing-scope case on a keyring login — refresh will work.
  if (diag.missingScopes.length > 0) {
    return {
      summary: `\`gh\` 토큰에 GitHub Projects에 필요한 ${diag.missingScopes
        .map((s) => `\`${s}\``)
        .join(', ')} scope${diag.missingScopes.length === 1 ? '' : 's'}가 없습니다.`,
      detail:
        '터미널에서 새로고침 명령을 실행하세요. 브라우저가 열려 새 scope를 승인할 수 있으며, 완료 후 이 화면으로 돌아와 다시 불러오면 됩니다.',
      commands: [{ label: '새로고침 명령 복사', command: REFRESH_CMD }]
    }
  }

  // Scopes look fine but GitHub still rejected us — likely SAML SSO not
  // authorized for this org's token, or the project is in an org the token
  // can't see. Surface the most likely fix.
  return {
    summary: errorMessage,
    detail:
      '토큰에는 필요한 scope가 있지만 GitHub가 여전히 접근을 거부했습니다. 프로젝트가 SAML SSO가 있는 조직에 있으면 Settings → Developer settings → Personal access tokens → Configure SSO에서 이 토큰을 조직에 승인해야 합니다.',
    commands: [{ label: '새로고침 명령 복사', command: REFRESH_CMD }],
    docsUrl:
      'https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on'
  }
}

export function GhAuthErrorHelp({
  error,
  variant = 'block'
}: {
  error: GitHubProjectViewError & { type: AuthErrorKind }
  variant?: 'block' | 'banner'
}): React.JSX.Element {
  const [diag, setDiag] = useState<GhAuthDiagnostic | null>(null)
  useEffect(() => {
    let cancelled = false
    window.api.gh
      .diagnoseAuth()
      .then((d) => {
        if (!cancelled) {
          setDiag(d)
        }
      })
      // Diagnostic is best-effort; never block the error UI on it.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const remedy = buildRemediation(error.message, error.type, diag)
  const docsUrl = remedy.docsUrl

  if (variant === 'banner') {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <div className="font-medium">{remedy.summary}</div>
        {remedy.detail ? <div className="mt-0.5 opacity-80">{remedy.detail}</div> : null}
        <div className="mt-1 flex flex-wrap gap-1">
          {remedy.commands.map((c) => (
            <button
              key={c.command}
              type="button"
              onClick={() => copyToClipboard(c.command)}
              title={c.command}
              className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] hover:bg-amber-500/20"
            >
              <Copy className="size-3" /> {c.label}
            </button>
          ))}
          {docsUrl ? (
            <button
              type="button"
              onClick={() => openExternal(docsUrl)}
              className="inline-flex items-center gap-1 rounded border border-amber-500/30 px-1.5 py-0.5 text-[11px] hover:bg-amber-500/20"
            >
              <ExternalLink className="size-3" /> 문서
            </button>
          ) : null}
          {/* Why: after running the refresh command in a terminal, users need to
              reload the renderer to pick up the new gh token state. */}
          <button
            type="button"
            onClick={reloadKorcaRenderer}
            className="inline-flex items-center gap-1 rounded border border-amber-500/30 px-1.5 py-0.5 text-[11px] hover:bg-amber-500/20"
          >
            <RotateCw className="size-3" /> 다시 불러오기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="text-foreground">{remedy.summary}</div>
      {remedy.detail ? <div className="text-muted-foreground">{remedy.detail}</div> : null}
      <div className="flex flex-wrap gap-2">
        {remedy.commands.map((c) => (
          <Button
            key={c.command}
            size="sm"
            variant="outline"
            title={c.command}
            onClick={() => copyToClipboard(c.command)}
          >
            <Copy className="mr-1 size-3.5" /> {c.label}
          </Button>
        ))}
        {docsUrl ? (
          <Button size="sm" variant="outline" onClick={() => openExternal(docsUrl)}>
            <ExternalLink className="mr-1 size-3.5" /> 문서
          </Button>
        ) : null}
        {/* Why: after running the refresh command in a terminal, users need to
            reload the renderer to pick up the new gh token state. */}
        <Button size="sm" variant="outline" onClick={reloadKorcaRenderer}>
          <RotateCw className="mr-1 size-3.5" /> 다시 불러오기
        </Button>
      </div>
    </div>
  )
}
