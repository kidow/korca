import { useCallback, useRef, useState } from 'react'
import type { KorcaHooks, Repo, RepoHookSettings } from '../../../../shared/types'
import { getRepoKindLabel, isFolderRepo } from '../../../../shared/repo-kind'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { Trash2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { BaseRefPicker } from './BaseRefPicker'
import { RepositoryHooksSection } from './RepositoryHooksSection'
import { McpConfigSection } from './McpConfigSection'
import { WorktreeSymlinksSection } from './WorktreeSymlinksSection'
import { SparsePresetSettingsSection } from './SparsePresetSettingsSection'
import { RepositorySourceControlAiSection } from './RepositorySourceControlAiSection'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch, normalizeSettingsSearchQuery } from './settings-search'
import { useAppStore } from '../../store'
import { getRepositoryIconSectionId } from './repository-settings-targets'
import { RepositoryIconPicker } from './RepositoryIconPicker'
import { getRepositoryPaneSearchEntries } from './repository-search'
export { getRepositoryPaneSearchEntries }

type RepositoryPaneProps = {
  repo: Repo
  yamlHooks: KorcaHooks | null
  hasHooksFile: boolean
  hooksInspectionReady: boolean
  mayNeedUpdate: boolean
  updateRepo: (repoId: string, updates: Partial<Repo>) => void
  removeProject: (repoId: string) => void
}

export function matchesRepositoryIdentitySearch(query: string, repo: Repo): boolean {
  const normalizedQuery = normalizeSettingsSearchQuery(query)
  if (!normalizedQuery) {
    return false
  }
  return [repo.displayName, repo.path].some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  )
}

