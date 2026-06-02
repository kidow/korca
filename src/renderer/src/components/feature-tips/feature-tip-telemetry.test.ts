import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/telemetry', () => ({
  track: trackMock
}))

import {
  getKorcaCliFeatureTipTelemetrySource,
  trackKorcaCliFeatureTipSetupClicked,
  trackKorcaCliFeatureTipSetupResult,
  trackKorcaCliFeatureTipShown
} from './feature-tip-telemetry'

describe('feature tip telemetry', () => {
  beforeEach(() => {
    trackMock.mockClear()
  })

  it('keeps feature tip sources low-cardinality', () => {
    expect(getKorcaCliFeatureTipTelemetrySource('app_open')).toBe('app_open')
    expect(getKorcaCliFeatureTipTelemetrySource('settings')).toBe('manual')
    expect(getKorcaCliFeatureTipTelemetrySource(undefined)).toBe('manual')
  })

  it('tracks CLI tip exposure once per explicit call', () => {
    trackKorcaCliFeatureTipShown('app_open')

    expect(trackMock).toHaveBeenCalledTimes(1)
    expect(trackMock).toHaveBeenCalledWith('korca_cli_feature_tip_shown', {
      source: 'app_open'
    })
  })

  it('tracks setup click and result without raw CLI details', () => {
    trackKorcaCliFeatureTipSetupClicked('app_open')
    trackKorcaCliFeatureTipSetupResult('app_open', 'installed')

    expect(trackMock).toHaveBeenCalledTimes(2)
    expect(trackMock).toHaveBeenNthCalledWith(1, 'korca_cli_feature_tip_setup_clicked', {
      source: 'app_open'
    })
    expect(trackMock).toHaveBeenNthCalledWith(2, 'korca_cli_feature_tip_setup_result', {
      source: 'app_open',
      result: 'installed'
    })
  })
})
