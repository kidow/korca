import { track } from '@/lib/telemetry'
import type { EventProps } from '../../../../shared/telemetry-events'

export type KorcaCliFeatureTipSource = EventProps<'korca_cli_feature_tip_shown'>['source']
export type KorcaCliFeatureTipSetupResult = EventProps<'korca_cli_feature_tip_setup_result'>['result']

export function getKorcaCliFeatureTipTelemetrySource(value: unknown): KorcaCliFeatureTipSource {
  return value === 'app_open' ? 'app_open' : 'manual'
}

export function trackKorcaCliFeatureTipShown(source: KorcaCliFeatureTipSource): void {
  track('korca_cli_feature_tip_shown', { source })
}

export function trackKorcaCliFeatureTipSetupClicked(source: KorcaCliFeatureTipSource): void {
  track('korca_cli_feature_tip_setup_clicked', { source })
}

export function trackKorcaCliFeatureTipSetupResult(
  source: KorcaCliFeatureTipSource,
  result: KorcaCliFeatureTipSetupResult
): void {
  track('korca_cli_feature_tip_setup_result', { source, result })
}
