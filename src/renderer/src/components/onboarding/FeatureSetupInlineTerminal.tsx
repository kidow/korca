import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react'
import { track } from '@/lib/telemetry'
import { OnboardingInlineCommandTerminal } from './OnboardingInlineCommandTerminal'
import {
  onboardingFeatureSetupTelemetrySelection,
  type OnboardingFeatureSetupSelection
} from './onboarding-feature-setup'

type FeatureSetupInlineTerminalProps = {
  command: string
  selection: OnboardingFeatureSetupSelection
}

export function FeatureSetupInlineTerminal({
  command,
  selection
}: FeatureSetupInlineTerminalProps): React.JSX.Element {
  const terminalOpenedTrackedRef = useRef(false)
  const terminalInteractedTrackedRef = useRef(false)

  const selectionTelemetry = useMemo(
    () => onboardingFeatureSetupTelemetrySelection(selection),
    [selection]
  )

  const trackTerminalOpened = useCallback(() => {
    if (terminalOpenedTrackedRef.current) {
      return
    }
    terminalOpenedTrackedRef.current = true
    track('onboarding_feature_setup_terminal_opened', selectionTelemetry)
  }, [selectionTelemetry])

  const trackTerminalInteraction = useCallback(
    (method: 'keyboard' | 'pointer', event?: KeyboardEvent<HTMLElement>) => {
      if (terminalInteractedTrackedRef.current) {
        return
      }
      const isMac = navigator.userAgent.includes('Mac')
      const isContinueShortcut = event?.key === 'Enter' && (isMac ? event.metaKey : event.ctrlKey)
      if (isContinueShortcut) {
        return
      }
      // Why: auto-insert focuses the terminal programmatically; only count
      // direct terminal activity, not the global continue shortcut.
      terminalInteractedTrackedRef.current = true
      track('onboarding_feature_setup_terminal_interacted', {
        ...selectionTelemetry,
        method
      })
    },
    [selectionTelemetry]
  )

  return (
    <OnboardingInlineCommandTerminal
      command={command}
      title="스킬 설정"
      ariaLabel="스킬 설정 명령"
      description="엔터를 눌러 명령을 실행하고, npx 확인이 나오면 승인하세요. 나중에 설정에서 다시 할 수도 있습니다."
      terminalHeightPx={180}
      terminalTopMarginPx={16}
      autoScrollIntoView={false}
      onOpened={trackTerminalOpened}
      onInteracted={trackTerminalInteraction}
    />
  )
}