export function RepositoryPane({
  repo,
  yamlHooks,
  hasHooksFile,
  hooksInspectionReady,
  mayNeedUpdate,
  updateRepo,
  removeProject
}: RepositoryPaneProps): React.JSX.Element {
  const isFolder = isFolderRepo(repo)
  const searchQuery = useAppStore((state) => state.settingsSearchQuery)
  const settings = useAppStore((state) => state.settings)
  const symlinksEnabled = settings?.experimentalWorktreeSymlinks
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const copiedTemplateResetTimerRef = useRef<number | null>(null)
  // Why: clipboard IPC can resolve after settings navigation; avoid starting
  // a reset timer that will outlive this pane.
  const isMountedRef = useRef(false)
  // Why: searching a project name is navigation to that project, not a
  // request to hide every child row that does not repeat the project name.
  const forceFullPaneForRepoMatch = matchesRepositoryIdentitySearch(searchQuery, repo)

  const clearCopiedTemplateResetTimer = useCallback((): void => {
    if (copiedTemplateResetTimerRef.current !== null) {
      window.clearTimeout(copiedTemplateResetTimerRef.current)
      copiedTemplateResetTimerRef.current = null
    }
  }, [])

  const setRepositoryPaneRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      isMountedRef.current = node !== null
      if (node === null) {
        clearCopiedTemplateResetTimer()
      }
    },
    [clearCopiedTemplateResetTimer]
  )

  const handleRemoveProject = (repoId: string) => {
    if (confirmingRemove === repoId) {
      removeProject(repoId)
      setConfirmingRemove(null)
      return
    }

    setConfirmingRemove(repoId)
  }

  const updateSelectedRepoHookSettings = (nextSettings: RepoHookSettings) => {
    updateRepo(repo.id, {
      hookSettings: nextSettings
    })
  }

  const handleCopyTemplate = async () => {
    // Why: the missing-`korca.yaml` state is a migration aid, so copying the shared-template
    // snippet should be one click rather than forcing users to reconstruct the expected shape.
    await window.api.ui.writeClipboardText(`scripts:
  setup: |
    pnpm worktree:setup
  archive: |
    echo "Cleaning up before archive"`)
    if (!isMountedRef.current) {
      return
    }
    clearCopiedTemplateResetTimer()
    setCopiedTemplate(true)
    copiedTemplateResetTimerRef.current = window.setTimeout(() => {
      copiedTemplateResetTimerRef.current = null
      setCopiedTemplate(false)
    }, 1500)
  }

  const allEntries = getRepositoryPaneSearchEntries(repo)
  const identityEntries = allEntries.filter((entry) =>
    [
      '표시 이름',
      '프로젝트 아이콘',
      '기본 워크트리 기준',
      '워크트리 위치',
      '프로젝트 제거'
    ].includes(entry.title)
  )
  const sparsePresetEntries = allEntries.filter((entry) =>
    ['Sparse Checkout 프리셋'].includes(entry.title)
  )
  const hooksEntries = allEntries.filter((entry) =>
    [
      '설정 스크립트',
      '보관 스크립트',
      '고급',
      '설정 스크립트 실행 시점',
      '사용자 지정 GitHub 이슈 명령'
    ].includes(entry.title)
  )
  const mcpEntries = allEntries.filter((entry) => entry.title === 'MCP 구성')
  const symlinkEntries = allEntries.filter((entry) => entry.title === '워크트리 심볼릭 링크')
  const sourceControlAiEntries = allEntries.filter((entry) => entry.title === '소스 컨트롤 AI')
  const removeProjectLabel = confirmingRemove === repo.id ? '프로젝트 제거 확인' : '프로젝트 제거'

  const hooksSection =
    !isFolder && (forceFullPaneForRepoMatch || matchesSettingsSearch(searchQuery, hooksEntries)) ? (
      <RepositoryHooksSection
        key="hooks"
        repo={repo}
        yamlHooks={yamlHooks}
        hasHooksFile={hasHooksFile}
        hooksInspectionReady={hooksInspectionReady}
        mayNeedUpdate={mayNeedUpdate}
        copiedTemplate={copiedTemplate}
        forceVisible={forceFullPaneForRepoMatch}
        onCopyTemplate={() => void handleCopyTemplate()}
        onUpdateHookSettings={updateSelectedRepoHookSettings}
      />
    ) : null

  // Why: Identity (name, icon, base ref) stays at the top so it's the first
  // thing a user sees. Setup commands follow immediately because they're the
  // most-edited surface and should beat MCP/symlinks/sparse-presets.
  const visibleSections = [
    forceFullPaneForRepoMatch || matchesSettingsSearch(searchQuery, identityEntries) ? (
      <section key="identity" className="relative space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 pr-12">
            <h3 className="text-sm font-semibold">식별 정보</h3>
            <p className="text-xs text-muted-foreground">
              사이드바와 탭에 표시할 이 프로젝트의 표시 정보입니다.
            </p>
            <p className="text-xs text-muted-foreground">
              Type: <span className="text-foreground">{getRepoKindLabel(repo)}</span>
            </p>
            {isFolder ? (
              <p className="text-xs text-muted-foreground">
                폴더로 열렸습니다. 이 작업 공간에서는 Git 기능을 사용할 수 없습니다.
              </p>
            ) : null}
          </div>
          <SearchableSetting
            title="프로젝트 제거"
            description="이 프로젝트를 Korca에서 제거합니다."
            keywords={[repo.displayName, 'delete', 'project', 'repository']}
            className="absolute top-0 right-0 z-10 w-auto max-w-none"
            forceVisible={forceFullPaneForRepoMatch}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={confirmingRemove === repo.id ? 'destructive' : 'outline'}
                  size="icon-sm"
                  onClick={() => handleRemoveProject(repo.id)}
                  onBlur={() => setConfirmingRemove(null)}
                  aria-label={removeProjectLabel}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {removeProjectLabel}
              </TooltipContent>
            </Tooltip>
          </SearchableSetting>
        </div>

        <SearchableSetting
          title="표시 이름"
          description="사이드바와 탭에 표시할 이 프로젝트의 표시 정보입니다."
          keywords={[repo.displayName, repo.path, 'project name', 'repository name']}
          className="space-y-2"
          forceVisible={forceFullPaneForRepoMatch}
        >
          <Label className="text-sm font-semibold">표시 이름</Label>
          <Input
            value={repo.displayName}
            onChange={(e) =>
              updateRepo(repo.id, {
                displayName: e.target.value
              })
            }
            className="h-9 text-sm"
          />
        </SearchableSetting>

        <SearchableSetting
          title="프로젝트 아이콘"
          description="사이드바와 탭에 사용할 프로젝트 아이콘과 색상입니다."
          keywords={[
            repo.displayName,
            repo.path,
            'project icon',
            'repository icon',
            'color',
            'badge',
            'emoji',
            'favicon'
          ]}
          className="space-y-2"
          id={getRepositoryIconSectionId(repo.id)}
          forceVisible={forceFullPaneForRepoMatch}
        >
          <RepositoryIconPicker repo={repo} updateRepo={updateRepo} />
        </SearchableSetting>

        {!isFolder ? (
          <>
            <SearchableSetting
              title="기본 워크트리 기준"
              description="워크트리를 만들 때 사용할 기본 브랜치 또는 ref입니다."
              keywords={[repo.displayName, 'base ref', 'branch']}
              className="space-y-3"
              forceVisible={forceFullPaneForRepoMatch}
            >
              <Label className="text-sm font-semibold">기본 작업 트리 기준</Label>
              <BaseRefPicker
                repoId={repo.id}
                currentBaseRef={repo.worktreeBaseRef}
                onSelect={(ref) => updateRepo(repo.id, { worktreeBaseRef: ref })}
                onUsePrimary={() => updateRepo(repo.id, { worktreeBaseRef: undefined })}
              />
            </SearchableSetting>

            <SearchableSetting
              title="워크트리 위치"
              description="새 워크트리를 위한 이 프로젝트 전용 디렉터리입니다."
              keywords={[
                repo.displayName,
                'worktree path',
                'workspace path',
                'directory',
                'relative',
                '../worktrees'
              ]}
              className="space-y-2"
              forceVisible={forceFullPaneForRepoMatch}
            >
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold">작업 트리 위치</Label>
                {repo.worktreeBasePath ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateRepo(repo.id, { worktreeBasePath: undefined })}
                  >
                    Use Global
                  </Button>
                ) : null}
              </div>
              <Input
                value={repo.worktreeBasePath ?? ''}
                placeholder={settings?.workspaceDir ?? ''}
                onChange={(e) =>
                  updateRepo(repo.id, {
                    worktreeBasePath: e.target.value.trim() ? e.target.value : undefined
                  })
                }
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Relative paths resolve from this project root.
              </p>
            </SearchableSetting>
          </>
        ) : null}
      </section>
    ) : null,
    hooksSection,
    !isFolder &&
    (forceFullPaneForRepoMatch || matchesSettingsSearch(searchQuery, sourceControlAiEntries)) ? (
      <RepositorySourceControlAiSection
        key="source-control-ai"
        repo={repo}
        updateRepo={updateRepo}
      />
    ) : null,
    !isFolder &&
    !repo.connectionId &&
    symlinksEnabled &&
    (forceFullPaneForRepoMatch || matchesSettingsSearch(searchQuery, symlinkEntries)) ? (
      <WorktreeSymlinksSection key="symlinks" repo={repo} updateRepo={updateRepo} />
    ) : null,
    !isFolder &&
    (forceFullPaneForRepoMatch || matchesSettingsSearch(searchQuery, sparsePresetEntries)) ? (
      <SparsePresetSettingsSection key="sparse-presets" repoId={repo.id} />
    ) : null,
    !isFolder && (forceFullPaneForRepoMatch || matchesSettingsSearch(searchQuery, mcpEntries)) ? (
      <McpConfigSection key="mcp-configs" repo={repo} />
    ) : null
  ].filter(Boolean)

  return (
    <div ref={setRepositoryPaneRootRef} className="space-y-8">
      {visibleSections.map((section, index) => (
        <div key={index} className="space-y-8">
          {index > 0 ? <Separator /> : null}
          {section}
        </div>
      ))}
    </div>
  )
}
