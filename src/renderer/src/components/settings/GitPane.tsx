import type { GlobalSettings } from '../../../../shared/types'
import type { SourceControlAiSettingsPatch } from '../../../../shared/source-control-ai-types'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useAppStore } from '../../store'
import { GIT_PANE_SEARCH_ENTRIES } from './git-search'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { GitHubRateLimitPanel } from '../github/github-rate-limit-display'
import { AutoRenameBranchFromWorkSetting } from './AutoRenameBranchFromWorkSetting'
import { AUTO_RENAME_BRANCH_SEARCH_ENTRIES } from './auto-rename-branch-search'
import { GitLabRateLimitPanel } from '../gitlab/gitlab-rate-limit-display'

export { GIT_PANE_SEARCH_ENTRIES }

export function shouldShowAutoRenameBranchSetting(
  searchQuery: string,
  hasUnsavedBranchPromptChanges: boolean
): boolean {
  return (
    hasUnsavedBranchPromptChanges ||
    matchesSettingsSearch(searchQuery, AUTO_RENAME_BRANCH_SEARCH_ENTRIES)
  )
}

type GitPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  writeSourceControlAiSettings: (patch: SourceControlAiSettingsPatch) => Promise<void>
  displayedGitUsername: string
  hasUnsavedBranchPromptChanges?: boolean
  onBranchPromptDirtyChange?: (dirty: boolean) => void
  branchPromptDiscardSignal?: number
  settingsSearchQuery?: string
}

