import { useEffect, useState } from 'react'
import { ExternalLink, Github, Terminal } from 'lucide-react'
import { LinearIcon } from '@/components/icons/LinearIcon'
import { Button } from '@/components/ui/button'
import { LinearApiKeyDialog } from '@/components/linear-api-key-dialog'
import { useAppStore } from '@/store'
import { IntegrationStatusPill } from '@/components/integration-status-pill'
import { cn } from '@/lib/utils'
import { OnboardingInlineCommandTerminal } from './OnboardingInlineCommandTerminal'

type GitHubSetupState = 'checking' | 'connected' | 'not-installed' | 'not-authenticated'

function getGitHubSetupState(
  status: ReturnType<typeof useAppStore.getState>['preflightStatus']
): GitHubSetupState {
  if (!status) {
    return 'checking'
  }
  if (!status.gh.installed) {
    return 'not-installed'
  }
  return status.gh.authenticated ? 'connected' : 'not-authenticated'
}

export function GitHubRow(props: { compact?: boolean } = {}): React.JSX.Element {
  const { compact = false } = props
  const preflightStatus = useAppStore((s) => s.preflightStatus)
  const preflightStatusLoading = useAppStore((s) => s.preflightStatusLoading)
  const refreshPreflightStatus = useAppStore((s) => s.refreshPreflightStatus)

  const state: GitHubSetupState = preflightStatusLoading
    ? 'checking'
    : getGitHubSetupState(preflightStatus)
  const [githubTerminalOpen, setGithubTerminalOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-muted/20">
      <div className={cn(compact ? 'flex flex-col gap-3 p-4' : 'flex items-start gap-4 p-5')}>
        <div className={cn('flex items-start gap-3', compact ? '' : 'gap-4 flex-1 min-w-0')}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
            <Github className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold leading-tight text-foreground">GitHub</h3>
              {state === 'connected' ? (
                <IntegrationStatusPill tone="connected">연결됨</IntegrationStatusPill>
              ) : state === 'not-installed' ? (
                <IntegrationStatusPill tone="attention">CLI 설치 안 됨</IntegrationStatusPill>
              ) : state === 'not-authenticated' ? (
                <IntegrationStatusPill tone="attention">로그인 필요</IntegrationStatusPill>
              ) : (
                <IntegrationStatusPill tone="neutral">확인 중…</IntegrationStatusPill>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              풀 리퀘스트, 이슈, 체크 상태를 사용합니다.
            </p>
          </div>
        </div>
        <div className={cn('flex items-center gap-2', compact ? 'flex-wrap' : 'shrink-0')}>
          {state === 'not-installed' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.api.shell.openUrl('https://cli.github.com')}
            >
              <ExternalLink className="size-3.5" />
              gh 설치
            </Button>
          ) : null}
          {state === 'not-authenticated' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={githubTerminalOpen}
              onClick={() => setGithubTerminalOpen(true)}
            >
              <Terminal className="size-3.5" />
              {githubTerminalOpen ? '로그인 중' : '로그인'}
            </Button>
          ) : null}
          {state !== 'connected' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refreshPreflightStatus({ force: true })}
            >
              다시 확인
            </Button>
          ) : null}
        </div>
      </div>
      {state === 'not-authenticated' && githubTerminalOpen ? (
        <div className={cn(compact ? 'px-4 pb-4' : 'px-5 pb-5')}>
          <OnboardingInlineCommandTerminal
            command="gh auth login"
            title="GitHub 설정"
            ariaLabel="GitHub 로그인 명령"
            description="Enter를 눌러 GitHub CLI 인증을 실행하세요. 브라우저 또는 기기 흐름이 끝나면 GitHub를 다시 확인하세요."
          />
        </div>
      ) : null}
    </div>
  )
}

export function LinearRow(props: { compact?: boolean } = {}): React.JSX.Element {
  const { compact = false } = props
  const linearStatus = useAppStore((s) => s.linearStatus)
  const checkLinearConnection = useAppStore((s) => s.checkLinearConnection)

  const [dialogOpen, setDialogOpen] = useState(false)

  const workspaceCount = linearStatus.workspaces?.length ?? (linearStatus.connected ? 1 : 0)

  return (
    <>
      <div className="rounded-xl border border-border bg-muted/20">
        <div className={cn(compact ? 'flex flex-col gap-3 p-4' : 'flex items-start gap-4 p-5')}>
          <div className={cn('flex items-start gap-3', compact ? '' : 'gap-4 flex-1 min-w-0')}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
              <LinearIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold leading-tight text-foreground">Linear</h3>
                {linearStatus.connected ? (
                  <IntegrationStatusPill tone="connected">연결됨</IntegrationStatusPill>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {linearStatus.connected
                  ? `${workspaceCount}개 작업공간이 연결되었습니다. 언제든 다른 작업공간을 추가하거나 제한된 키를 교체할 수 있습니다.`
                  : '개인 API 키로 Linear 접근을 추가하세요. 전체 접근 키는 키 소유자가 접근할 수 있는 모든 팀을 보여줄 수 있습니다.'}
              </p>
            </div>
          </div>
          <div className={cn('flex items-center gap-2', compact ? 'flex-wrap' : 'shrink-0')}>
            {linearStatus.connected ? (
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                작업공간 접근 추가
              </Button>
            ) : (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Linear 접근 추가
              </Button>
            )}
            {!linearStatus.connected ? (
              <Button variant="ghost" size="sm" onClick={() => void checkLinearConnection(true)}>
                다시 확인
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <LinearApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        overlayClassName="z-[110]"
        contentClassName="z-[120]"
        connectLabel="Linear 접근 추가"
      />
    </>
  )
}

const CAPABILITIES = [
  'GitHub 이슈나 풀 리퀘스트에서 워크스페이스를 시작하고 제목과 문맥을 미리 채웁니다',
  'Korca를 떠나지 않고 Tasks 보기에서 GitHub 이슈와 풀 리퀘스트를 봅니다',
  '모든 워크트리에서 이슈 상태, 리뷰 상태, CI 체크를 확인합니다',
  'Korca를 떠나지 않고 풀 리퀘스트를 읽고, 댓글을 달고, 병합합니다'
] as const

export function IntegrationsStep(): React.JSX.Element {
  const refreshPreflightStatus = useAppStore((s) => s.refreshPreflightStatus)

  useEffect(() => {
    void refreshPreflightStatus()
  }, [refreshPreflightStatus])

  return (
    <div className="space-y-6">
      <ul className="-mt-6 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
        {CAPABILITIES.map((line) => (
          <li key={line} className="flex gap-2.5">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <GitHubRow />
        <div className="mt-4 rounded-xl border border-border bg-muted/10 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[14px] font-medium text-foreground/70">추가 작업 소스</span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              Linear, GitLab, Bitbucket, Azure DevOps, Gitea, Jira는 설정 &gt; 통합에 있습니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
