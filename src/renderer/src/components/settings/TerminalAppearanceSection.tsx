/* eslint-disable max-lines -- Why: terminal visual controls stay together under Appearance so
   search, previews, and the Ghostty import flow move as one user-facing surface. */
import { useState } from 'react'
import type { GlobalSettings } from '../../../../shared/types'
import {
  DEFAULT_TERMINAL_FONT_WEIGHT,
  TERMINAL_FONT_WEIGHT_MAX,
  TERMINAL_FONT_WEIGHT_MIN,
  TERMINAL_FONT_WEIGHT_STEP,
  normalizeTerminalFontWeight
} from '../../../../shared/terminal-fonts'
import {
  fontFamilyHasKnownLigatures,
  resolveTerminalLigaturesEnabled
} from '../../../../shared/terminal-ligatures'
import { Minus, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  FontAutocomplete,
  NumberField,
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSubsectionHeader,
  SettingsSwitchRow
} from './SettingsFormControls'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { useAppStore } from '../../store'
import { clampNumber, resolvePaneStyleOptions } from '@/lib/terminal-theme'
import {
  TERMINAL_CURSOR_SEARCH_ENTRIES,
  TERMINAL_DARK_THEME_SEARCH_ENTRIES,
  TERMINAL_GHOSTTY_IMPORT_SEARCH_ENTRIES,
  TERMINAL_LIGHT_THEME_SEARCH_ENTRIES,
  TERMINAL_PANE_APPEARANCE_SEARCH_ENTRIES,
  TERMINAL_TYPOGRAPHY_SEARCH_ENTRIES,
  TERMINAL_WINDOW_SEARCH_ENTRIES
} from './terminal-search'
import { DarkTerminalThemeSection, LightTerminalThemeSection } from './TerminalThemeSections'
import { TerminalWindowSection } from './TerminalWindowSection'
import { TerminalSettingsPreview } from './TerminalSettingsPreview'
import { GhosttyImportModal } from './GhosttyImportModal'
import type { UseGhosttyImportReturn } from './useGhosttyImport'
import ghosttyIcon from '../../../../../resources/ghostty.svg'

type TerminalAppearanceSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  systemPrefersDark: boolean
  terminalFontSuggestions: string[]
  ghostty: UseGhosttyImportReturn
}

