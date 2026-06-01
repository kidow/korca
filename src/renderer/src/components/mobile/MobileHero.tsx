import { ArrowLeft, ArrowRight, Copy, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { MobileNetworkInterface } from '../settings/mobile-network-interface-selection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export type Platform = 'ios' | 'android'
export type StepIndex = 0 | 1

export type PairedDevice = {
  deviceId: string
  name: string
  pairedAt: number
  lastSeenAt: number
}

// Why: header copy needs to refer to the *user's* device by its native name.
function getDeviceLabel(): string {
  const ua = navigator.userAgent
  if (ua.includes('Mac')) {
    return 'Mac'
  }
  if (ua.includes('Windows')) {
    return 'PC'
  }
  return 'computer'
}

export function HeroIntro({ onStart }: { onStart: () => void }): React.JSX.Element {
  return (
    <div className="mp-intro-shell">
      <div className="mp-eyebrow-row">
        <span className="mp-eyebrow">Orca 모바일</span>
      </div>
      <h1 className="mp-h1">작업공간을 손안에서 바로.</h1>
      <p className="mp-lead">
        휴대폰에서 Orca를 제어하세요. 자리를 비운 동안에도 에이전트를 확인하고, 변경 사항을 검토하고, 작업을 시작할 수 있습니다.
      </p>
      <div className="mp-platform-badges" aria-label="지원하는 모바일 플랫폼">
        <span className="mp-platform-label">지원 플랫폼</span>
        <span className="mp-platform-badge">
          <IosBrandIcon />
          iOS
        </span>
        <span className="mp-platform-badge">
          <AndroidLogo />
          Android
        </span>
      </div>
      <div className="mp-cta-row">
        <button
          type="button"
          className="mp-primary-action mp-flow-primary-action"
          onClick={onStart}
        >
          시작하기
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

type HeroPairedProps = {
  devices: readonly PairedDevice[]
  onPairAnother: () => void
  onRevoke: (deviceId: string) => void
  revokingDeviceIds: readonly string[]
}

export function HeroPaired({
  devices,
  onPairAnother,
  onRevoke,
  revokingDeviceIds
}: HeroPairedProps): React.JSX.Element {
  return (
    <div>
      <div className="mp-eyebrow-row">
        <span className="mp-eyebrow">Orca 모바일</span>
      </div>
      <h1 className="mp-h1">
        {devices.length === 1 ? '휴대폰이 페어링되었습니다.' : '휴대폰들이 페어링되었습니다.'}
      </h1>
      <p className="mp-lead-sm">
        Orca 모바일을 열어 작업을 이어가거나 다른 기기를 페어링하세요.
      </p>
      <ul className="mp-paired-list">
        {devices.map((device) => {
          const revoking = revokingDeviceIds.includes(device.deviceId)
          return (
            <li key={device.deviceId} className="mp-paired-row">
              <div className="mp-paired-icon">
                <Smartphone className="size-4" />
              </div>
              <div className="mp-paired-main">
                <div className="mp-paired-name">{device.name}</div>
                <div className="mp-paired-meta">
                  {new Date(device.pairedAt).toLocaleDateString()}에 페어링됨
                </div>
              </div>
              <button
                type="button"
                className="mp-paired-revoke"
                onClick={() => onRevoke(device.deviceId)}
                disabled={revoking}
                aria-label={`${device.name} 해제`}
                title="기기 해제"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mp-flow-actions">
        <button type="button" className="mp-secondary-action" onClick={onPairAnother}>
          <Smartphone className="size-3.5" />
          다른 기기 페어링
        </button>
        <span />
      </div>
    </div>
  )
}

type HeroFlowProps = {
  stepIdx: StepIndex
  platform: Platform
  onPlatformChange: (next: Platform) => void
  installQrUrl: string | null
  installCopy: { description: string; ctaLabel: string; url: string }
  onOpenInstallUrl: () => void
  onCopyInstallUrl: () => void
  pairQrDataUrl: string | null
  pairingUrl: string | null
  pairLoading: boolean
  onRegeneratePairing: () => void
  onCopyPairingCode: () => void
  networkInterfaces: readonly MobileNetworkInterface[]
  selectedAddress: string | undefined
  onSelectedAddressChange: (address: string) => void
  onRefreshNetworkInterfaces: () => void
  refreshingNetworkInterfaces: boolean
  onBack: () => void
  onContinue: () => void
  onDone?: () => void
}

export function HeroFlow({
  stepIdx,
  platform,
  onPlatformChange,
  installQrUrl,
  installCopy,
  onOpenInstallUrl,
  onCopyInstallUrl,
  pairQrDataUrl,
  pairingUrl,
  pairLoading,
  onRegeneratePairing,
  onCopyPairingCode,
  networkInterfaces,
  selectedAddress,
  onSelectedAddressChange,
  onRefreshNetworkInterfaces,
  refreshingNetworkInterfaces,
  onBack,
  onContinue,
  onDone
}: HeroFlowProps): React.JSX.Element {
  const isLast = stepIdx === 1

  return (
    <div className="mp-flow-card">
      <div className="mp-flow-viewport">
        <div className={cn('mp-flow-screen', stepIdx === 0 ? 'is-active' : 'is-past')}>
          <div className="mp-step2-layout">
            <div className="mp-step2-copy">
              <div className="mp-eyebrow-row">
                <div className="mp-step-num">{stepIdx + 1}</div>
                <span className="mp-eyebrow">1 / 2단계</span>
              </div>
              <h2 className="mp-h2">앱을 받으세요.</h2>
              <p className="mp-lead-sm">
                휴대폰으로 QR을 스캔하거나 설치 링크를 열어 Orca 모바일을 받으세요.
              </p>
              <div className="mp-tab-toggle">
                <button
                  type="button"
                  className={cn(platform === 'ios' && 'is-active')}
                  aria-pressed={platform === 'ios'}
                  onClick={() => onPlatformChange('ios')}
                >
                  <IosBrandIcon />
                  iOS
                </button>
                <button
                  type="button"
                  className={cn(platform === 'android' && 'is-active')}
                  aria-pressed={platform === 'android'}
                  onClick={() => onPlatformChange('android')}
                >
                  <AndroidLogo />
                  Android
                </button>
              </div>
              <div className="mp-inline-actions">
                <button type="button" className="mp-ghost-action" onClick={onOpenInstallUrl}>
                  {installCopy.ctaLabel}
                </button>
                <button type="button" className="mp-text-link" onClick={onCopyInstallUrl}>
                  <Copy className="size-3.5" />
                  설치 링크 복사
                </button>
              </div>
            </div>
            <div className="mp-qr" aria-label="설치 QR 코드">
              {installQrUrl ? <img src={installQrUrl} alt="설치 QR" /> : null}
            </div>
          </div>
        </div>

        <div className={cn('mp-flow-screen', stepIdx === 1 && 'is-active')}>
          <div className="mp-step2-layout">
            <div className="mp-step2-copy">
              <div className="mp-eyebrow-row">
                <div className="mp-step-num">2</div>
                <span className="mp-eyebrow">2 / 2단계</span>
              </div>
              <h2 className="mp-h2">이 {getDeviceLabel()}를 페어링하세요.</h2>
              <p className="mp-lead-sm">
                Orca 모바일을 열고 <strong>데스크톱 페어링</strong>을 누른 뒤 코드를 스캔하세요.
              </p>

              <div className="mp-network-row">
                <span className="mp-network-label">네트워크</span>
                <Select
                  value={selectedAddress ?? ''}
                  onValueChange={onSelectedAddressChange}
                  disabled={networkInterfaces.length === 0}
                >
                  <SelectTrigger
                    size="sm"
                    className="mp-network-select"
                    aria-label="알릴 네트워크 인터페이스"
                  >
                    <SelectValue placeholder="인터페이스를 찾지 못했습니다" />
                  </SelectTrigger>
                  <SelectContent>
                    {networkInterfaces.map((iface) => (
                      <SelectItem key={`${iface.name}-${iface.address}`} value={iface.address}>
                        {iface.address} ({iface.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className={cn('mp-network-refresh', refreshingNetworkInterfaces && 'is-spinning')}
                  onClick={onRefreshNetworkInterfaces}
                  disabled={refreshingNetworkInterfaces}
                  aria-label="네트워크 인터페이스 새로고침"
                  title="네트워크 인터페이스 새로고침"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </div>

              <div className="mp-inline-actions">
                <span className="mp-action-divider">스캔할 수 없나요?</span>
                <button
                  type="button"
                  className="mp-text-link"
                  onClick={onCopyPairingCode}
                  disabled={!pairingUrl || pairLoading}
                >
                  <Copy className="size-3.5" />
                  페어링 코드 복사
                </button>
              </div>
            </div>
            <div className="mp-qr-stack">
              <div
                className="mp-qr"
                aria-label="페어링 QR 코드"
                aria-busy={pairLoading && !pairQrDataUrl}
              >
                {pairQrDataUrl ? (
                  <img src={pairQrDataUrl} alt="페어링 QR" />
                ) : pairLoading ? (
                  <span className="mp-qr-loading">생성 중…</span>
                ) : null}
              </div>
              <button
                type="button"
                className="mp-link-under"
                onClick={onRegeneratePairing}
                disabled={pairLoading}
              >
                {pairLoading ? '생성 중…' : pairQrDataUrl ? '코드 다시 생성' : '코드 생성'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mp-flow-actions">
        <button type="button" className="mp-flow-back" onClick={onBack}>
          <ArrowLeft className="size-3" />
          뒤로
        </button>
        {isLast ? (
          onDone ? (
            <button
              type="button"
              className="mp-primary-action mp-flow-primary-action"
              onClick={onDone}
            >
              완료
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <span />
          )
        ) : (
          <button
            type="button"
            className="mp-flow-continue mp-flow-primary-action"
            onClick={onContinue}
          >
            계속
            <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Why: these are exact filled brand paths, not generic line approximations.
function IosBrandIcon(): React.JSX.Element {
  return (
    <svg className="mp-platform-brand-icon" viewBox="0 0 24 24" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function AndroidLogo(): React.JSX.Element {
  return (
    <svg className="mp-platform-brand-icon" viewBox="0 0 24 24" aria-hidden>
      <path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z" />
    </svg>
  )
}
