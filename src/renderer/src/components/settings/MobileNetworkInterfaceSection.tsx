import { ExternalLink, Loader2, QrCode, RefreshCw, Wifi } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import type { MobileNetworkInterface } from './mobile-network-interface-selection'

const TAILSCALE_DOWNLOAD_URL = 'https://tailscale.com/download'

type MobileNetworkInterfaceSectionProps = {
  networkInterfaces: MobileNetworkInterface[]
  selectedAddress: string | undefined
  onSelectedAddressChange: (address: string) => void
  refreshingNetworkInterfaces: boolean
  onRefreshNetworkInterfaces: () => void
  loading: boolean
  hasQrCode: boolean
  onGenerateQr: () => void
}

function formatInterfaceLabel(iface: MobileNetworkInterface): string {
  return `${iface.address} (${iface.name})`
}

export function MobileNetworkInterfaceSection({
  networkInterfaces,
  selectedAddress,
  onSelectedAddressChange,
  refreshingNetworkInterfaces,
  onRefreshNetworkInterfaces,
  loading,
  hasQrCode,
  onGenerateQr
}: MobileNetworkInterfaceSectionProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wifi className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">네트워크 인터페이스</span>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        QR 코드에 표시할 네트워크 주소를 선택하세요. 같은 네트워크에서 연결할 때는 LAN 주소를,
        네트워크를 넘나들어 연결할 때는 오버레이 네트워크 주소(Tailscale, ZeroTier)를 사용하세요.
      </p>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedAddress} onValueChange={onSelectedAddressChange}>
            <SelectTrigger size="sm" className="min-w-[220px]">
              <SelectValue placeholder="인터페이스를 찾지 못했습니다" />
            </SelectTrigger>
            <SelectContent>
              {networkInterfaces.map((iface) => (
                <SelectItem key={`${iface.name}-${iface.address}`} value={iface.address}>
                  {formatInterfaceLabel(iface)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Why: VPN/tailnet interfaces can appear after this pane mounts.
              Re-enumerating OS state here avoids requiring an Korca restart. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRefreshNetworkInterfaces}
                disabled={refreshingNetworkInterfaces}
                aria-label="네트워크 인터페이스 새로고침"
                className="text-muted-foreground"
              >
                <RefreshCw className={refreshingNetworkInterfaces ? 'animate-spin' : ''} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              네트워크 인터페이스 새로고침
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          onClick={onGenerateQr}
          disabled={loading || !selectedAddress}
          size="sm"
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : hasQrCode ? (
            <RefreshCw className="size-3.5" />
          ) : (
            <QrCode className="size-3.5" />
          )}
          {hasQrCode ? '다시 생성' : 'QR 코드 생성'}
        </Button>
      </div>
      <Accordion type="single" collapsible className="mt-4 border-t border-border/60 pt-2">
        <AccordionItem value="remote-pairing-guide">
          <AccordionTrigger className="py-2 text-xs">
            Wi-Fi 밖에서도 tailnet으로 연결
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              Korca Mobile은 이 컴퓨터에 직접 연결됩니다. 같은 로컬 네트워크가 아닌 곳에서
              사용하려면, 컴퓨터와 휴대폰을 같은 private overlay 네트워크에 연결한 뒤 해당 네트워크
              주소를 선택해 QR 코드를 생성하세요.
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                설치{' '}
                <button
                  type="button"
                  onClick={() => void window.api.shell.openUrl(TAILSCALE_DOWNLOAD_URL)}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Tailscale
                  <ExternalLink className="size-3" />
                </button>{' '}
                을 컴퓨터와 휴대폰에 설치하세요.
              </li>
              <li>두 기기에서 같은 tailnet에 로그인하세요.</li>
              <li>
                이 네트워크 인터페이스 메뉴에서 보통 100.x.y.z 형식인 Tailscale 주소를 선택하세요.
              </li>
              <li>QR 코드를 다시 생성하고 Korca 모바일 앱에서 스캔하세요.</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
