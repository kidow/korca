/* eslint-disable max-lines -- Why: this pane co-locates source-host and
   Linear integration cards so the preflight-check + status-badge +
   install/auth-prompt scaffolding lives in one place rather than fanning
   out across per-integration files that would each repeat the same
   pattern. Splitting buys nothing while the surface stays this narrow. */
import { useEffect, useState } from 'react'
import {
  Github,
  Gitlab,
  GitPullRequestArrow,
  ExternalLink,
  LoaderCircle,
  Terminal,
  Unlink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useAppStore } from '../../store'
import { Button } from '../ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import { LinearApiKeyDialog } from '@/components/linear-api-key-dialog'
import {
  getPreflightIntegrationStatuses,
  type PreflightRefreshProvider
} from './integrations-pane-status'
export { INTEGRATIONS_PANE_SEARCH_ENTRIES } from './integrations-search'

function LinearIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  )
}

export function IntegrationsPane(): React.JSX.Element {
  const linearStatus = useAppStore((s) => s.linearStatus)
  const preflightStatus = useAppStore((s) => s.preflightStatus)
  const disconnectLinear = useAppStore((s) => s.disconnectLinear)
  const disconnectLinearWorkspace = useAppStore((s) => s.disconnectLinearWorkspace)
  const checkLinearConnection = useAppStore((s) => s.checkLinearConnection)
  const refreshPreflightStatus = useAppStore((s) => s.refreshPreflightStatus)
  const testLinearConnection = useAppStore((s) => s.testLinearConnection)
  const linearWorkspaces = linearStatus.workspaces ?? []
  const mountedRef = useMountedRef()

  const [refreshingPreflightProviders, setRefreshingPreflightProviders] = useState<
    Set<PreflightRefreshProvider>
  >(new Set())
  const [linearDialogOpen, setLinearDialogOpen] = useState(false)
  const [linearTestingWorkspaceId, setLinearTestingWorkspaceId] = useState<string | null>(null)
  const [linearTestResultByWorkspace, setLinearTestResultByWorkspace] = useState<
    Record<string, { state: 'ok' | 'error'; error?: string }>
  >({})

  useEffect(() => {
    void checkLinearConnection()
    void refreshPreflightStatus()
  }, [checkLinearConnection, refreshPreflightStatus])

  const {
    ghStatus,
    glabStatus,
    bitbucketStatus,
    bitbucketAccount,
    azureDevOpsStatus,
    azureDevOpsAccount,
    azureDevOpsBaseUrl,
    giteaStatus,
    giteaAccount,
    giteaBaseUrl
  } = getPreflightIntegrationStatuses(preflightStatus, refreshingPreflightProviders)

  const handleLinearDisconnect = async (workspaceId?: string): Promise<void> => {
    await (workspaceId ? disconnectLinearWorkspace(workspaceId) : disconnectLinear())
    if (!mountedRef.current) {
      return
    }
    setLinearTestResultByWorkspace({})
  }

  // Why: explicit user-triggered verification. This is the *only* path in
  // settings that decrypts the stored API key, so the macOS Keychain prompt
  // (if the app signature has changed since the item was stored) only
  // appears when the user clicks Test — not just for opening Settings.
  const handleLinearTest = async (workspaceId: string): Promise<void> => {
    setLinearTestingWorkspaceId(workspaceId)
    setLinearTestResultByWorkspace((prev) => {
      const next = { ...prev }
      delete next[workspaceId]
      return next
    })
    const result = await testLinearConnection(workspaceId)
    if (!mountedRef.current) {
      return
    }
    if (result.ok) {
      setLinearTestResultByWorkspace((prev) => ({
        ...prev,
        [workspaceId]: { state: 'ok' }
      }))
    } else {
      setLinearTestResultByWorkspace((prev) => ({
        ...prev,
        [workspaceId]: { state: 'error', error: result.error }
      }))
    }
    setLinearTestingWorkspaceId(null)
  }

  const refreshPreflightProvider = (provider: PreflightRefreshProvider): void => {
    setRefreshingPreflightProviders((prev) => new Set(prev).add(provider))
    void refreshPreflightStatus({ force: true }).finally(() => {
      if (!mountedRef.current) {
        return
      }
      setRefreshingPreflightProviders((prev) => {
        if (!prev.has(provider)) {
          return prev
        }
        const next = new Set(prev)
        next.delete(provider)
        return next
      })
    })
  }

  const handleRefreshGlab = (): void => refreshPreflightProvider('glab')

  const handleRefreshGh = (): void => refreshPreflightProvider('gh')

  const handleRefreshBitbucket = (): void => refreshPreflightProvider('bitbucket')

  const handleRefreshAzureDevOps = (): void => refreshPreflightProvider('azureDevOps')

  const handleRefreshGitea = (): void => refreshPreflightProvider('gitea')

  return (
    <div className="space-y-3">
      {/* GitHub */}
      <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Github className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">GitHub</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">gh</span> CLI로 풀 리퀘스트, 이슈, 체크를
              사용합니다.
            </p>
          </div>
          {ghStatus === 'checking' ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : ghStatus === 'connected' ? (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              연결됨
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {ghStatus === 'not-installed' ? '설치 안 됨' : '인증 안 됨'}
            </span>
          )}
        </div>

        {ghStatus !== 'checking' && ghStatus !== 'connected' && (
          <div className="mt-3 rounded-md border border-border/30 bg-background/50 px-3 py-2.5 space-y-2">
            {ghStatus === 'not-installed' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  GitHub CLI를 설치하면 풀 리퀘스트, 이슈, 체크를 사용할 수 있습니다.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.api.shell.openUrl('https://cli.github.com')}
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    GitHub CLI 설치
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshGh}>
                    다시 확인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  GitHub CLI는 설치되어 있지만 인증되지 않았습니다. 터미널에서 다음 명령을
                  실행하세요:
                </p>
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-xs">
                  <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
                  gh auth login
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl('https://cli.github.com/manual/gh_auth_login')
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshGh}>
                    다시 확인
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* GitLab */}
      <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Gitlab className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">GitLab</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">glab</span> CLI로 머지 리퀘스트, 이슈,
              할 일, 파이프라인을 사용합니다.
            </p>
          </div>
          {glabStatus === 'checking' ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : glabStatus === 'connected' ? (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              연결됨
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {glabStatus === 'not-installed' ? '설치 안 됨' : '인증 안 됨'}
            </span>
          )}
        </div>

        {glabStatus !== 'checking' && glabStatus !== 'connected' && (
          <div className="mt-3 rounded-md border border-border/30 bg-background/50 px-3 py-2.5 space-y-2">
            {glabStatus === 'not-installed' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  GitLab CLI를 설치하면 머지 리퀘스트, 이슈, 파이프라인을 사용할 수 있습니다.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl('https://gitlab.com/gitlab-org/cli#installation')
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    GitLab CLI 설치
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshGlab}>
                    다시 확인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  GitLab CLI는 설치되어 있지만 인증되지 않았습니다. 터미널에서 다음 명령을
                  실행하세요:
                </p>
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-xs">
                  <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
                  glab auth login
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl(
                        'https://gitlab.com/gitlab-org/cli/-/blob/main/docs/source/auth/login.md'
                      )
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshGlab}>
                    다시 확인
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bitbucket */}
      <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <GitPullRequestArrow className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">Bitbucket</p>
            <p className="text-xs text-muted-foreground">
              {bitbucketStatus === 'connected'
                ? bitbucketAccount
                  ? `${bitbucketAccount} · 풀 리퀘스트 및 빌드 상태`
                  : '풀 리퀘스트 및 빌드 상태'
                : 'Bitbucket Cloud API 토큰으로 풀 리퀘스트 및 빌드 상태를 사용합니다.'}
            </p>
          </div>
          {bitbucketStatus === 'checking' ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : bitbucketStatus === 'connected' ? (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              연결됨
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {bitbucketStatus === 'not-configured' ? '미설정' : '인증 실패'}
            </span>
          )}
        </div>

        {bitbucketStatus !== 'checking' && bitbucketStatus !== 'connected' && (
          <div className="mt-3 rounded-md border border-border/30 bg-background/50 px-3 py-2.5 space-y-2">
            {bitbucketStatus === 'not-configured' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Set <span className="font-mono text-[11px]">ORCA_BITBUCKET_EMAIL</span> and{' '}
                  <span className="font-mono text-[11px]">ORCA_BITBUCKET_API_TOKEN</span>, or set{' '}
                  <span className="font-mono text-[11px]">ORCA_BITBUCKET_ACCESS_TOKEN</span>.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl(
                        'https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/'
                      )
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshBitbucket}>
                    다시 확인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Bitbucket 자격 증명은 설정되어 있지만 인증할 수 없습니다. 토큰과 저장소
                  권한을 확인하고, 환경 변수를 바꿨다면 Orca를 다시 시작하세요.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl(
                        'https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/'
                      )
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshBitbucket}>
                    다시 확인
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Azure DevOps */}
      <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <GitPullRequestArrow className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">Azure DevOps</p>
            <p className="text-xs text-muted-foreground">
              {azureDevOpsStatus === 'configured'
                ? azureDevOpsAccount
                  ? `${azureDevOpsAccount} · 풀 리퀘스트 및 빌드 상태`
                  : azureDevOpsBaseUrl
                    ? `${azureDevOpsBaseUrl} · 풀 리퀘스트 및 빌드 상태`
                    : '감지된 Azure Repos의 풀 리퀘스트 및 빌드 상태'
                : 'Azure DevOps REST API 토큰으로 풀 리퀘스트 및 빌드 상태를 사용합니다.'}
            </p>
          </div>
          {azureDevOpsStatus === 'checking' ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : azureDevOpsStatus === 'configured' ? (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              {azureDevOpsAccount ? '연결됨' : '설정됨'}
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {azureDevOpsStatus === 'not-configured' ? '미설정' : '인증 실패'}
            </span>
          )}
        </div>

        {azureDevOpsStatus !== 'checking' && azureDevOpsStatus !== 'configured' && (
          <div className="mt-3 rounded-md border border-border/30 bg-background/50 px-3 py-2.5 space-y-2">
            {azureDevOpsStatus === 'not-configured' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">ORCA_AZURE_DEVOPS_TOKEN</span>을 설정하거나{' '}
                  <span className="font-mono text-[11px]">ORCA_AZURE_DEVOPS_ACCESS_TOKEN</span>을
                  설정하세요. <span className="font-mono text-[11px]">ORCA_AZURE_DEVOPS_API_BASE_URL</span>은 Orca가 git 원격에서 API 기본 URL을 추론할 수 없을 때만 설정하세요.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl(
                        'https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate'
                      )
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshAzureDevOps}>
                    다시 확인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Azure DevOps 자격 증명은 설정되어 있지만 인증할 수 없습니다. 토큰, API 기본
                  URL, 저장소 권한을 확인하고, 환경 변수를 바꿨다면 Orca를 다시 시작하세요.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl(
                        'https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/get-pull-requests'
                      )
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshAzureDevOps}>
                    다시 확인
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Gitea */}
      <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <GitPullRequestArrow className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">Gitea</p>
            <p className="text-xs text-muted-foreground">
              {giteaStatus === 'configured'
                ? giteaAccount
                  ? `${giteaAccount} · 풀 리퀘스트 및 커밋 상태`
                  : giteaBaseUrl
                    ? `${giteaBaseUrl} · 풀 리퀘스트 및 커밋 상태`
                    : '감지된 저장소의 풀 리퀘스트 및 커밋 상태'
                : 'Gitea REST API로 풀 리퀘스트 및 커밋 상태를 사용합니다.'}
            </p>
          </div>
          {giteaStatus === 'checking' ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : giteaStatus === 'configured' ? (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              {giteaAccount ? '연결됨' : '설정됨'}
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {giteaStatus === 'not-configured' ? '선택 설정' : '인증 실패'}
            </span>
          )}
        </div>

        {giteaStatus !== 'checking' && giteaStatus !== 'configured' && (
          <div className="mt-3 rounded-md border border-border/30 bg-background/50 px-3 py-2.5 space-y-2">
            {giteaStatus === 'not-configured' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Public repositories are detected from their git remote. Set{' '}
                  <span className="font-mono text-[11px]">ORCA_GITEA_TOKEN</span> for private
                  repositories, and set{' '}
                  <span className="font-mono text-[11px]">ORCA_GITEA_API_BASE_URL</span> only when
                  Orca cannot derive the API URL from the remote.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl('https://docs.gitea.com/next/development/api-usage')
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshGitea}>
                    다시 확인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Gitea credentials are configured but could not authenticate. Check the token, API
                  base URL, and repository permissions, then restart Orca if environment variables
                  changed.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.api.shell.openUrl('https://docs.gitea.com/next/development/api-usage')
                    }
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    자세히 보기
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefreshGitea}>
                    다시 확인
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Linear */}
      <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <LinearIcon className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">Linear</p>
            <p className="text-xs text-muted-foreground">
              {linearStatus.connected
                ? `${linearWorkspaces.length}개 작업공간 연결됨`
                : '이슈를 찾아보고 연결하려면 Linear 접근을 추가하세요.'}
            </p>
          </div>
          {linearStatus.connected ? (
            <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setLinearDialogOpen(true)}>
                작업공간 접근 추가
              </Button>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                연결됨
              </span>
            </div>
          ) : (
            <button
              className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setLinearDialogOpen(true)}
            >
              Linear 접근 추가
            </button>
          )}
        </div>

        {linearStatus.connected && (
          <div className="mt-3 space-y-2">
            {linearWorkspaces.map((workspace) => {
              const testResult = linearTestResultByWorkspace[workspace.id]
              const testing = linearTestingWorkspaceId === workspace.id
              return (
                <div
                  key={workspace.id}
                  className="flex items-center gap-3 rounded-md border border-border/50 bg-background/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {workspace.organizationName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {workspace.displayName}
                      {workspace.email ? ` · ${workspace.email}` : ''}
                    </p>
                  </div>
                  {testResult?.state === 'ok' ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      Verified
                    </span>
                  ) : null}
                  {testResult?.state === 'error' ? (
                    <span className="flex min-w-0 max-w-[220px] shrink items-center gap-1 truncate text-xs text-destructive">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span className="truncate">{testResult.error}</span>
                    </span>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleLinearTest(workspace.id)}
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />
                        Testing…
                      </>
                    ) : (
                      'Test'
                    )}
                  </Button>
                  <button
                    onClick={() => void handleLinearDisconnect(workspace.id)}
                    aria-label={`Disconnect ${workspace.organizationName}`}
                    className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
                  >
                    <Unlink className="size-3.5" />
                  </button>
                </div>
              )
            })}
            <p className="text-[11px] text-muted-foreground/70">
              Each connected Linear workspace has one key stored by the active runtime. Full-access
              keys can cover all teams the key owner can access; restricted keys can be replaced any
              time.
            </p>
          </div>
        )}
      </div>

      <LinearApiKeyDialog
        open={linearDialogOpen}
        onOpenChange={setLinearDialogOpen}
        connectLabel="Linear 접근 추가"
        onConnected={() => setLinearTestResultByWorkspace({})}
      />
    </div>
  )
}