export function GitPane({
  settings,
  updateSettings,
  writeSourceControlAiSettings,
  displayedGitUsername,
  hasUnsavedBranchPromptChanges = false,
  onBranchPromptDirtyChange,
  branchPromptDiscardSignal,
  settingsSearchQuery
}: GitPaneProps): React.JSX.Element {
  const storeSearchQuery = useAppStore((s) => s.settingsSearchQuery)
  const searchQuery = settingsSearchQuery ?? storeSearchQuery

  const visibleSections = [
    matchesSettingsSearch(searchQuery, {
      title: '브랜치 접두사',
      description: '작업 트리를 만들 때 브랜치 이름 앞에 붙는 접두사입니다.',
      keywords: ['branch naming', 'git username', 'custom']
    }) ? (
      <SearchableSetting
        key="branch-prefix"
        title="브랜치 접두사"
        description="작업 트리를 만들 때 브랜치 이름 앞에 붙는 접두사입니다."
        keywords={['branch naming', 'git username', 'custom']}
        className="space-y-3"
      >
        <div className="space-y-0.5">
          <Label>브랜치 접두사</Label>
          <p className="text-xs text-muted-foreground">
            브랜치 이름에 Git 사용자 이름, 사용자 지정 접두사, 또는 접두사 없음 중 무엇을 사용할지
            선택하세요.
          </p>
        </div>
        <div className="flex w-fit gap-1 rounded-md border border-border/50 p-1">
          {(['git-username', 'custom', 'none'] as const).map((option) => (
            <button
              key={option}
              onClick={() => updateSettings({ branchPrefix: option })}
              className={`rounded-sm px-3 py-1 text-sm transition-colors ${
                settings.branchPrefix === option
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option === 'git-username'
                ? 'Git 사용자 이름'
                : option === 'custom'
                  ? '사용자 지정'
                  : '없음'}
            </button>
          ))}
        </div>
        {(settings.branchPrefix === 'custom' || settings.branchPrefix === 'git-username') && (
          <Input
            value={
              settings.branchPrefix === 'git-username'
                ? displayedGitUsername
                : settings.branchPrefixCustom
            }
            onChange={(e) => updateSettings({ branchPrefixCustom: e.target.value })}
            placeholder={
              settings.branchPrefix === 'git-username'
                ? 'Git 사용자 이름이 설정되어 있지 않습니다'
                : '예: feature'
            }
            className="max-w-xs"
            readOnly={settings.branchPrefix === 'git-username'}
          />
        )}
      </SearchableSetting>
    ) : null,
    matchesSettingsSearch(searchQuery, {
      title: '로컬 기준 ref 새로고침',
      description: '로컬 main 또는 master를 안전하게 fast-forward해 새 기준을 사용합니다.',
      keywords: [
        'main',
        'master',
        'origin/main',
        'git diff',
        'base ref',
        'fresh base',
        'safely',
        'worktree'
      ]
    }) ? (
      <SearchableSetting
        key="refresh-base-ref"
        title="로컬 기준 ref 새로고침"
        description="로컬 main 또는 master를 안전하게 fast-forward하여 새 기준을 사용합니다."
        keywords={[
          'main',
          'master',
          'origin/main',
          'git diff',
          'base ref',
          'fresh base',
          'safely',
          'worktree'
        ]}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>로컬 기준 ref 새로고침</Label>
          <p className="text-xs text-muted-foreground">
            당신이나 AI 도구가 <code>git diff main...HEAD</code> 같은 명령을 사용한다면 켜세요.
            Korca는 먼저 원격 기준을 새로고침한 뒤, 대응하는 로컬 <code>main</code> 또는{' '}
            <code>master</code>를 안전하게 fast-forward해 오래된 이력과 비교하지 않게 합니다. 로컬
            브랜치가 수정되었거나 분기된 경우에는 업데이트를 건너뜁니다.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.refreshLocalBaseRefOnWorktreeCreate}
          onClick={() =>
            updateSettings({
              refreshLocalBaseRefOnWorktreeCreate: !settings.refreshLocalBaseRefOnWorktreeCreate
            })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            settings.refreshLocalBaseRefOnWorktreeCreate
              ? 'bg-foreground'
              : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              settings.refreshLocalBaseRefOnWorktreeCreate ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </SearchableSetting>
    ) : null,
    shouldShowAutoRenameBranchSetting(searchQuery, hasUnsavedBranchPromptChanges) ? (
      <AutoRenameBranchFromWorkSetting
        key="auto-rename-branch-from-work"
        settings={settings}
        updateSettings={updateSettings}
        writeSourceControlAiSettings={writeSourceControlAiSettings}
        forceVisible={hasUnsavedBranchPromptChanges}
        onBranchPromptDirtyChange={onBranchPromptDirtyChange}
        branchPromptDiscardSignal={branchPromptDiscardSignal}
        settingsSearchQuery={searchQuery}
      />
    ) : null,
    matchesSettingsSearch(searchQuery, {
      title: 'GitHub API 예산',
      description: '현재 GitHub CLI REST, Search, GraphQL rate limit 상태입니다.',
      keywords: ['github', 'gh', 'graphql', 'rate limit', 'api budget']
    }) ? (
      <SearchableSetting
        key="github-api-budget"
        title="GitHub API 예산"
        description="현재 GitHub CLI REST, Search, GraphQL rate limit 상태입니다."
        keywords={['github', 'gh', 'graphql', 'rate limit', 'api budget']}
        className="space-y-3"
      >
        <GitHubRateLimitPanel />
      </SearchableSetting>
    ) : null,
    matchesSettingsSearch(searchQuery, {
      title: 'GitLab API 예산',
      description: '가능하면 현재 GitLab CLI REST rate-limit 헤더를 표시합니다.',
      keywords: ['gitlab', 'glab', 'rate limit', 'api budget']
    }) ? (
      <SearchableSetting
        key="gitlab-api-budget"
        title="GitLab API 예산"
        description="가능하면 현재 GitLab CLI REST rate-limit 헤더를 표시합니다."
        keywords={['gitlab', 'glab', 'rate limit', 'api budget']}
        className="space-y-3"
      >
        <GitLabRateLimitPanel />
      </SearchableSetting>
    ) : null,
    matchesSettingsSearch(searchQuery, {
      title: 'Korca 표기',
      description: '커밋, PR, 이슈에 Korca 표기를 추가합니다.',
      keywords: ['github', 'gh', 'pr', 'issue', 'co-author', 'coauthored', 'attribution', 'korca']
    }) ? (
      <SearchableSetting
        key="github-attribution"
        title="Korca 표기"
        description="커밋, PR, 이슈에 Korca 표기를 추가합니다."
        keywords={[
          'github',
          'gh',
          'pr',
          'issue',
          'co-author',
          'coauthored',
          'attribution',
          'korca'
        ]}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>Korca 표기</Label>
          <p className="text-xs text-muted-foreground">커밋, PR, 이슈에 Korca 표기를 추가합니다.</p>
        </div>
        <button
          role="switch"
          aria-checked={settings.enableGitHubAttribution}
          onClick={() =>
            updateSettings({
              enableGitHubAttribution: !settings.enableGitHubAttribution
            })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            settings.enableGitHubAttribution ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              settings.enableGitHubAttribution ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </SearchableSetting>
    ) : null
  ].filter(Boolean)

  return <div className="space-y-4">{visibleSections}</div>
}
