import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Maximize2, Smartphone, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useAppStore } from '../../store'
import { useMountedRef } from '@/hooks/useMountedRef'
import { useMobilePairingDevicePolling } from './mobile-pairing-device-polling'
import {
  selectRefreshedNetworkAddress,
  type MobileNetworkInterface
} from './mobile-network-interface-selection'
import { MobileNetworkInterfaceSection } from './MobileNetworkInterfaceSection'
export { MOBILE_PANE_SEARCH_ENTRIES } from './mobile-pane-search'

// Why: the section heading "When you leave the mobile app" carries the
// "what happens" framing so the option labels only need to vary on the
// duration knob. Indefinite hold (`null`) is the default. Server clamps
// anything outside [5_000ms, 60min]. See docs/mobile-fit-hold.md.
const AUTO_RESTORE_FIT_OPTIONS: { value: string; label: string; ms: number | null }[] = [
  { value: 'indefinite', label: '기본값: 휴대폰 크기 유지', ms: null },
  { value: '60s', label: '1분 후', ms: 60_000 },
  { value: '5m', label: '5분 후', ms: 5 * 60_000 },
  { value: '30m', label: '30분 후', ms: 30 * 60_000 }
]

function autoRestoreValueFromMs(ms: number | null | undefined): string {
  if (ms == null) {
    return 'indefinite'
  }
  const exact = AUTO_RESTORE_FIT_OPTIONS.find((o) => o.ms === ms)
  return exact ? exact.value : 'indefinite'
}

type PairedDevice = {
  deviceId: string
  name: string
  pairedAt: number
  lastSeenAt: number
}

