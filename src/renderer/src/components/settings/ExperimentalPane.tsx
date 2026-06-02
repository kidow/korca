import type { GlobalSettings } from '../../../../shared/types'
import { Label } from '../ui/label'
import { useAppStore } from '../../store'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { EXPERIMENTAL_PANE_SEARCH_ENTRIES, EXPERIMENTAL_SEARCH_ENTRY } from './experimental-search'
import { HiddenExperimentalGroup } from './HiddenExperimentalGroup'

export { EXPERIMENTAL_PANE_SEARCH_ENTRIES }

type ExperimentalPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  /** Hidden-experimental group is only rendered once the user has unlocked
   *  it via Shift-clicking the Experimental sidebar entry. */
  hiddenExperimentalUnlocked?: boolean
}

export function ExperimentalPane({
  settings,
  updateSettings,
  hiddenExperimentalUnlocked = false
}: ExperimentalPaneProps): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const showPet = matchesSettingsSearch(searchQuery, [EXPERIMENTAL_SEARCH_ENTRY.pet])
  const showAgentsView = matchesSettingsSearch(searchQuery, [EXPERIMENTAL_SEARCH_ENTRY.activity])
  const showTerminalAttention = matchesSettingsSearch(searchQuery, [
    EXPERIMENTAL_SEARCH_ENTRY.terminalAttention
  ])
  const showCompactWorktreeCards = matchesSettingsSearch(searchQuery, [
    EXPERIMENTAL_SEARCH_ENTRY.compactWorktreeCards
  ])
  const showWorktreeSymlinks = matchesSettingsSearch(searchQuery, [
    EXPERIMENTAL_SEARCH_ENTRY.symlinks
  ])
  const showUnifiedNewTabLauncher = matchesSettingsSearch(searchQuery, [
    EXPERIMENTAL_SEARCH_ENTRY.unifiedNewTabLauncher
  ])

  return (
    <div className="space-y-4">
      {showPet ? (
        <SearchableSetting
          title="Pet"
          description="Floating animated pet in the bottom-right corner."
          keywords={EXPERIMENTAL_SEARCH_ENTRY.pet.keywords}
          className="space-y-3 py-2"
          id="experimental-pet"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink space-y-1.5">
              <Label>펫</Label>
              <p className="text-xs text-muted-foreground">
                Shows a small animated pet pinned to the bottom-right corner. Pick a character
                (Claudino, OpenCode, Gremlin) 또는 PNG, APNG, GIF, WebP, JPG, SVG 파일을 직접 올릴
                수 있습니다 from the status-bar pet menu. Hide it any time from the same menu
                without disabling this setting.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.experimentalPet}
              onClick={() => {
                updateSettings({ experimentalPet: !settings.experimentalPet })
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
                settings.experimentalPet ? 'bg-foreground' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
                  settings.experimentalPet ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </SearchableSetting>
      ) : null}

      {showAgentsView ? (
        <SearchableSetting
          title="Agents View"
          description="Threaded left-sidebar feed for agent completions and blocking states."
          keywords={EXPERIMENTAL_SEARCH_ENTRY.activity.keywords}
          className="space-y-3 py-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink space-y-0.5">
              <Label>에이전트 보기</Label>
              <p className="text-xs text-muted-foreground">
                Adds an Agents entry to the left sidebar with a threaded worktree feed for completed
                agents, blocking questions, unread state, and worktree creation events. Experimental
                — the event model and UI may change.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.experimentalActivity}
              onClick={() =>
                updateSettings({
                  experimentalActivity: !settings.experimentalActivity
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
                settings.experimentalActivity ? 'bg-foreground' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
                  settings.experimentalActivity ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </SearchableSetting>
      ) : null}

      {showTerminalAttention ? (
        <SearchableSetting
          title="Terminal attention"
          description="Persistent pane highlight for terminal bell and agent-completion events."
          keywords={EXPERIMENTAL_SEARCH_ENTRY.terminalAttention.keywords}
          className="space-y-3 py-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink space-y-0.5">
              <Label>터미널 주목도</Label>
              <p className="text-xs text-muted-foreground">
                Keeps a pane-level highlight visible after terminal bell or agent-completion events
                until you interact with that pane. Experimental while we tune the signal.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.experimentalTerminalAttention}
              onClick={() =>
                updateSettings({
                  experimentalTerminalAttention: !settings.experimentalTerminalAttention
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
                settings.experimentalTerminalAttention ? 'bg-foreground' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
                  settings.experimentalTerminalAttention ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </SearchableSetting>
      ) : null}

      {showCompactWorktreeCards ? (
        <SearchableSetting
          title="압축된 워크트리 카드"
          description="Use one-line worktree cards instead of the detailed metadata row."
          keywords={EXPERIMENTAL_SEARCH_ENTRY.compactWorktreeCards.keywords}
          className="space-y-3 py-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink space-y-0.5">
              <Label>작업 트리 카드 압축</Label>
              <p className="text-xs text-muted-foreground">
                Keeps workspace cards to a single title row. The detailed layout restores the
                branch, project, cache timer, and selected properties on a second row.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.experimentalCompactWorktreeCards}
              onClick={() =>
                updateSettings({
                  experimentalCompactWorktreeCards: !settings.experimentalCompactWorktreeCards
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
                settings.experimentalCompactWorktreeCards
                  ? 'bg-foreground'
                  : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
                  settings.experimentalCompactWorktreeCards ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </SearchableSetting>
      ) : null}

      {showWorktreeSymlinks ? (
        <SearchableSetting
          title="Symlinks on worktrees"
          description="Automatically symlink configured files or folders into newly created worktrees."
          keywords={EXPERIMENTAL_SEARCH_ENTRY.symlinks.keywords}
          className="space-y-3 py-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink space-y-0.5">
              <Label>작업 트리 심볼릭 링크</Label>
              <p className="text-xs text-muted-foreground">
                Allows for automatic symlinks of certain folders or files that must be connected to
                created worktrees.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.experimentalWorktreeSymlinks}
              onClick={() =>
                updateSettings({
                  experimentalWorktreeSymlinks: !settings.experimentalWorktreeSymlinks
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
                settings.experimentalWorktreeSymlinks ? 'bg-foreground' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
                  settings.experimentalWorktreeSymlinks ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </SearchableSetting>
      ) : null}

      {showUnifiedNewTabLauncher ? (
        <SearchableSetting
          title="스마트 새 탭 메뉴"
          description="새 탭 메뉴에 입력하면 터미널을 열고, 에이전트를 시작하고, URL을 방문하고, 파일을 열거나 만들 수 있습니다."
          keywords={EXPERIMENTAL_SEARCH_ENTRY.unifiedNewTabLauncher.keywords}
          className="space-y-3 py-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink space-y-0.5">
              <Label>스마트 새 탭 메뉴</Label>
              <p className="text-xs text-muted-foreground">
                새 탭 메뉴에 입력하면 터미널을 열고, 에이전트를 시작하고, URL을 방문하고, 파일을
                열거나 만들 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.experimentalUnifiedNewTabLauncher}
              onClick={() =>
                updateSettings({
                  experimentalUnifiedNewTabLauncher: !settings.experimentalUnifiedNewTabLauncher
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
                settings.experimentalUnifiedNewTabLauncher
                  ? 'bg-foreground'
                  : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
                  settings.experimentalUnifiedNewTabLauncher ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </SearchableSetting>
      ) : null}

      {hiddenExperimentalUnlocked ? <HiddenExperimentalGroup /> : null}
    </div>
  )
}
