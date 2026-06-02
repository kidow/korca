/* eslint-disable max-lines -- Why: TerminalPane keeps terminal workflow, runtime, and recovery
   settings together so search shows one focused terminal behavior surface. */
import type { GlobalSettings, SetupScriptLaunchMode } from '../../../../shared/types'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { clampNumber } from '@/lib/terminal-theme'
import {
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSubsectionHeader,
  SettingsSwitchRow
} from './SettingsFormControls'
import { SCROLLBACK_PRESETS_MB } from './SettingsConstants'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'
import { useAppStore } from '../../store'
import { isMacUserAgent, isWindowsUserAgent } from '@/components/terminal-pane/pane-helpers'
import {
  MANAGE_SESSIONS_SEARCH_ENTRIES,
  TERMINAL_ADVANCED_SEARCH_ENTRIES,
  TERMINAL_MAC_OPTION_SEARCH_ENTRIES,
  TERMINAL_MAC_YEN_SEARCH_ENTRIES,
  TERMINAL_PANE_INTERACTION_SEARCH_ENTRIES,
  TERMINAL_RENDERING_SEARCH_ENTRIES,
  TERMINAL_SETUP_SCRIPT_SEARCH_ENTRIES
} from './terminal-search'
import {
  TERMINAL_RIGHT_CLICK_TO_PASTE_SEARCH_ENTRY,
  TERMINAL_WINDOWS_POWERSHELL_IMPLEMENTATION_SEARCH_ENTRY,
  TERMINAL_WINDOWS_SHELL_SEARCH_ENTRY
} from './terminal-windows-search'
import { useDetectedOptionAsAlt } from '@/lib/keyboard-layout/use-effective-mac-option-as-alt'
import { ManageSessionsSection } from './ManageSessionsSection'
import { OSC52_CLIPBOARD_SETTING_ID } from '../terminal-pane/osc52-clipboard-setting-anchor'
import { WINDOWS_GIT_BASH_SHELL } from '../../../../shared/windows-terminal-shell'

type TerminalPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  scrollbackMode: 'preset' | 'custom'
  setScrollbackMode: (mode: 'preset' | 'custom') => void
  /** Whether WSL is installed on this Windows machine. */
  wslAvailable?: boolean
  /** Installed WSL distro names, used to choose the default WSL terminal target. */
  wslDistros?: string[]
  /** Whether WSL capability probing is still in flight. */
  wslCapabilitiesLoading?: boolean
  /** Whether PowerShell 7+ (pwsh.exe) is installed on this Windows machine. */
  pwshAvailable?: boolean
  /** Whether Git for Windows bash.exe is installed on this machine. */
  gitBashAvailable?: boolean
}

