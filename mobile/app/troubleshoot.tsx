import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  WifiOff,
  Shield,
  Monitor,
  Clock,
  Globe,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react-native'
import { colors, spacing, typography } from '../src/theme/mobile-theme'
import { loadHosts } from '../src/transport/host-store'
import {
  startDiagnosticFetchTimeout,
  type DiagnosticFetchTimeout
} from '../src/diagnostics/diagnostic-fetch-timeout'
import { formatEndpoint, testHostReachability } from '../src/diagnostics/host-reachability'

type DiagnosticStatus = 'idle' | 'running' | 'done'

type CheckResult = {
  label: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
}

type TroubleshootSection = {
  id: string
  icon: React.ReactNode
  title: string
  steps: string[]
}

const sections: TroubleshootSection[] = [
  {
    id: 'wifi',
    icon: <WifiOff size={16} color={colors.textSecondary} />,
    title: '서로 다른 WiFi 네트워크',
    steps: [
      '두 기기는 같은 로컬 네트워크에 있어야 합니다.',
      '유선과 WiFi가 같은 서브넷을 사용해야 합니다.',
      '두 기기에서 WiFi를 다시 연결해 보세요.'
    ]
  },
  {
    id: 'firewall',
    icon: <Shield size={16} color={colors.textSecondary} />,
    title: '방화벽이 6768 포트를 차단함',
    steps: [
      'macOS: 시스템 설정 → 네트워크 → 방화벽에서 Orca를 허용하세요.',
      'Windows: Defender 방화벽 → 앱 허용에서 비공개 네트워크용 Orca를 켜세요.',
      'Linux: sudo ufw allow 6768',
      '회사/학교 네트워크는 P2P를 막을 수 있습니다. 개인 핫스팟을 사용해 보세요.'
    ]
  },
  {
    id: 'desktop',
    icon: <Monitor size={16} color={colors.textSecondary} />,
    title: '데스크톱 앱이 실행 중이 아님',
    steps: [
      '연결을 받으려면 데스크톱에서 Orca가 열려 있어야 합니다.',
      'Orca를 다시 시작해 보세요. 동반 서버는 실행 시 시작됩니다.',
      '업데이트 후에는 QR 코드로 다시 페어링해야 할 수 있습니다.'
    ]
  },
  {
    id: 'timeout',
    icon: <Clock size={16} color={colors.textSecondary} />,
    title: '연결 시간 초과',
    steps: [
      '휴대폰의 WiFi 신호 세기를 확인하세요.',
      '호스트 목록으로 돌아가 해당 호스트를 다시 눌러 보세요.',
      '시간 초과가 계속되면 두 앱을 모두 다시 시작하세요.'
    ]
  },
  {
    id: 'vpn',
    icon: <Globe size={16} color={colors.textSecondary} />,
    title: 'VPN 간섭',
    steps: [
      'VPN은 로컬 트래픽을 원격 서버로 우회시킬 수 있습니다.',
      'VPN을 끄거나 분할 터널링 / "LAN 허용"을 켜세요.'
    ]
  }
]

function StatusIcon({ status }: { status: CheckResult['status'] }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 size={14} color={colors.statusGreen} />
    case 'fail':
      return <XCircle size={14} color={colors.statusRed} />
    case 'warn':
      return <AlertTriangle size={14} color={colors.textMuted} />
  }
}

