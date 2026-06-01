import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Accessibility,
  Bluetooth,
  Camera,
  ExternalLink,
  HardDrive,
  Mic,
  MonitorUp,
  Network,
  RefreshCw,
  ShieldCheck,
  Usb,
  Workflow
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  DeveloperPermissionId,
  DeveloperPermissionState,
  DeveloperPermissionStatus
} from '../../../../shared/developer-permissions-types'
import { Button } from '../ui/button'
export { DEVELOPER_PERMISSIONS_PANE_SEARCH_ENTRIES } from './developer-permissions-search'

type PermissionDefinition = {
  id: DeveloperPermissionId
  label: string
  description: string
  actionLabel: string
  icon: ReactNode
}

const PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'microphone',
    label: '마이크',
    description: '음성 입력, 전사, 오디오 녹음, sox, ffmpeg, Whisper CLI용입니다.',
    actionLabel: '요청',
    icon: <Mic className="size-4" />
  },
  {
    id: 'camera',
    label: '카메라',
    description: '웹캠 캡처 및 카메라 기반 로컬 테스트 앱용입니다.',
    actionLabel: '요청',
    icon: <Camera className="size-4" />
  },
  {
    id: 'screen',
    label: '화면 녹화',
    description: '스크린샷, 비주얼 자동화, UI 검사 도구용입니다.',
    actionLabel: '설정 열기',
    icon: <MonitorUp className="size-4" />
  },
  {
    id: 'accessibility',
    label: '손쉬운 사용',
    description: '키 입력 주입, 창 제어, UI 자동화 도구용입니다.',
    actionLabel: '요청',
    icon: <Accessibility className="size-4" />
  },
  {
    id: 'full-disk-access',
    label: '전체 디스크 접근',
    description: '터미널 세션에서 보호된 폴더에 영구적으로 접근합니다.',
    actionLabel: '설정 열기',
    icon: <HardDrive className="size-4" />
  },
  {
    id: 'automation',
    label: '자동화',
    description: '다른 로컬 앱을 제어하는 스크립트용 Apple Events입니다.',
    actionLabel: '프롬프트 실행',
    icon: <Workflow className="size-4" />
  },
  {
    id: 'local-network',
    label: '로컬 네트워크',
    description: '네트워크상의 개발 서버 탐색 및 접근용입니다.',
    actionLabel: '프롬프트 실행',
    icon: <Network className="size-4" />
  },
  {
    id: 'usb',
    label: 'USB 장치',
    description: 'USB 장치와 통신하는 하드웨어 디버깅 및 장치 도구용입니다.',
    actionLabel: '설정 열기',
    icon: <Usb className="size-4" />
  },
  {
    id: 'bluetooth',
    label: '블루투스',
    description: '블루투스 장치 도구와 로컬 하드웨어 실험용입니다.',
    actionLabel: '설정 열기',
    icon: <Bluetooth className="size-4" />
  }
]

function statusLabel(status: DeveloperPermissionStatus | undefined): string {
  switch (status) {
    case 'granted':
      return '허용됨'
    case 'denied':
      return '거부됨'
    case 'not-determined':
      return '요청 안 됨'
    case 'restricted':
      return '제한됨'
    case 'unsupported':
      return 'macOS 전용'
    case 'ready':
      return '권한 있음'
    case 'unknown':
    case undefined:
      return '직접 확인'
  }
}

function statusClass(status: DeveloperPermissionStatus | undefined): string {
  if (status === 'granted' || status === 'ready') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }
  if (status === 'denied' || status === 'restricted') {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }
  return 'border-border bg-muted text-muted-foreground'
}

export function DeveloperPermissionsPane(): React.JSX.Element {
  const [states, setStates] = useState<DeveloperPermissionState[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<DeveloperPermissionId | null>(null)
  const mountedRef = useRef(true)
  const refreshSequenceRef = useRef(0)

  const stateById = useMemo(
    () => new Map(states.map((state) => [state.id, state.status] as const)),
    [states]
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      refreshSequenceRef.current += 1
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    const refreshId = refreshSequenceRef.current + 1
    refreshSequenceRef.current = refreshId
    setLoading(true)
    try {
      const nextStates = await window.api.developerPermissions.getStatus()
      if (mountedRef.current && refreshId === refreshSequenceRef.current) {
        setStates(nextStates)
      }
    } catch {
      if (mountedRef.current && refreshId === refreshSequenceRef.current) {
        toast.error('개발자 권한을 불러오지 못했습니다')
      }
    } finally {
      if (mountedRef.current && refreshId === refreshSequenceRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Why: after the user flips a permission in System Settings and switches
  // back to Orca, the chip should reflect the new status without a manual
  // Refresh click. Tied to window focus rather than a polling interval so
  // we don't keep hammering `systemPreferences` while the pane is idle.
  useEffect(() => {
    const onFocus = (): void => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const request = async (id: DeveloperPermissionId): Promise<void> => {
    setPendingId(id)
    try {
      const result = await window.api.developerPermissions.request({ id })
      if (!mountedRef.current) {
        return
      }
      await refresh()
      if (!mountedRef.current) {
        return
      }
      if (result.status === 'granted') {
        toast.success('권한이 허용되었습니다')
      } else if (result.openedSystemSettings) {
        toast.message('macOS 개인정보 보호 및 보안 화면을 열었습니다')
      } else {
        toast.message('권한 요청을 보냈습니다')
      }
    } catch {
      if (mountedRef.current) {
        toast.error('권한을 요청하지 못했습니다')
      }
    } finally {
      if (mountedRef.current) {
        setPendingId(null)
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/25 px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" />
            터미널 도구는 Orca의 macOS 개인정보 보호 범위를 그대로 사용합니다.
          </div>
          <p className="text-xs text-muted-foreground">
            CLI, 로컬 앱 또는 자동화 도구가 macOS 개인정보 접근을 필요로 할 때 이 컨트롤을
            사용하세요. Orca는 시작 시 묻지 않습니다.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refresh()}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      <div className="divide-y divide-border/60 rounded-lg border border-border/60">
        {PERMISSIONS.map((permission) => {
          const status = stateById.get(permission.id)
          const pending = pendingId === permission.id

          return (
            <div key={permission.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 text-muted-foreground">{permission.icon}</div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{permission.label}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusClass(
                        status
                      )}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{permission.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || status === 'unsupported'}
                onClick={() => void request(permission.id)}
                className="shrink-0 gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                {pending ? '작업 중...' : permission.actionLabel}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
