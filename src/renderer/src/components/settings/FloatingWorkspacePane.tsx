import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import type { FloatingTerminalTriggerLocation, GlobalSettings } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { SearchableSetting } from './SearchableSetting'
import { SettingsRow, SettingsSwitchRow } from './SettingsFormControls'
import { FLOATING_WORKSPACE_SEARCH_ENTRIES } from './floating-workspace-search'
import { matchesSettingsSearch } from './settings-search'
import { useAppStore } from '../../store'

type FloatingWorkspacePaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function getFloatingWorkspaceDirectoryInputValue({
  configuredFloatingWorkspacePath,
  resolvedFloatingWorkspacePath
}: {
  configuredFloatingWorkspacePath: string
  resolvedFloatingWorkspacePath: string
}): string {
  const configuredPath = configuredFloatingWorkspacePath.trim()
  if (!configuredPath || configuredPath === '~') {
    return '~'
  }
  return resolvedFloatingWorkspacePath
}

export function FloatingWorkspacePane({
  settings,
  updateSettings
}: FloatingWorkspacePaneProps): React.JSX.Element | null {
  const searchQuery = useAppStore((state) => state.settingsSearchQuery)
  const [resolvedFloatingWorkspacePath, setResolvedFloatingWorkspacePath] = useState('')

  useEffect(() => {
    let cancelled = false
    void window.api.app
      .getFloatingTerminalCwd({
        path: settings.floatingTerminalCwd
      })
      .then((path) => {
        if (!cancelled) {
          setResolvedFloatingWorkspacePath(path)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedFloatingWorkspacePath('')
        }
      })
    return () => {
      cancelled = true
    }
  }, [settings.floatingTerminalCwd])

  const pickFloatingWorkspaceDirectory = async (): Promise<void> => {
    const path = await window.api.app.pickFloatingWorkspaceDirectory()
    if (!path) {
      return
    }
    useAppStore.getState().recordFeatureInteraction('floating-workspace')
    updateSettings({ floatingTerminalCwd: path })
  }

  const directoryInputValue = getFloatingWorkspaceDirectoryInputValue({
    configuredFloatingWorkspacePath: settings.floatingTerminalCwd,
    resolvedFloatingWorkspacePath
  })

  if (!matchesSettingsSearch(searchQuery, FLOATING_WORKSPACE_SEARCH_ENTRIES)) {
    return null
  }

  return (
    <section className="space-y-4">
      <SearchableSetting
        title="떠다니는 작업 공간"
        description="떠다니는 작업 공간을 켜고 새 탭의 시작 위치를 선택합니다."
        keywords={[
          'floating workspace',
          'floating terminal',
          'terminal',
          'browser',
          'markdown',
          'note',
          'global',
          'quick panel',
          'launch directory'
        ]}
        className="divide-y divide-border/40"
      >
        <SettingsSwitchRow
          label="떠다니는 작업 공간 사용"
          description="떠다니는 작업 공간 버튼과 패널을 표시합니다."
          checked={settings.floatingTerminalEnabled}
          onChange={() => {
            if (!settings.floatingTerminalEnabled) {
              useAppStore.getState().recordFeatureInteraction('floating-workspace')
            }
            updateSettings({
              floatingTerminalEnabled: !settings.floatingTerminalEnabled
            })
          }}
        />

        <SettingsRow
          alignTop
          label="터미널 디렉터리"
          description="새로 연 떠다니는 터미널 탭의 시작 위치입니다. Markdown 메모는 Korca가 소유한 떠다니는 작업 공간에 저장됩니다."
          control={
            <div className="flex w-72 max-w-full gap-2">
              <Input
                value={directoryInputValue}
                readOnly
                placeholder="~"
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="떠다니는 작업 공간 디렉터리 선택"
                onClick={() => void pickFloatingWorkspaceDirectory()}
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          }
        />

        <SettingsRow
          label="토글 버튼 위치"
          description="토글이 어디에 표시되든 키보드 단축키는 동작합니다."
          control={
            <ToggleGroup
              type="single"
              value={settings.floatingTerminalTriggerLocation ?? 'floating-button'}
              onValueChange={(value) => {
                if (!value) {
                  return
                }
                updateSettings({
                  floatingTerminalTriggerLocation: value as FloatingTerminalTriggerLocation
                })
                useAppStore.getState().recordFeatureInteraction('floating-workspace')
              }}
            >
              <ToggleGroupItem value="floating-button">떠다니는 버튼</ToggleGroupItem>
              <ToggleGroupItem value="status-bar">상태 표시줄</ToggleGroupItem>
            </ToggleGroup>
          }
        />
      </SearchableSetting>
    </section>
  )
}