export function TerminalPane({
  settings,
  updateSettings,
  scrollbackMode,
  setScrollbackMode,
  wslAvailable,
  wslDistros = [],
  wslCapabilitiesLoading = false,
  pwshAvailable,
  gitBashAvailable = false
}: TerminalPaneProps): React.JSX.Element {
  const searchQuery = useAppStore((state) => state.settingsSearchQuery)
  const isWindows = isWindowsUserAgent()
  const isMac = isMacUserAgent()
  const detectedLayout = useDetectedOptionAsAlt()
  const detectedLayoutLabel =
    detectedLayout === 'us'
      ? '미국식 영어 — Option 키가 Alt/Esc 시퀀스를 보냅니다'
      : detectedLayout === 'non-us'
        ? '비미국식 배열 — Option 키가 @, €, [, ] 같은 문자를 조합합니다'
        : '알 수 없는 배열 — Option이 문자를 조합하는 안전한 기본값입니다'
  const scrollbackMb = Math.max(1, Math.round(settings.terminalScrollbackBytes / 1_000_000))
  const isPreset = SCROLLBACK_PRESETS_MB.includes(
    scrollbackMb as (typeof SCROLLBACK_PRESETS_MB)[number]
  )
  const scrollbackToggleValue =
    scrollbackMode === 'custom' ? 'custom' : isPreset ? `${scrollbackMb}` : 'custom'
  const windowsShell = settings.terminalWindowsShell ?? 'powershell.exe'
  const selectedWslDistroName = settings.terminalWindowsWslDistro?.trim() || null
  const selectedWslDistro = selectedWslDistroName || '__default__'
  const wslDistroOptions =
    selectedWslDistroName && !wslDistros.includes(selectedWslDistroName)
      ? [selectedWslDistroName, ...wslDistros]
      : wslDistros
  const powerShellImplementation = settings.terminalWindowsPowerShellImplementation ?? 'auto'
  const showWindowsPowerShellImplementation = isWindows && windowsShell === 'powershell.exe'
  const showGitBashOption = gitBashAvailable || windowsShell === WINDOWS_GIT_BASH_SHELL

  const visibleSections = [
    isWindows && matchesSettingsSearch(searchQuery, TERMINAL_WINDOWS_SHELL_SEARCH_ENTRY) ? (
      <section key="windows-shell" className="space-y-3">
        <SettingsSubsectionHeader
          title="Windows 셸"
          description="Windows에서 새 터미널 창에 사용할 기본 셸입니다."
        />

        <div className="divide-y divide-border/40">
          <SearchableSetting
            title="기본 셸"
            description="Windows에서 새 터미널 창의 기본 셸을 선택합니다."
            keywords={[
              'terminal',
              'windows',
              'shell',
              'powershell',
              'cmd',
              'command prompt',
              'git bash',
              'bash.exe',
              'default'
            ]}
          >
            <SettingsRow
              label="기본 셸"
              description="새 터미널 창을 열 때 사용할 셸입니다. 새 터미널부터 적용됩니다."
              control={
                <SettingsSegmentedControl
                  ariaLabel="기본 셸"
                  value={windowsShell}
                  onChange={(value) => updateSettings({ terminalWindowsShell: value })}
                  options={[
                    { value: 'powershell.exe', label: 'PowerShell' },
                    { value: 'cmd.exe', label: '명령 프롬프트' },
                    ...(showGitBashOption
                      ? [
                          {
                            value: WINDOWS_GIT_BASH_SHELL,
                            label: 'Git Bash',
                            disabled: !gitBashAvailable
                          }
                        ]
                      : []),
                    ...(wslAvailable ? [{ value: 'wsl.exe', label: 'WSL' }] : [])
                  ]}
                />
              }
            />
          </SearchableSetting>
          {windowsShell === 'wsl.exe' ? (
            <SearchableSetting
              title="WSL 배포판"
              description="새 WSL 터미널과 로컬 에이전트 검사가 사용할 WSL 배포판을 선택합니다."
              keywords={['terminal', 'windows', 'wsl', 'linux', 'distribution', 'distro', 'ubuntu']}
            >
              <SettingsRow
                label="WSL 배포판"
                description="활성 워크스페이스가 이미 WSL 안에 있지 않을 때 새 WSL 터미널과 로컬 에이전트 감지에 사용됩니다."
                control={
                  <Select
                    value={selectedWslDistro}
                    onValueChange={(value) =>
                      updateSettings({
                        terminalWindowsWslDistro: value === '__default__' ? null : value
                      })
                    }
                    disabled={wslCapabilitiesLoading || !wslAvailable}
                  >
                    <SelectTrigger size="sm" aria-label="WSL 배포판" className="min-w-44">
                      <SelectValue
                        placeholder={
                          wslCapabilitiesLoading ? '배포판 불러오는 중' : 'Windows 기본값'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Windows 기본값</SelectItem>
                      {wslDistroOptions.map((distro) => (
                        <SelectItem key={distro} value={distro}>
                          {distro}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
            </SearchableSetting>
          ) : null}
        </div>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_RENDERING_SEARCH_ENTRIES) ? (
      <section key="rendering" className="space-y-3">
        <SettingsSubsectionHeader
          title="렌더링"
          description="실행 중인 창과 새 창의 터미널 렌더러 동작입니다."
        />

        <div className="divide-y divide-border/40">
          <SearchableSetting
            title="GPU 가속"
            description="터미널이 xterm.js WebGL 렌더링을 사용할지 정합니다. 자동은 Linux에서 드라이버 글리프 깨짐을 피하려고 DOM을 쓰고, 그 외에는 WebGL을 시도한 뒤 DOM으로 폴백합니다."
            keywords={[
              'terminal',
              'gpu',
              'acceleration',
              'webgl',
              'renderer',
              'rendering',
              'graphics',
              'linux',
              'vscode'
            ]}
          >
            <SettingsRow
              label="GPU 가속"
              description={
                settings.terminalGpuAcceleration === 'off'
                  ? 'WebGL을 사용하지 않습니다. 최대 호환성을 위해 DOM 렌더러를 씁니다.'
                  : settings.terminalGpuAcceleration === 'on'
                    ? '터미널 창에서 항상 WebGL을 시도합니다.'
                    : '자동은 Linux에서 DOM을 쓰고, 그 외에는 WebGL을 시도한 뒤 DOM으로 폴백합니다.'
              }
              control={
                <SettingsSegmentedControl
                  ariaLabel="GPU 가속"
                  value={settings.terminalGpuAcceleration ?? 'auto'}
                  onChange={(option) => updateSettings({ terminalGpuAcceleration: option })}
                  options={[
                    { value: 'auto', label: '자동' },
                    { value: 'on', label: '켜짐' },
                    { value: 'off', label: '꺼짐' }
                  ]}
                />
              }
            />
          </SearchableSetting>
        </div>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_PANE_INTERACTION_SEARCH_ENTRIES) ||
    (isWindows &&
      matchesSettingsSearch(searchQuery, TERMINAL_RIGHT_CLICK_TO_PASTE_SEARCH_ENTRY)) ? (
      <section key="pane-interaction" className="space-y-3">
        <SettingsSubsectionHeader
          title="터미널 상호작용"
          description="터미널 창의 마우스 및 클립보드 동작입니다."
        />

        <div className="divide-y divide-border/40">
          {/* Why: the Windows-only right-click toggle lives in this section, so the
              section must also match that search term or settings search would hide
              the control even though it is present. */}
          {isWindows &&
            matchesSettingsSearch(searchQuery, TERMINAL_RIGHT_CLICK_TO_PASTE_SEARCH_ENTRY) && (
              <SearchableSetting
                title="오른쪽 클릭으로 붙여넣기"
                description="Windows에서 오른쪽 클릭은 클립보드를 터미널에 붙여넣습니다. 컨텍스트 메뉴를 열려면 Ctrl+오른쪽 클릭을 사용합니다."
                keywords={['terminal', 'windows', 'right click', 'paste', 'context menu']}
              >
                <SettingsSwitchRow
                  label="오른쪽 클릭으로 붙여넣기"
                  description="Windows에서 오른쪽 클릭은 클립보드를 붙여넣습니다. Ctrl+오른쪽 클릭은 컨텍스트 메뉴를 엽니다."
                  checked={settings.terminalRightClickToPaste}
                  onChange={() =>
                    updateSettings({
                      terminalRightClickToPaste: !settings.terminalRightClickToPaste
                    })
                  }
                />
              </SearchableSetting>
            )}

          <SearchableSetting
            title="마우스 따라 포커스"
            description="터미널 창 위에 마우스를 올리면 클릭 없이 활성화됩니다."
            keywords={['focus', 'follows', 'mouse', 'hover', 'pane', 'ghostty', 'active']}
          >
            <SettingsSwitchRow
              label="마우스 따라 포커스"
              description="터미널 창 위에 마우스를 올리면 클릭 없이 활성화됩니다."
              checked={settings.terminalFocusFollowsMouse}
              onChange={() =>
                updateSettings({
                  terminalFocusFollowsMouse: !settings.terminalFocusFollowsMouse
                })
              }
            />
          </SearchableSetting>

          <SearchableSetting
            title="선택 시 자동 복사"
            description="Automatically copy terminal selections to the clipboard."
            keywords={[
              'clipboard',
              'copy',
              'select',
              'selection',
              'auto',
              'automatic',
              'x11',
              'linux',
              'gnome',
              'paste'
            ]}
          >
            <SettingsSwitchRow
              label="선택 시 자동 복사"
              description="Automatically copy terminal selections to the clipboard."
              checked={settings.terminalClipboardOnSelect}
              onChange={() =>
                updateSettings({
                  terminalClipboardOnSelect: !settings.terminalClipboardOnSelect
                })
              }
            />
          </SearchableSetting>

          <SearchableSetting
            id={OSC52_CLIPBOARD_SETTING_ID}
            title="TUI 클립보드 쓰기 허용 (OSC 52)"
            description="tmux, Neovim, fzf가 PTY를 통해 시스템 클립보드에 복사하도록 허용합니다. SSH에서도 동작합니다."
            keywords={[
              'osc 52',
              'osc52',
              'clipboard',
              'tmux',
              'neovim',
              'nvim',
              'fzf',
              'ssh',
              'remote',
              'copy',
              'paste'
            ]}
          >
            <SettingsSwitchRow
              label="TUI 클립보드 쓰기 허용 (OSC 52)"
              description="터미널의 프로그램(tmux, Neovim, fzf, SSH)이 시스템 클립보드에 복사하도록 허용합니다."
              checked={settings.terminalAllowOsc52Clipboard}
              onChange={() =>
                updateSettings({
                  terminalAllowOsc52Clipboard: !settings.terminalAllowOsc52Clipboard
                })
              }
            />
          </SearchableSetting>
        </div>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_SETUP_SCRIPT_SEARCH_ENTRIES) ? (
      <section key="setup-script" className="space-y-3">
        <SettingsSubsectionHeader
          title="워크스페이스 설정 스크립트"
          description="Where the repository setup script runs when a new workspace is created."
        />

        <div className="divide-y divide-border/40">
          <SearchableSetting
            title="설정 스크립트 위치"
            description="Where the repository setup script runs when a new workspace is created."
            keywords={[
              'setup',
              'script',
              'workspace',
              'split',
              'horizontal',
              'vertical',
              'tab',
              'new',
              'location',
              'launch'
            ]}
          >
            <SettingsRow
              label="설정 스크립트 위치"
              description='"새 탭"은 포커스를 빼앗지 않고 "Setup"이라는 이름의 백그라운드 탭에서 설정 명령을 엽니다.'
              control={
                <ToggleGroup
                  type="single"
                  value={settings.setupScriptLaunchMode}
                  onValueChange={(value) => {
                    if (!value) {
                      return
                    }
                    updateSettings({
                      setupScriptLaunchMode: value as SetupScriptLaunchMode
                    })
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 flex-wrap"
                >
                  <ToggleGroupItem
                    value="new-tab"
                    className="h-8 px-3 text-xs"
                    aria-label="Run in a new tab"
                  >
                    새 탭
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="split-vertical"
                    className="h-8 px-3 text-xs"
                    aria-label="Split vertically"
                  >
                    세로로 분할
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="split-horizontal"
                    className="h-8 px-3 text-xs"
                    aria-label="Split horizontally"
                  >
                    가로로 분할
                  </ToggleGroupItem>
                </ToggleGroup>
              }
            />
          </SearchableSetting>
        </div>
      </section>
    ) : null,
    matchesSettingsSearch(searchQuery, MANAGE_SESSIONS_SEARCH_ENTRIES) ? (
      <ManageSessionsSection key="manage-sessions" />
    ) : null,
    matchesSettingsSearch(searchQuery, TERMINAL_ADVANCED_SEARCH_ENTRIES) ||
    (showWindowsPowerShellImplementation &&
      matchesSettingsSearch(
        searchQuery,
        TERMINAL_WINDOWS_POWERSHELL_IMPLEMENTATION_SEARCH_ENTRY
      )) ||
    (isMac &&
      (matchesSettingsSearch(searchQuery, TERMINAL_MAC_OPTION_SEARCH_ENTRIES) ||
        matchesSettingsSearch(searchQuery, TERMINAL_MAC_YEN_SEARCH_ENTRIES))) ? (
      <section key="advanced" className="space-y-3">
        <SettingsSubsectionHeader
          title="고급"
          description="스크롤백, 단어 경계, 플랫폼별 터미널 동작입니다."
        />

        <div className="divide-y divide-border/40">
          <SearchableSetting
            title="스크롤백 크기"
            description="터미널 스크롤백 버퍼의 최대 크기입니다."
            keywords={['terminal', 'scrollback', 'buffer', 'memory']}
          >
            <SettingsRow
              alignTop={scrollbackMode === 'custom'}
              label="스크롤백 크기"
              description="새 터미널 창의 최대 스크롤백 버퍼 크기입니다."
              control={
                <div className="flex flex-col items-end gap-2">
                  <ToggleGroup
                    type="single"
                    value={scrollbackToggleValue}
                    onValueChange={(value) => {
                      if (!value) {
                        return
                      }
                      if (value === 'custom') {
                        setScrollbackMode('custom')
                        return
                      }

                      setScrollbackMode('preset')
                      updateSettings({
                        terminalScrollbackBytes: Number(value) * 1_000_000
                      })
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 flex-wrap justify-end"
                  >
                    {SCROLLBACK_PRESETS_MB.map((preset) => (
                      <ToggleGroupItem
                        key={preset}
                        value={`${preset}`}
                        className="h-8 px-3 text-xs"
                        aria-label={`${preset} megabytes`}
                      >
                        {preset} MB
                      </ToggleGroupItem>
                    ))}
                    <ToggleGroupItem
                      value="custom"
                      className="h-8 px-3 text-xs"
                      aria-label="Custom"
                    >
                      Custom
                    </ToggleGroupItem>
                  </ToggleGroup>
                  {scrollbackMode === 'custom' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={256}
                        step={1}
                        value={scrollbackMb}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          if (Number.isFinite(value)) {
                            updateSettings({
                              terminalScrollbackBytes: clampNumber(value, 1, 256) * 1_000_000
                            })
                          }
                        }}
                        className="number-input-clean w-24 tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground">MB</span>
                    </div>
                  ) : null}
                </div>
              }
            />
          </SearchableSetting>

          <SearchableSetting
            title="단어 구분자"
            description="더블 클릭 선택에서 단어 경계로 취급되는 문자입니다."
            keywords={['word', 'separator', 'boundary', 'double-click', 'selection']}
          >
            <SettingsRow
              label="단어 구분자"
              description="더블 클릭 선택에서 단어 경계로 취급되는 문자입니다."
              control={
                <Input
                  value={settings.terminalWordSeparator ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    updateSettings({ terminalWordSeparator: value || undefined })
                  }}
                  placeholder={` ()[]{},'"\``}
                  className="w-56 font-mono text-xs"
                />
              }
            />
          </SearchableSetting>

          {showWindowsPowerShellImplementation &&
          matchesSettingsSearch(
            searchQuery,
            TERMINAL_WINDOWS_POWERSHELL_IMPLEMENTATION_SEARCH_ENTRY
          ) ? (
            <SearchableSetting
              title="PowerShell 버전"
              description="PowerShell 셸 옵션이 새 터미널 창에서 Windows PowerShell을 실행할지, PowerShell 7+를 실행할지 선택합니다."
              keywords={[
                'terminal',
                'windows',
                'powershell',
                'pwsh',
                'powershell 7',
                'windows powershell',
                'version',
                'advanced'
              ]}
            >
              <SettingsRow
                alignTop
                label="PowerShell 버전"
                description={
                  pwshAvailable ? (
                    'Choose between Windows PowerShell and PowerShell 7+ for new terminal panes.'
                  ) : (
                    <>
                      자동은 현재 Windows PowerShell을 사용하고, PowerShell 7+가 설치되면
                      전환합니다.{' '}
                      <a
                        href="https://github.com/PowerShell/PowerShell/releases/latest"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        PowerShell 7+ 다운로드
                      </a>
                      .
                    </>
                  )
                }
                control={
                  <SettingsSegmentedControl
                    ariaLabel="PowerShell 버전"
                    value={powerShellImplementation}
                    onChange={(value) =>
                      updateSettings({ terminalWindowsPowerShellImplementation: value })
                    }
                    options={[
                      { value: 'auto', label: '자동' },
                      { value: 'powershell.exe', label: 'Windows PowerShell' },
                      { value: 'pwsh.exe', label: 'PowerShell 7+', disabled: !pwshAvailable }
                    ]}
                  />
                }
              />
            </SearchableSetting>
          ) : null}

          {isMac ? (
            <>
              <SearchableSetting
                title="Option을 Alt로 사용"
                description="macOS Option 키가 Alt/Esc 시퀀스를 보낼지, 문자를 조합할지 정합니다."
                keywords={[
                  'terminal',
                  'option',
                  'alt',
                  'key',
                  'meta',
                  'compose',
                  'mac',
                  'macos',
                  'keyboard',
                  'german',
                  'international',
                  'readline',
                  'ghostty'
                ]}
              >
                <SettingsRow
                  alignTop
                  label="Option을 Alt로 사용"
                  description={
                    settings.terminalMacOptionAsAlt === 'auto'
                      ? `자동 - 감지됨: ${detectedLayoutLabel}.`
                      : settings.terminalMacOptionAsAlt === 'false'
                        ? 'Option 키는 키보드 배열에 맞게 특수 문자를 조합합니다.'
                        : settings.terminalMacOptionAsAlt === 'true'
                          ? '양쪽 Option 키가 모두 Alt/Esc 시퀀스를 보냅니다.'
                          : `${settings.terminalMacOptionAsAlt} 쪽 Option 키는 Alt/Esc를 보내고, 다른 쪽은 특수 문자를 조합합니다.`
                  }
                  control={
                    <SettingsSegmentedControl
                      ariaLabel="Option을 Alt로 사용"
                      value={settings.terminalMacOptionAsAlt}
                      onChange={(option) => updateSettings({ terminalMacOptionAsAlt: option })}
                      options={[
                        { value: 'auto', label: '자동' },
                        { value: 'true', label: '양쪽' },
                        { value: 'left', label: '왼쪽' },
                        { value: 'right', label: '오른쪽' },
                        { value: 'false', label: '꺼짐' }
                      ]}
                    />
                  }
                />
              </SearchableSetting>

              <SearchableSetting
                title="JIS 엔(¥)을 백슬래시(\\)로"
                description="JIS 엔(¥) 키를 누를 때 백슬래시(\\)를 보내도록 할지 정합니다."
                keywords={[
                  'terminal',
                  'yen',
                  'backslash',
                  'japanese',
                  'keyboard',
                  'mac',
                  'macos',
                  'jis',
                  'intl'
                ]}
              >
                <SettingsSwitchRow
                  label="JIS 엔(¥)을 백슬래시(\\)로"
                  description="JIS 엔(¥) 키를 누르면 백슬래시(\\)를 보냅니다."
                  checked={settings.terminalJISYenToBackslash ?? false}
                  onChange={() =>
                    updateSettings({
                      terminalJISYenToBackslash: !settings.terminalJISYenToBackslash
                    })
                  }
                />
              </SearchableSetting>
            </>
          ) : null}
        </div>
      </section>
    ) : null
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      {visibleSections.map((section, index) => (
        <div key={index} className="space-y-6">
          {index > 0 ? <Separator /> : null}
          {section}
        </div>
      ))}
    </div>
  )
}
