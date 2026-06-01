import { useState, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { ChevronLeft, Clipboard as ClipboardIcon, QrCode } from 'lucide-react-native'
import { decodePairingUrl, parsePairingCode } from '../src/transport/pairing'
import {
  startPairingConnectionAttempt,
  type PairingConnectionAttempt
} from '../src/transport/pairing-connection-attempt'
import { connect } from '../src/transport/rpc-client'
import { saveHost, getNextHostName } from '../src/transport/host-store'
import type { ConnectionLogEntry, PairingOffer, RpcResponse } from '../src/transport/types'
import { colors, spacing, radii, typography } from '../src/theme/mobile-theme'
import { TextInputModal } from '../src/components/TextInputModal'
import { ConnectionLog } from '../src/components/ConnectionLog'

// Why: see pair-confirm.tsx — cap initial-pair "Connecting…" so a broken
// route surfaces as a real error with the log visible instead of a
// silent infinite spinner.
const PAIRING_OVERALL_TIMEOUT_MS = 25_000

function Step({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  )
}

export default function PairScanScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [status, setStatus] = useState<'scanning' | 'connecting' | 'error'>('scanning')
  const [errorMessage, setErrorMessage] = useState('')
  const [pasteVisible, setPasteVisible] = useState(false)
  const [logs, setLogs] = useState<ConnectionLogEntry[]>([])
  const logsRef = useRef<ConnectionLogEntry[]>([])
  const processingRef = useRef(false)
  const mountedRef = useRef(true)
  const activePairingAttemptRef = useRef<PairingConnectionAttempt | null>(null)

  const setPairScanRootRef = useCallback((node: View | null): void => {
    if (node !== null) {
      mountedRef.current = true
      return
    }
    // Why: pairing attempts can outlive the visible route; dispose them when
    // the scan screen detaches without a passive cleanup-only Effect.
    mountedRef.current = false
    activePairingAttemptRef.current?.dispose()
    activePairingAttemptRef.current = null
  }, [])

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (processingRef.current) {
        return
      }
      processingRef.current = true

      const offer = decodePairingUrl(data)
      if (!offer) {
        setStatus('error')
        setErrorMessage('유효한 Orca QR 코드가 아닙니다')
        processingRef.current = false
        return
      }

      void testAndSave(offer)
    },
    [router]
  )

  const handlePasteSubmit = useCallback((input: string) => {
    setPasteVisible(false)
    if (processingRef.current) {
      return
    }
    processingRef.current = true

    const offer = parsePairingCode(input)
    if (!offer) {
      setStatus('error')
      setErrorMessage('유효한 페어링 코드가 아닙니다. 컴퓨터에서 다시 복사해 붙여넣으세요')
      processingRef.current = false
      return
    }

    void testAndSave(offer)
  }, [])

  async function testAndSave(offer: PairingOffer) {
    setStatus('connecting')
    logsRef.current = []
    setLogs([])
    let client: ReturnType<typeof connect> | null = null
    activePairingAttemptRef.current?.dispose()

    // Why: split the try/catch around the network call vs the local save
    // so a Keychain or AsyncStorage failure doesn't masquerade as a
    // "Cannot connect — same network?" error. Pairing reached the
    // desktop fine; the failure is local persistence.
    let response: RpcResponse
    const attempt = startPairingConnectionAttempt({
      timeoutMs: PAIRING_OVERALL_TIMEOUT_MS,
      closeClient: () => client?.close()
    })
    activePairingAttemptRef.current = attempt
    try {
      client = connect(offer.endpoint, offer.deviceToken, offer.publicKeyB64, {
        onLog: (entry) => {
          if (!mountedRef.current || activePairingAttemptRef.current !== attempt) {
            return
          }
          logsRef.current = [...logsRef.current, entry]
          setLogs(logsRef.current)
        }
      })
      response = await client.sendRequest('status.get')
      const attemptIsCurrent = activePairingAttemptRef.current === attempt
      attempt.dispose()
      if (activePairingAttemptRef.current === attempt) {
        activePairingAttemptRef.current = null
      }
      if (!mountedRef.current || !attemptIsCurrent) {
        return
      }
    } catch (err) {
      const timedOut = attempt.timedOut
      const attemptIsCurrent = activePairingAttemptRef.current === attempt
      attempt.dispose()
      if (activePairingAttemptRef.current === attempt) {
        activePairingAttemptRef.current = null
      }
      if (!mountedRef.current || !attemptIsCurrent) {
        return
      }
      console.warn('[pair] connect failed', err)
      setStatus('error')
      setErrorMessage(
        timedOut
          ? `${PAIRING_OVERALL_TIMEOUT_MS / 1000}초 안에 연결할 수 없습니다. 어디에서 멈췄는지 아래 로그를 확인하세요`
          : '연결할 수 없습니다. 컴퓨터가 같은 네트워크에 있는지 확인하세요'
      )
      processingRef.current = false
      return
    }

    if (!response.ok) {
      if (!mountedRef.current) {
        return
      }
      if (response.error.code === 'unauthorized') {
        setStatus('error')
        setErrorMessage('인증 실패 - 토큰이 만료되었을 수 있습니다')
        processingRef.current = false
        return
      }
      setStatus('error')
      setErrorMessage(`서버 오류: ${response.error.message}`)
      processingRef.current = false
      return
    }

    try {
      const hostId = `host-${Date.now()}`
      const hostName = await getNextHostName()
      await saveHost({
        id: hostId,
        name: hostName,
        endpoint: offer.endpoint,
        deviceToken: offer.deviceToken,
        publicKeyB64: offer.publicKeyB64,
        lastConnected: Date.now()
      })
      if (!mountedRef.current) {
        return
      }
      router.replace(`/h/${hostId}`)
    } catch (err) {
      if (!mountedRef.current) {
        return
      }
      console.warn('[pair] save failed', err)
      setStatus('error')
      setErrorMessage(
        `페어링은 성공했지만 호스트를 저장할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`
      )
      processingRef.current = false
    }
  }

  function retry() {
    setStatus('scanning')
    setErrorMessage('')
    logsRef.current = []
    setLogs([])
    processingRef.current = false
  }

  // Why: bottom inset accounts for Android 3-button nav bars and iOS
  // home-indicator areas that would otherwise overlap the 'Or paste
  // pairing code' button at the bottom of the scan screen.
  const containerPadding = {
    paddingTop: insets.top + spacing.sm,
    paddingBottom: insets.bottom + spacing.sm
  }

  if (!permission) {
    return (
      <View ref={setPairScanRootRef} style={[styles.container, containerPadding]}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    )
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain !== false
    return (
      <View ref={setPairScanRootRef} style={[styles.container, containerPadding]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.centered}>
          <Text style={styles.title}>
            {canAskAgain ? '데스크톱과 페어링' : '카메라 접근이 비활성화됨'}
          </Text>
          <Text style={styles.subtitle}>
            {canAskAgain
              ? '데스크톱의 Orca에서 QR 코드를 스캔하거나, 대신 페어링 코드를 붙여넣으세요.'
              : '설정에서 카메라 접근을 켜거나, 대신 페어링 코드를 붙여넣으세요.'}
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={canAskAgain ? requestPermission : () => void Linking.openSettings()}
          >
            {canAskAgain && <QrCode size={16} color={colors.bgBase} />}
            <Text style={styles.primaryButtonText}>
              {canAskAgain ? '계속' : '설정 열기'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pasteButton, pressed && styles.pasteButtonPressed]}
            onPress={() => setPasteVisible(true)}
          >
            <ClipboardIcon size={16} color={colors.textSecondary} />
            <Text style={styles.pasteButtonText}>대신 코드 붙여넣기</Text>
          </Pressable>
        </View>
        <TextInputModal
          visible={pasteVisible}
          title="페어링 코드 붙여넣기"
          message="컴퓨터의 QR 아래에 표시된 코드를 복사하세요."
          placeholder="orca://pair?code=... 또는 코드를 붙여넣기"
          onSubmit={handlePasteSubmit}
          onCancel={() => setPasteVisible(false)}
        />
      </View>
    )
  }

  return (
    <View ref={setPairScanRootRef} style={[styles.container, containerPadding]}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={22} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.steps}>
        <Step number={1} text="컴퓨터에서 Orca를 여세요" />
        <Step number={2} text="설정 → 모바일로 이동하세요" />
        <Step number={3} text="QR 코드를 스캔하세요" />
      </View>

      {status === 'scanning' && (
        <>
          {/* Why: unmount the camera while the paste sheet is open. The
              user has clearly chosen the paste path; keeping the camera
              streaming behind a sheet wastes power and looks weird if
              they cancel the sheet and the QR was scanned silently in
              the meantime. */}
          {!pasteVisible && (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarCodeScanned}
              />
              <View style={styles.reticle} pointerEvents="none">
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </View>
          )}
          {pasteVisible && <View style={styles.cameraPlaceholder} />}
          <Pressable
            style={({ pressed }) => [styles.pasteButton, pressed && styles.pasteButtonPressed]}
            onPress={() => setPasteVisible(true)}
          >
            <ClipboardIcon size={16} color={colors.textSecondary} />
            <Text style={styles.pasteButtonText}>또는 페어링 코드 붙여넣기</Text>
          </Pressable>
        </>
      )}

      {status === 'connecting' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
          <Text style={styles.connectingText}>연결 중…</Text>
          <View style={styles.logSlot}>
            <ConnectionLog entries={logs} title="페어링 로그" />
          </View>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {logs.length > 0 && (
            <View style={styles.logSlot}>
              <ConnectionLog entries={logs} title="페어링 로그" />
            </View>
          )}
          <View style={styles.errorActions}>
            <Pressable style={styles.primaryButton} onPress={retry}>
              <Text style={styles.primaryButtonText}>다시 시도</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pasteButtonPressed
              ]}
              onPress={() => {
                retry()
                setPasteVisible(true)
              }}
            >
              <Text style={styles.secondaryButtonText}>대신 코드 붙여넣기</Text>
            </Pressable>
          </View>
        </View>
      )}

      <TextInputModal
        visible={pasteVisible}
        title="페어링 코드 붙여넣기"
        message="컴퓨터의 QR 아래에 표시된 코드를 복사하세요."
        placeholder="orca://pair?code=... 또는 코드를 붙여넣기"
        onSubmit={handlePasteSubmit}
        onCancel={() => setPasteVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    padding: spacing.lg
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  steps: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginLeft: 7
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  stepText: {
    fontSize: typography.bodySize,
    color: colors.textSecondary
  },
  cameraWrap: {
    flex: 1,
    borderRadius: radii.camera,
    overflow: 'hidden'
  },
  // Why: holds the layout slot while the camera is unmounted during
  // paste, so the bottom action button doesn't snap up to fill the
  // empty space.
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.camera
  },
  camera: {
    ...StyleSheet.absoluteFillObject
  },
  reticle: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: 'rgba(255,255,255,0.7)'
  },
  cornerTL: {
    top: '30%',
    left: '20%',
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 6
  },
  cornerTR: {
    top: '30%',
    right: '20%',
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 6
  },
  cornerBL: {
    bottom: '30%',
    left: '20%',
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 6
  },
  cornerBR: {
    bottom: '30%',
    right: '20%',
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 6
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: typography.titleSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  subtitle: {
    maxWidth: 310,
    fontSize: typography.bodySize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20
  },
  connectingText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    marginTop: spacing.lg
  },
  logSlot: {
    width: '100%',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm
  },
  errorText: {
    color: colors.statusRed,
    fontSize: typography.bodySize,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.button
  },
  primaryButtonText: {
    color: colors.bgBase,
    fontSize: typography.bodySize,
    fontWeight: '600'
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button
  },
  pasteButtonPressed: {
    opacity: 0.6
  },
  pasteButtonText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    fontWeight: '500'
  },
  errorActions: {
    alignItems: 'center',
    gap: spacing.sm
  },
  secondaryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.button
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    fontWeight: '500'
  }
})
