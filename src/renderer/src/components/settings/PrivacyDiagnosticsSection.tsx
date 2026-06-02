import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Folder, Globe, Trash2 } from 'lucide-react'
import type {
  DiagnosticsBundlePayload,
  DiagnosticsStatusPayload
} from '../../../../preload/api-types'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import {
  getDiagnosticBundleDescription,
  PrivacyDiagnosticBundleControls
} from './PrivacyDiagnosticBundleControls'

export function PrivacyDiagnosticsSection(): React.JSX.Element {
  const [status, setStatus] = useState<DiagnosticsStatusPayload | null>(null)
  const [bundle, setBundle] = useState<DiagnosticsBundlePayload | null>(null)
  const [previewOpened, setPreviewOpened] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [collecting, setCollecting] = useState(false)
  const [openingPreview, setOpeningPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [copyingTicket, setCopyingTicket] = useState(false)
  const [deletingTicket, setDeletingTicket] = useState(false)
  const mountedRef = useRef(true)
  const activeBundleSubmissionIdRef = useRef<string | null>(null)

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const next = await window.api.diagnostics.getStatus()
      if (mountedRef.current) {
        setStatus(next)
      }
    } catch {
      /* swallow — pane shows N/A while the IPC is unavailable */
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (activeBundleSubmissionIdRef.current) {
        void window.api.diagnostics.discardBundlePreview(activeBundleSubmissionIdRef.current)
      }
    }
  }, [])

  const handleOpenFolder = useCallback(async (): Promise<void> => {
    try {
      await window.api.diagnostics.openTraceFolder()
    } catch {
      toast.error('추적 폴더를 열지 못했습니다')
    }
  }, [])

  const handleClear = useCallback(async (): Promise<void> => {
    try {
      await window.api.diagnostics.clearTraces()
      if (!mountedRef.current) {
        return
      }
      activeBundleSubmissionIdRef.current = null
      setBundle(null)
      setPreviewOpened(false)
      setTicketId(null)
      await refreshStatus()
      toast.success('로컬 추적 파일을 지웠습니다')
    } catch {
      if (mountedRef.current) {
        toast.error('추적 파일을 지우지 못했습니다')
      }
    }
  }, [refreshStatus])

  const handleCollectBundle = useCallback(async (): Promise<void> => {
    setCollecting(true)
    try {
      const nextBundle = await window.api.diagnostics.collectBundle()
      if (!mountedRef.current) {
        await window.api.diagnostics.discardBundlePreview(nextBundle.bundleSubmissionId)
        return
      }
      // Why: unmount cleanup may run before a passive ref mirror would fire;
      // keep the retained preview id in sync at the creation/clear sites.
      activeBundleSubmissionIdRef.current = nextBundle.bundleSubmissionId
      setBundle(nextBundle)
      setPreviewOpened(false)
      setTicketId(null)
      toast.success('진단 번들 미리보기를 만들었습니다')
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getDiagnosticsErrorMessage(error, '진단 번들을 만들지 못했습니다'))
      }
    } finally {
      if (mountedRef.current) {
        setCollecting(false)
      }
    }
  }, [])

  const handleOpenPreview = useCallback(async (): Promise<void> => {
    if (!bundle) {
      return
    }
    setOpeningPreview(true)
    try {
      await window.api.diagnostics.openBundlePreview(bundle.bundleSubmissionId)
      if (!mountedRef.current) {
        return
      }
      setPreviewOpened(true)
      toast.success('진단 번들 미리보기를 열었습니다')
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getDiagnosticsErrorMessage(error, '진단 번들 미리보기를 열지 못했습니다'))
      }
    } finally {
      if (mountedRef.current) {
        setOpeningPreview(false)
      }
    }
  }, [bundle])

  const handleUploadBundle = useCallback(async (): Promise<void> => {
    if (!bundle) {
      return
    }
    setUploading(true)
    try {
      const upload = await window.api.diagnostics.uploadBundle(bundle.bundleSubmissionId)
      if (!mountedRef.current) {
        return
      }
      activeBundleSubmissionIdRef.current = null
      setBundle(null)
      setPreviewOpened(false)
      setTicketId(upload.ticketId)
      toast.success('진단 번들을 업로드했습니다')
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getDiagnosticsErrorMessage(error, '진단 번들을 업로드하지 못했습니다'))
      }
    } finally {
      if (mountedRef.current) {
        setUploading(false)
      }
    }
  }, [bundle])

  const handleDiscardBundle = useCallback(async (): Promise<void> => {
    if (!bundle) {
      return
    }
    setDiscarding(true)
    try {
      await window.api.diagnostics.discardBundlePreview(bundle.bundleSubmissionId)
      if (!mountedRef.current) {
        return
      }
      activeBundleSubmissionIdRef.current = null
      setBundle(null)
      setPreviewOpened(false)
      toast.success('진단 번들 미리보기를 버렸습니다')
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getDiagnosticsErrorMessage(error, '진단 번들 미리보기를 버리지 못했습니다'))
      }
    } finally {
      if (mountedRef.current) {
        setDiscarding(false)
      }
    }
  }, [bundle])

  const handleCopyTicket = useCallback(async (): Promise<void> => {
    if (!ticketId) {
      return
    }
    setCopyingTicket(true)
    try {
      await window.api.ui.writeClipboardText(ticketId)
      if (!mountedRef.current) {
        return
      }
      toast.success('진단 티켓을 복사했습니다')
    } catch {
      if (mountedRef.current) {
        toast.error('진단 티켓을 복사하지 못했습니다')
      }
    } finally {
      if (mountedRef.current) {
        setCopyingTicket(false)
      }
    }
  }, [ticketId])

  const handleDeleteUploadedBundle = useCallback(async (): Promise<void> => {
    if (!ticketId) {
      return
    }
    setDeletingTicket(true)
    try {
      await window.api.diagnostics.deleteBundle(ticketId)
      if (!mountedRef.current) {
        return
      }
      setTicketId(null)
      toast.success('업로드한 진단 번들을 삭제했습니다')
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getDiagnosticsErrorMessage(error, '진단 번들을 삭제하지 못했습니다'))
      }
    } finally {
      if (mountedRef.current) {
        setDeletingTicket(false)
      }
    }
  }, [ticketId])

  return (
    <>
      {status?.disabledReason ? (
        <DiagnosticsDisabledStateNote reason={status.disabledReason} />
      ) : null}
      <Separator />
      <Section
        icon={<FileText className="size-4" />}
        title="진단 번들"
        description={getDiagnosticBundleDescription({ bundle, previewOpened, ticketId })}
      >
        <PrivacyDiagnosticBundleControls
          status={status}
          bundle={bundle}
          previewOpened={previewOpened}
          ticketId={ticketId}
          collecting={collecting}
          openingPreview={openingPreview}
          uploading={uploading}
          discarding={discarding}
          copyingTicket={copyingTicket}
          deletingTicket={deletingTicket}
          onCollect={handleCollectBundle}
          onOpenPreview={handleOpenPreview}
          onUpload={handleUploadBundle}
          onDiscard={handleDiscardBundle}
          onCopyTicket={handleCopyTicket}
          onDeleteUploadedBundle={handleDeleteUploadedBundle}
          onDismissTicket={() => setTicketId(null)}
        />
      </Section>
      <Separator />
      <Section
        icon={<Folder className="size-4" />}
        title="추적 폴더 열기"
        description={`파일 관리자에서 ${status?.traceFilePath || '추적 폴더'}를 엽니다.`}
      >
        <Button variant="outline" size="sm" onClick={() => void handleOpenFolder()}>
          추적 폴더 열기
        </Button>
      </Section>
      <Separator />
      <Section
        icon={<Trash2 className="size-4" />}
        title="로컬 추적 지우기"
        description="이 기기에 있는 모든 회전 추적 파일을 삭제합니다."
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!status?.localFileEnabled}
          onClick={() => void handleClear()}
        >
          로컬 추적 지우기
        </Button>
      </Section>
      <Separator />
      <Section
        icon={<Globe className="size-4" />}
        title="OTLP 내보내기"
        description={
          status?.otlpStatus ??
          'KORCA_OTLP_TRACES_URL을 설정해 Korca를 직접 운영하는 OpenTelemetry 수집기로 연결하세요.'
        }
      >
        <span
          className={
            status?.otlpEnabled
              ? 'text-xs font-medium text-foreground'
              : 'text-xs text-muted-foreground'
          }
        >
          {status?.otlpEnabled ? '활성화됨' : '비활성화됨'}
        </span>
      </Section>
    </>
  )
}

function getDiagnosticsErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function DiagnosticsDisabledStateNote({
  reason
}: {
  reason: NonNullable<DiagnosticsStatusPayload['disabledReason']>
}): React.JSX.Element {
  const message =
    reason === 'do_not_track'
      ? 'DO_NOT_TRACK=1이 설정되어 네트워크 기반 진단이 꺼져 있습니다. 로컬 추적 파일은 계속 활성화됩니다.'
      : reason === 'korca_telemetry_disabled'
        ? 'KORCA_TELEMETRY_DISABLED=1이 설정되어 네트워크 기반 진단이 꺼져 있습니다. 로컬 추적 파일은 계속 활성화됩니다.'
        : reason === 'korca_diagnostics_disabled'
          ? 'KORCA_DIAGNOSTICS_DISABLED=1이 설정되어 로컬 추적 기록을 포함한 모든 진단 기능이 꺼져 있습니다.'
          : reason === 'ci'
            ? 'CI에서 실행 중이므로 진단이 꺼져 있습니다.'
            : '환경 변수로 인해 진단이 비활성화되어 있습니다.'

  return (
    <div className="rounded border border-dashed border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
      {message}
    </div>
  )
}

function Section({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0 space-y-0.5">
          <Label className="text-sm">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  )
}