export function TerminalAppearanceSection({
  settings,
  updateSettings,
  systemPrefersDark,
  terminalFontSuggestions,
  ghostty
}: TerminalAppearanceSectionProps): React.JSX.Element {
  const searchQuery = useAppStore((state) => state.settingsSearchQuery)
  const [themeSearchDark, setThemeSearchDark] = useState('')
  const [themeSearchLight, setThemeSearchLight] = useState('')
  // Why: hover preview lets the font picker update the sample without committing a setting.
  const [previewFontFamily, setPreviewFontFamily] = useState<string | null>(null)
  const paneStyleOptions = resolvePaneStyleOptions(settings)

  const visibleSections = [
    matchesSettingsSearch(searchQuery, TERMINAL_GHOSTTY_IMPORT_SEARCH_ENTRIES) ||
    matchesSettingsSearch(searchQuery, TERMINAL_TYPOGRAPHY_SEARCH_ENTRIES) ? (
      <section key="typography" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SettingsSubsectionHeader
              title="터미널 타이포그래피"
              description="새 창과 실시간 업데이트에 사용할 기본 터미널 타이포그래피입니다."
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void ghostty.handleClick()}
            >
              <img src={ghosttyIcon} alt="" aria-hidden="true" className="size-4" />
              Ghostty에서 가져오기
            </Button>
          </div>

          <div className="divide-y divide-border/40">
            <SearchableSetting
              title="글꼴 크기"
              description="새 창과 실시간 업데이트에 사용할 기본 터미널 글꼴 크기입니다."
              keywords={['terminal', 'typography', 'text size']}
            >
              <SettingsRow
                label="글꼴 크기"
                description="새 창과 실시간 업데이트에 사용할 기본 터미널 글꼴 크기입니다."
                control={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => {
                        const next = Math.max(10, settings.terminalFontSize - 1)
                        updateSettings({ terminalFontSize: next })
                      }}
                      disabled={settings.terminalFontSize <= 10}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      type="number"
                      min={10}
                      max={24}
                      value={settings.terminalFontSize}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10)
                        if (!Number.isNaN(value) && value >= 10 && value <= 24) {
                          updateSettings({ terminalFontSize: value })
                        }
                      }}
                      className="w-14 text-center tabular-nums"
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => {
                        const next = Math.min(24, settings.terminalFontSize + 1)
                        updateSettings({ terminalFontSize: next })
                      }}
                      disabled={settings.terminalFontSize >= 24}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                }
              />
            </SearchableSetting>

            <SearchableSetting
              title="글꼴 패밀리"
              description="새 창과 실시간 업데이트에 사용할 기본 터미널 글꼴 패밀리입니다."
              keywords={['terminal', 'typography', 'font']}
            >
              <SettingsRow
                alignTop
                label="글꼴 패밀리"
                description="새 창과 실시간 업데이트에 사용할 기본 터미널 글꼴 패밀리입니다."
                control={
                  <FontAutocomplete
                    value={settings.terminalFontFamily}
                    suggestions={terminalFontSuggestions}
                    onChange={(value) => updateSettings({ terminalFontFamily: value })}
                    onPreviewFontFamily={setPreviewFontFamily}
                  />
                }
              />
            </SearchableSetting>

            <SearchableSetting
              title="글꼴 두께"
              description="터미널 텍스트의 글꼴 두께를 조절합니다."
              keywords={['terminal', 'typography', 'weight']}
            >
              <NumberField
                label="글꼴 두께"
                description="터미널 텍스트의 글꼴 두께를 조절합니다."
                value={normalizeTerminalFontWeight(settings.terminalFontWeight)}
                defaultValue={DEFAULT_TERMINAL_FONT_WEIGHT}
                min={TERMINAL_FONT_WEIGHT_MIN}
                max={TERMINAL_FONT_WEIGHT_MAX}
                step={TERMINAL_FONT_WEIGHT_STEP}
                suffix="100-900"
                onChange={(value) =>
                  updateSettings({
                    terminalFontWeight: normalizeTerminalFontWeight(value)
                  })
                }
              />
            </SearchableSetting>

            <SearchableSetting
              title="줄 높이"
              description="터미널 줄 높이 배율을 조절합니다."
              keywords={['terminal', 'typography', 'line height', 'spacing']}
            >
              <NumberField
                label="줄 높이"
                description="터미널 줄 높이 배율을 조절합니다."
                value={settings.terminalLineHeight}
                defaultValue={1}
                min={1}
                max={3}
                step={0.1}
                suffix="1-3"
                onChange={(value) =>
                  updateSettings({
                    terminalLineHeight: clampNumber(value, 1, 3)
                  })
                }
              />
            </SearchableSetting>

            <SearchableSetting
              title="글꼴 리거처"
              description='Render programming ligatures (e.g. =>, !=, ===) for fonts that ship them. "Auto" enables ligatures only for known ligature fonts (Fira Code, JetBrains Mono, Cascadia Code, Iosevka, etc.).'
              keywords={[
                'terminal',
                'typography',
                'ligatures',
                'ligature',
                'fira code',
                'jetbrains mono',
                'cascadia code',
                'iosevka',
                'calt',
                'font features'
              ]}
            >
              <SettingsRow
                label="Font Ligatures"
                description={
                  settings.terminalLigatures === 'on'
                    ? '항상 켬. 리거처가 없는 글꼴은 그대로 렌더링합니다.'
                    : settings.terminalLigatures === 'off'
                      ? '항상 끔. 리거처가 있는 글꼴도 적용하지 않습니다.'
                      : fontFamilyHasKnownLigatures(settings.terminalFontFamily)
                        ? `자동 - "${settings.terminalFontFamily}"에 대해 활성화됨.`
                        : `자동 - "${
                            settings.terminalFontFamily || 'the current font'
                          }"에 대해 비활성화됨.`
                }
                control={
                  <SettingsSegmentedControl
                    ariaLabel="Font Ligatures"
                    value={settings.terminalLigatures ?? 'auto'}
                    onChange={(option) => updateSettings({ terminalLigatures: option })}
                    options={[
                      { value: 'auto', label: '자동' },
                      { value: 'on', label: '켬' },
                      { value: 'off', label: '끔' }
                    ]}
                  />
                }
              />
              {/* Why: surface the resolved state explicitly so the "Auto" label
                  isn't ambiguous when a user is staring at it. */}
              <p className="sr-only" aria-live="polite">
                리거처는 현재{' '}
                {resolveTerminalLigaturesEnabled(
                  settings.terminalLigatures,
                  settings.terminalFontFamily
                )
                  ? '활성화됨'
                  : '비활성화됨'}
                .
              </p>
            </SearchableSetting>
          </div>
        </div>
        <TerminalSettingsPreview
          title="미리보기"
          settings={settings}
          systemPrefersDark={systemPrefersDark}
          previewFontFamily={previewFontFamily}
          showThemeToggle
        />
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_CURSOR_SEARCH_ENTRIES) ? (
      <section key="cursor" className="space-y-3">
        <SettingsSubsectionHeader
          title="터미널 커서"
          description="Korca 터미널 창의 기본 커서 모양입니다."
        />

        <div className="divide-y divide-border/40">
          <SearchableSetting
            title="커서 모양"
            description="Korca 터미널 창의 기본 커서 모양입니다."
            keywords={['terminal', 'cursor', 'bar', 'block', 'underline']}
          >
            <SettingsRow
              label="커서 모양"
              description="Korca 터미널 창의 기본 커서 모양입니다."
              control={
                <SettingsSegmentedControl
                  ariaLabel="커서 모양"
                  value={settings.terminalCursorStyle}
                  onChange={(option) => updateSettings({ terminalCursorStyle: option })}
                  options={[
                    { value: 'bar', label: '막대' },
                    { value: 'block', label: '블록' },
                    { value: 'underline', label: '밑줄' }
                  ]}
                />
              }
            />
          </SearchableSetting>

          <SearchableSetting
            title="깜빡이는 커서"
            description="선택한 커서 모양의 깜빡이는 변형을 사용합니다."
            keywords={['terminal', 'cursor', 'blink']}
          >
            <SettingsSwitchRow
              label="깜빡이는 커서"
              description="선택한 커서 모양의 깜빡이는 변형을 사용합니다."
              checked={settings.terminalCursorBlink}
              onChange={() =>
                updateSettings({ terminalCursorBlink: !settings.terminalCursorBlink })
              }
            />
          </SearchableSetting>

          <SearchableSetting
            title="커서 불투명도"
            description="터미널 커서의 불투명도입니다."
            keywords={['terminal', 'cursor', 'opacity', 'transparency']}
          >
            <NumberField
              label="커서 불투명도"
              description="터미널 커서의 불투명도입니다."
              value={settings.terminalCursorOpacity ?? 1}
              defaultValue={1}
              min={0}
              max={1}
              step={0.05}
              suffix="0-1"
              onChange={(value) =>
                updateSettings({
                  terminalCursorOpacity: clampNumber(value, 0, 1)
                })
              }
            />
          </SearchableSetting>
        </div>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_PANE_APPEARANCE_SEARCH_ENTRIES) ? (
      <section key="pane-appearance" className="space-y-3">
        <SettingsSubsectionHeader
          title="터미널 창"
          description="비활성 창의 어둡게 표시와 분할선 두께를 조절합니다."
        />

        <div className="divide-y divide-border/40">
          <SearchableSetting
            title="비활성 창 불투명도"
            description="현재 활성화되지 않은 창에 적용되는 불투명도입니다."
            keywords={['pane', 'opacity', 'dimming']}
          >
            <NumberField
              label="비활성 창 불투명도"
              description="현재 활성화되지 않은 창에 적용되는 불투명도입니다."
              value={paneStyleOptions.inactivePaneOpacity}
              defaultValue={0.8}
              min={0}
              max={1}
              step={0.05}
              suffix="0-1"
              onChange={(value) =>
                updateSettings({
                  terminalInactivePaneOpacity: clampNumber(value, 0, 1)
                })
              }
            />
          </SearchableSetting>
          <SearchableSetting
            title="분할선 두께"
            description="창 분할선의 두께입니다."
            keywords={['pane', 'divider', 'thickness']}
          >
            <NumberField
              label="분할선 두께"
              description="창 분할선의 두께입니다."
              value={paneStyleOptions.dividerThicknessPx}
              defaultValue={1}
              min={1}
              max={32}
              step={1}
              suffix="px"
              onChange={(value) =>
                updateSettings({
                  terminalDividerThicknessPx: clampNumber(value, 1, 32)
                })
              }
            />
          </SearchableSetting>
        </div>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_WINDOW_SEARCH_ENTRIES) ? (
      <TerminalWindowSection key="window" settings={settings} updateSettings={updateSettings} />
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_DARK_THEME_SEARCH_ENTRIES) ? (
      <DarkTerminalThemeSection
        key="dark-theme"
        settings={settings}
        systemPrefersDark={systemPrefersDark}
        themeSearchDark={themeSearchDark}
        setThemeSearchDark={setThemeSearchDark}
        updateSettings={updateSettings}
        previewFontFamily={previewFontFamily}
      />
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_LIGHT_THEME_SEARCH_ENTRIES) ? (
      <LightTerminalThemeSection
        key="light-theme"
        settings={settings}
        themeSearchLight={themeSearchLight}
        setThemeSearchLight={setThemeSearchLight}
        updateSettings={updateSettings}
        previewFontFamily={previewFontFamily}
      />
    ) : null
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      {visibleSections.map((section, index) => (
        <div key={index} className="space-y-6">
          {index > 0 ? <div className="h-px bg-border/60" /> : null}
          {section}
        </div>
      ))}
      <GhosttyImportModal
        open={ghostty.open}
        onOpenChange={ghostty.handleOpenChange}
        preview={ghostty.preview}
        loading={ghostty.loading}
        onApply={ghostty.handleApply}
        applied={ghostty.applied}
        applyError={ghostty.applyError}
      />
    </div>
  )
}