export function MobilePane(): React.JSX.Element {
  const autoRestoreFitMs = useAppStore((s) => s.settings?.mobileAutoRestoreFitMs ?? null)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pairingUrl, setPairingUrl] = useState<string | null>(null)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState<PairedDevice[]>([])
  const [qrEnlarged, setQrEnlarged] = useState(false)
  const [networkInterfaces, setNetworkInterfaces] = useState<MobileNetworkInterface[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined)
  const [refreshingNetworkInterfaces, setRefreshingNetworkInterfaces] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [deviceCountAtQr, setDeviceCountAtQr] = useState<number | null>(null)
  const devicesRef = useRef<PairedDevice[]>([])
  const codeCopiedResetTimerRef = useRef<number | null>(null)
  const mountedRef = useMountedRef()
  // Why: clipboard IPC can resolve after settings navigation; avoid starting
  // a reset timer that will outlive this pane.
  const pairingCodeButtonMountedRef = useRef(false)

  const clearCodeCopiedResetTimer = useCallback((): void => {
    if (codeCopiedResetTimerRef.current !== null) {
      window.clearTimeout(codeCopiedResetTimerRef.current)
      codeCopiedResetTimerRef.current = null
    }
  }, [])

  const setPairingCodeButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      pairingCodeButtonMountedRef.current = node !== null
      if (node === null) {
        clearCodeCopiedResetTimer()
      }
    },
    [clearCodeCopiedResetTimer]
  )

  const loadDevices = useCallback(async () => {
    try {
      const result = await window.api.mobile.listDevices()
      if (mountedRef.current) {
        devicesRef.current = result.devices
        setDevices(result.devices)
      }
    } catch {
      // Silently fail — device list is non-critical
    }
  }, [mountedRef])

  const loadNetworkInterfaces = useCallback(
    async (opts: { notifyOnError?: boolean } = {}) => {
      setRefreshingNetworkInterfaces(true)
      try {
        const result = await window.api.mobile.listNetworkInterfaces()
        if (mountedRef.current) {
          setNetworkInterfaces(result.interfaces)
          setSelectedAddress((currentAddress) =>
            selectRefreshedNetworkAddress(currentAddress, result.interfaces)
          )
        }
      } catch {
        if (opts.notifyOnError && mountedRef.current) {
          toast.error('네트워크 인터페이스를 새로 고치지 못했습니다')
        }
      } finally {
        if (mountedRef.current) {
          setRefreshingNetworkInterfaces(false)
        }
      }
    },
    [mountedRef]
  )

  const generateQR = useCallback(
    async (opts: { rotate?: boolean } = {}) => {
      setLoading(true)
      try {
        // Why: pass rotate=true on explicit Regenerate clicks so the runtime
        // invalidates any pending token (which may have been screenshotted or
        // copied to clipboard) and mints a fresh credential.
        const result = await window.api.mobile.getPairingQR({
          ...(selectedAddress ? { address: selectedAddress } : {}),
          ...(opts.rotate ? { rotate: true } : {})
        })
        if (result.available) {
          useAppStore.getState().recordFeatureInteraction('mobile-pairing')
          if (mountedRef.current) {
            setQrDataUrl(result.qrDataUrl)
            setPairingUrl(result.pairingUrl)
            setEndpoint(result.endpoint)
            // Why: async QR generation may overlap a device-list refresh; use
            // the latest committed list, then keep this baseline ahead of the
            // post-QR refresh below.
            setDeviceCountAtQr(devicesRef.current.length)
            clearCodeCopiedResetTimer()
            setCodeCopied(false)
            void loadDevices()
          }
        } else {
          if (mountedRef.current) {
            toast.error('WebSocket 전송이 실행 중이 아닙니다')
          }
        }
      } catch {
        if (mountedRef.current) {
          toast.error('QR 코드를 생성하지 못했습니다')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [clearCodeCopiedResetTimer, loadDevices, mountedRef, selectedAddress]
  )

  useEffect(() => {
    void loadDevices()
    void loadNetworkInterfaces()
  }, [loadDevices, loadNetworkInterfaces])

  useMobilePairingDevicePolling({
    deviceCountAtQr,
    currentDeviceCount: devices.length,
    loadDevices
  })

  async function copyPairingCode() {
    if (!pairingUrl) {
      return
    }
    try {
      // Why: Electron renderer's navigator.clipboard fails in some contexts
      // (no transient activation, non-secure context). Use the main-process
      // IPC clipboard which the rest of the app uses everywhere.
      await window.api.ui.writeClipboardText(pairingUrl)
      if (!pairingCodeButtonMountedRef.current) {
        return
      }
      clearCodeCopiedResetTimer()
      setCodeCopied(true)
      codeCopiedResetTimerRef.current = window.setTimeout(() => {
        codeCopiedResetTimerRef.current = null
        setCodeCopied(false)
      }, 2000)
    } catch {
      if (mountedRef.current) {
        toast.error('페어링 코드를 복사하지 못했습니다')
      }
    }
  }

  async function revokeDevice(deviceId: string) {
    try {
      await window.api.mobile.revokeDevice({ deviceId })
      if (mountedRef.current) {
        setDevices((prev) => {
          const nextDevices = prev.filter((d) => d.deviceId !== deviceId)
          devicesRef.current = nextDevices
          return nextDevices
        })
        toast.success('기기를 해제했습니다')
      }
    } catch {
      if (mountedRef.current) {
        toast.error('기기를 해제하지 못했습니다')
      }
    }
  }

  return (
    <div className="space-y-6">
      <MobileNetworkInterfaceSection
        networkInterfaces={networkInterfaces}
        selectedAddress={selectedAddress}
        onSelectedAddressChange={setSelectedAddress}
        refreshingNetworkInterfaces={refreshingNetworkInterfaces}
        onRefreshNetworkInterfaces={() => void loadNetworkInterfaces({ notifyOnError: true })}
        loading={loading}
        hasQrCode={qrDataUrl != null}
        onGenerateQr={() => void generateQR({ rotate: qrDataUrl != null })}
      />

      {/* QR code display */}
      {qrDataUrl && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 py-6">
          <button
            type="button"
            onClick={() => setQrEnlarged(true)}
            className="group relative cursor-pointer rounded-lg border border-border/60 bg-white p-3"
          >
            <img src={qrDataUrl} alt="모바일 페어링용 QR 코드" className="size-48" />
            <Maximize2 className="absolute top-1.5 right-1.5 size-3 text-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          {endpoint && <span className="text-muted-foreground font-mono text-xs">{endpoint}</span>}
          <p className="text-muted-foreground max-w-xs text-center text-xs">
            이 코드를 Korca 모바일 앱으로 스캔하세요. 코드마다 고유한 기기 토큰이 생성됩니다.
          </p>
          {pairingUrl && (
            <div className="flex w-full max-w-lg flex-col gap-1.5 px-4">
              <div className="text-muted-foreground text-center text-xs">
                또는 모바일 앱에 이 코드를 붙여넣으세요:
              </div>
              <Button
                ref={setPairingCodeButtonRef}
                variant="outline"
                size="sm"
                onClick={() => void copyPairingCode()}
                className="font-mono text-[11px] leading-tight whitespace-normal break-all h-auto py-2 px-3"
              >
                <span className="flex-1 text-left">{pairingUrl}</span>
                {codeCopied ? (
                  <Check className="ml-2 size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Copy className="ml-2 size-3.5 shrink-0" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Paired devices */}
      <div>
        <h3 className="mb-2 text-sm font-medium">페어링된 기기</h3>
        {devices.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {qrDataUrl
              ? '아직 페어링된 기기가 없습니다. Korca 모바일 앱으로 QR 코드를 스캔하세요.'
              : '아직 페어링된 기기가 없습니다.'}
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.deviceId}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{device.name}</div>
                  <div className="text-muted-foreground text-xs">
                    페어링됨 {new Date(device.pairedAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void revokeDevice(device.deviceId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {devices.length > 0 && (
          <p className="text-muted-foreground mt-3 text-xs">
            기기를 해제하면 즉시 연결이 끊깁니다.
          </p>
        )}
      </div>

      {/* Mobile behavior — terminal sizing when leaving the app */}
      <div className="rounded-lg border border-border/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Smartphone className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">모바일 앱을 벗어날 때</span>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">
          휴대폰에서 터미널을 사용할 때 Korca는 화면에 맞게 크기를 줄입니다. 앱을 닫거나 다른 곳으로
          전환하면, 이 설정에 따라 휴대폰 크기를 유지할지(대화형 CLI 도구가 재배치되지 않도록)
          아니면 데스크톱 크기로 다시 늘릴지 결정합니다. 터미널 배너의 복원 버튼으로 언제든 수동
          조정할 수 있습니다.
        </p>
        <Select
          value={autoRestoreValueFromMs(autoRestoreFitMs)}
          onValueChange={(v) => {
            const opt = AUTO_RESTORE_FIT_OPTIONS.find((o) => o.value === v)
            if (!opt) {
              return
            }
            void updateSettings({ mobileAutoRestoreFitMs: opt.ms })
          }}
        >
          <SelectTrigger size="sm" className="min-w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTO_RESTORE_FIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Enlarged QR dialog */}
      <Dialog open={qrEnlarged} onOpenChange={setQrEnlarged}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Korca Mobile로 스캔</DialogTitle>
          </DialogHeader>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg bg-white p-4">
                <img src={qrDataUrl} alt="모바일 페어링용 QR 코드" className="size-72" />
              </div>
              {endpoint && (
                <span className="text-muted-foreground font-mono text-xs">{endpoint}</span>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
