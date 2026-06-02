import type { Dispatch, SetStateAction } from 'react'
import type { GlobalSettings } from '../../../../shared/types'
import { ColorField, ThemePicker } from './SettingsFormControls'
import { SearchableSetting } from './SearchableSetting'
import { TerminalSettingsPreview } from './TerminalSettingsPreview'

type DarkTerminalThemeSectionProps = {
  settings: GlobalSettings
  systemPrefersDark: boolean
  themeSearchDark: string
  setThemeSearchDark: Dispatch<SetStateAction<string>>
  updateSettings: (updates: Partial<GlobalSettings>) => void
  previewFontFamily: string | null
}

type LightTerminalThemeSectionProps = {
  settings: GlobalSettings
  themeSearchLight: string
  setThemeSearchLight: Dispatch<SetStateAction<string>>
  updateSettings: (updates: Partial<GlobalSettings>) => void
  previewFontFamily: string | null
}

export function DarkTerminalThemeSection({
  settings,
  systemPrefersDark,
  themeSearchDark,
  setThemeSearchDark,
  updateSettings,
  previewFontFamily
}: DarkTerminalThemeSectionProps): React.JSX.Element {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">다크 테마</h3>
          <p className="text-xs text-muted-foreground">
            다크 모드에서 사용할 터미널 테마를 선택하세요.
          </p>
        </div>

        <SearchableSetting
          title="다크 테마"
          description="다크 모드에서 사용할 터미널 테마를 선택하세요."
          keywords={['terminal', 'theme', 'dark', 'preview']}
        >
          <ThemePicker
            label="다크 테마"
            description="다크 모드에서 사용할 터미널 테마를 선택하세요."
            selectedTheme={settings.terminalThemeDark}
            query={themeSearchDark}
            onQueryChange={setThemeSearchDark}
            onSelectTheme={(theme) => updateSettings({ terminalThemeDark: theme })}
          />
        </SearchableSetting>

        <SearchableSetting
          title="다크 분할선 색상"
          description="다크 모드에서 패널 사이 분할선 색상을 조절합니다."
          keywords={['terminal', 'divider', 'dark', 'color']}
        >
          <ColorField
            label="다크 분할선 색상"
            description="다크 모드에서 패널 사이 분할선 색상을 조절합니다."
            value={settings.terminalDividerColorDark}
            fallback="#3f3f46"
            onChange={(value) => updateSettings({ terminalDividerColorDark: value })}
          />
        </SearchableSetting>
      </div>

      <TerminalSettingsPreview
        title="다크 모드 미리보기"
        settings={settings}
        systemPrefersDark={systemPrefersDark}
        previewFontFamily={previewFontFamily}
        modeOverride="dark"
      />
    </section>
  )
}

export function LightTerminalThemeSection({
  settings,
  themeSearchLight,
  setThemeSearchLight,
  updateSettings,
  previewFontFamily
}: LightTerminalThemeSectionProps): React.JSX.Element {
  return (
    <section className="space-y-4">
      <SearchableSetting
        title="라이트 모드에 별도 테마 사용"
        description="끄면 라이트 모드가 다크 터미널 테마를 그대로 사용합니다."
        keywords={['terminal', 'light mode', 'theme']}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <p className="text-sm font-medium">라이트 모드에 별도 테마 사용</p>
          <p className="text-xs text-muted-foreground">
            끄면 라이트 모드가 다크 터미널 테마를 그대로 사용합니다.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.terminalUseSeparateLightTheme}
          onClick={() =>
            updateSettings({
              terminalUseSeparateLightTheme: !settings.terminalUseSeparateLightTheme
            })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            settings.terminalUseSeparateLightTheme ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              settings.terminalUseSeparateLightTheme ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </SearchableSetting>

      {settings.terminalUseSeparateLightTheme ? (
        <div className="grid overflow-hidden pt-2">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">라이트 테마</h3>
                <p className="text-xs text-muted-foreground">
                  선택 사항인 라이트 모드 터미널 모양을 설정합니다.
                </p>
              </div>

              <SearchableSetting
                title="라이트 테마"
                description="Korca가 라이트 모드일 때 사용할 테마를 선택하세요."
                keywords={['terminal', 'theme', 'light', 'preview']}
              >
                <ThemePicker
                  label="라이트 테마"
                  description="Korca가 라이트 모드일 때 사용할 테마를 선택하세요."
                  selectedTheme={settings.terminalThemeLight}
                  query={themeSearchLight}
                  onQueryChange={setThemeSearchLight}
                  onSelectTheme={(theme) => updateSettings({ terminalThemeLight: theme })}
                />
              </SearchableSetting>

              <SearchableSetting
                title="라이트 분할선 색상"
                description="라이트 모드에서 패널 사이 분할선 색상을 조절합니다."
                keywords={['terminal', 'divider', 'light', 'color']}
              >
                <ColorField
                  label="라이트 분할선 색상"
                  description="라이트 모드에서 패널 사이 분할선 색상을 조절합니다."
                  value={settings.terminalDividerColorLight}
                  fallback="#d4d4d8"
                  onChange={(value) => updateSettings({ terminalDividerColorLight: value })}
                />
              </SearchableSetting>
            </div>

            <TerminalSettingsPreview
              title="라이트 모드 미리보기"
              settings={settings}
              systemPrefersDark={false}
              previewFontFamily={previewFontFamily}
              modeOverride="light"
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