export default function TroubleshootScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [diagnosticStatus, setDiagnosticStatus] = useState<DiagnosticStatus>('idle')
  const [checks, setChecks] = useState<CheckResult[]>([])
  const abortRef = useRef(false)
  const diagnosticRunRef = useRef(0)
  const activeInternetCheckRef = useRef<DiagnosticFetchTimeout | null>(null)

  const setTroubleshootRootRef = useCallback((node: View | null): void => {
    if (node !== null) {
      return
    }
    // Why: diagnostics can outlive the screen; cancel the active run when the
    // route detaches without a passive cleanup-only Effect.
    abortRef.current = true
    diagnosticRunRef.current += 1
    activeInternetCheckRef.current?.dispose()
    activeInternetCheckRef.current = null
  }, [])

  const toggleSection = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const runDiagnostics = useCallback(async () => {
    const runId = diagnosticRunRef.current + 1
    diagnosticRunRef.current = runId
    abortRef.current = false
    activeInternetCheckRef.current?.dispose()
    activeInternetCheckRef.current = null
    setDiagnosticStatus('running')
    setChecks([])

    const results: CheckResult[] = []
    const isCurrentRun = () => !abortRef.current && diagnosticRunRef.current === runId

    try {
      const hosts = await loadHosts()
      results.push(
        hosts.length > 0
          ? { label: '페어링된 호스트', status: 'pass', detail: `${hosts.length}개 페어링됨` }
          : { label: '페어링된 호스트', status: 'fail', detail: '없음 - QR을 스캔해 페어링하세요' }
      )
    } catch {
      results.push({ label: '페어링된 호스트', status: 'warn', detail: '호스트 데이터를 읽을 수 없음' })
    }

    if (!isCurrentRun()) {
      return
    }
    setChecks([...results])

    const internetCheck = startDiagnosticFetchTimeout(5000)
    activeInternetCheckRef.current = internetCheck
    try {
      const resp = await fetch('https://dns.google/resolve?name=example.com&type=A', {
        signal: internetCheck.signal
      })
      if (!isCurrentRun()) {
        return
      }
      results.push(
        resp.ok
          ? { label: '인터넷', status: 'pass', detail: '연결됨' }
          : { label: '인터넷', status: 'warn', detail: '예상치 못한 응답' }
      )
    } catch {
      if (!isCurrentRun()) {
        return
      }
      results.push({ label: '인터넷', status: 'fail', detail: '연결 없음' })
    } finally {
      internetCheck.dispose()
      if (activeInternetCheckRef.current === internetCheck) {
        activeInternetCheckRef.current = null
      }
    }

    if (!isCurrentRun()) {
      return
    }
    setChecks([...results])

    try {
      const hosts = await loadHosts()
      for (const host of hosts) {
        if (!isCurrentRun()) {
          return
        }
        const reachable = await testHostReachability(host.endpoint)
        if (!isCurrentRun()) {
          return
        }
        results.push({
          label: host.name,
          status: reachable ? 'pass' : 'fail',
          detail: reachable
            ? `${formatEndpoint(host.endpoint)}에서 연결 가능`
            : `${formatEndpoint(host.endpoint)}에 연결할 수 없음`
        })
        setChecks([...results])
      }
    } catch {
      results.push({ label: '호스트', status: 'warn', detail: '테스트할 수 없음' })
    }

    if (!isCurrentRun()) {
      return
    }

    results.push({
      label: '플랫폼',
      status: 'pass',
      detail: `${Platform.OS} ${Platform.Version ?? ''}`
    })

    setChecks([...results])
    setDiagnosticStatus('done')
  }, [])

  return (
    <View
      ref={setTroubleshootRootRef}
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.heading}>문제 해결</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.diagnosticButton,
            pressed && styles.diagnosticButtonPressed,
            diagnosticStatus === 'running' && styles.diagnosticButtonDisabled
          ]}
          onPress={runDiagnostics}
          disabled={diagnosticStatus === 'running'}
        >
          {diagnosticStatus === 'running' ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Activity size={16} color={colors.textPrimary} />
          )}
          <Text style={styles.diagnosticButtonLabel}>
            {diagnosticStatus === 'running'
              ? '실행 중…'
              : diagnosticStatus === 'done'
                ? '다시 실행'
                : '진단 실행'}
          </Text>
        </Pressable>

        {checks.length > 0 && (
          <View style={styles.section}>
            {checks.map((check, i) => (
              <View key={i}>
                {i > 0 && <View style={styles.separator} />}
                <View style={styles.checkRow}>
                  <StatusIcon status={check.status} />
                  <Text style={styles.checkLabel}>{check.label}</Text>
                  <Text
                    style={[styles.checkDetail, check.status === 'fail' && styles.checkDetailFail]}
                  >
                    {check.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionHeading}>일반적인 문제</Text>

        <View style={styles.section}>
          {sections.map((section, i) => (
            <View key={section.id}>
              {i > 0 && <View style={styles.separator} />}
              <Pressable
                style={({ pressed }) => [styles.accordionHeader, pressed && styles.rowPressed]}
                onPress={() => toggleSection(section.id)}
              >
                {section.icon}
                <Text style={styles.accordionTitle}>{section.title}</Text>
                {expandedId === section.id ? (
                  <ChevronUp size={16} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={16} color={colors.textMuted} />
                )}
              </Pressable>
              {expandedId === section.id && (
                <View style={styles.accordionBody}>
                  {section.steps.map((step, j) => (
                    <View key={j} style={styles.stepRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    padding: spacing.lg
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: spacing.xl
  },
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgRaised,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg
  },
  diagnosticButtonPressed: {
    opacity: 0.7
  },
  diagnosticButtonDisabled: {
    opacity: 0.5
  },
  diagnosticButtonLabel: {
    fontSize: typography.bodySize,
    fontWeight: '600',
    color: colors.textPrimary
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2
  },
  checkLabel: {
    fontSize: typography.bodySize,
    fontWeight: '500',
    color: colors.textPrimary
  },
  checkDetail: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.metaSize,
    color: colors.textMuted
  },
  checkDetailFail: {
    color: colors.statusRed
  },
  sectionHeading: {
    fontSize: typography.metaSize,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs
  },
  section: {
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.md
  },
  rowPressed: {
    backgroundColor: colors.bgRaised
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2
  },
  accordionTitle: {
    flex: 1,
    fontSize: typography.bodySize,
    fontWeight: '500',
    color: colors.textPrimary
  },
  accordionBody: {
    paddingHorizontal: spacing.md + 2,
    paddingBottom: spacing.md,
    gap: spacing.xs + 2
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  bullet: {
    fontSize: typography.metaSize,
    color: colors.textMuted,
    lineHeight: 18
  },
  stepText: {
    flex: 1,
    fontSize: typography.metaSize,
    color: colors.textMuted,
    lineHeight: 18
  }
})
