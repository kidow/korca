import type { GlobalSettings } from '../../../../shared/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { SettingsRow, SettingsSegmentedControl } from './SettingsFormControls'

type AgentDetectionRuntime = {
  runtime: 'host' | 'wsl'
  wslDistro?: string | null
  label: string
}

type AgentLocationSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  refresh: () => Promise<unknown>
  wslSupportedPlatform?: boolean
  wslAvailable?: boolean
  wslDistros?: string[]
  wslCapabilitiesLoading?: boolean
}

function getHostRuntimeLabel(): string {
  return navigator.userAgent.includes('Windows') ? 'Windows' : '이 기기'
}

function getSelectedAgentRuntime(
  settings: GlobalSettings,
  wslSupportedPlatform: boolean,
  wslAvailable: boolean,
  wslDistros: string[],
  wslCapabilitiesLoading: boolean
): AgentDetectionRuntime {
  const configuredRuntime =
    settings.localAgentRuntime ?? (settings.terminalWindowsShell === 'wsl.exe' ? 'wsl' : 'host')
  if (wslSupportedPlatform && configuredRuntime === 'wsl') {
    if (!wslAvailable && !wslCapabilitiesLoading) {
      return { runtime: 'wsl', label: 'WSL' }
    }
    const configuredDistro =
      settings.localAgentWslDistro?.trim() || settings.terminalWindowsWslDistro?.trim() || null
    const selectedDistro =
      configuredDistro && (wslCapabilitiesLoading || wslDistros.includes(configuredDistro))
        ? configuredDistro
        : null
    return {
      runtime: 'wsl',
      wslDistro: selectedDistro,
      label: selectedDistro ? `WSL ${selectedDistro}` : 'WSL 기본값'
    }
  }
  return { runtime: 'host', label: getHostRuntimeLabel() }
}

export function AgentLocationSetting({
  settings,
  updateSettings,
  refresh,
  wslSupportedPlatform = false,
  wslAvailable = false,
  wslDistros = [],
  wslCapabilitiesLoading = false
}: AgentLocationSettingProps): React.JSX.Element | null {
  const agentRuntime = getSelectedAgentRuntime(
    settings,
    wslSupportedPlatform,
    wslAvailable,
    wslDistros,
    wslCapabilitiesLoading
  )
  const updateAgentLocation = (updates: Partial<GlobalSettings>): void => {
    void Promise.resolve(updateSettings(updates)).then(() => refresh())
  }

  if (!wslSupportedPlatform) {
    return null
  }

  return (
    <section className="space-y-3">
      <SettingsRow
        label="에이전트 위치"
        alignTop
        description={
          agentRuntime.runtime === 'wsl' && !wslAvailable && !wslCapabilitiesLoading
            ? '이 기기에서는 WSL을 사용할 수 없습니다.'
            : `${agentRuntime.label}에 설치된 에이전트를 표시합니다. 새로고침하면 해당 환경의 PATH를 다시 확인합니다.`
        }
        control={
          <div className="flex w-44 flex-col items-stretch gap-2">
            <SettingsSegmentedControl
              ariaLabel="에이전트 위치"
              value={agentRuntime.runtime}
              onChange={(value) => updateAgentLocation({ localAgentRuntime: value })}
              equalWidth
              options={[
                { value: 'host', label: getHostRuntimeLabel() },
                ...(wslSupportedPlatform
                  ? [
                      {
                        value: 'wsl',
                        label: 'WSL',
                        disabled: wslCapabilitiesLoading || !wslAvailable
                      } as const
                    ]
                  : [])
              ]}
            />
            {wslSupportedPlatform && agentRuntime.runtime === 'wsl' ? (
              <Select
                value={agentRuntime.wslDistro ?? '__default__'}
                onValueChange={(value) =>
                  updateAgentLocation({
                    localAgentRuntime: 'wsl',
                    localAgentWslDistro: value === '__default__' ? null : value
                  })
                }
                disabled={wslCapabilitiesLoading || !wslAvailable}
              >
                <SelectTrigger size="sm" className="w-full min-w-44">
                  <SelectValue
                    placeholder={wslCapabilitiesLoading ? 'WSL 불러오는 중' : 'WSL 기본값'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">WSL 기본값</SelectItem>
                  {wslDistros.map((distro) => (
                    <SelectItem key={distro} value={distro}>
                      {distro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        }
      />
    </section>
  )
}
