import { useCallback } from 'react'
import { AlertTriangle, HardDrive, Loader2, RefreshCw, X } from 'lucide-react'
import { useAppStore } from '../../store'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  formatBytes,
  getWorkspaceSpaceProgressLabel,
  getWorkspaceSpaceScanTimeLabel
} from './workspace-space-format'

export function WorkspaceSpaceCompactPanel({
  onOpenFullPage
}: {
  onOpenFullPage: () => void
}): React.JSX.Element {
  const analysis = useAppStore((state) => state.workspaceSpaceAnalysis)
  const progress = useAppStore((state) => state.workspaceSpaceScanProgress)
  const scanError = useAppStore((state) => state.workspaceSpaceScanError)
  const isScanning = useAppStore((state) => state.workspaceSpaceScanning)
  const refreshWorkspaceSpace = useAppStore((state) => state.refreshWorkspaceSpace)
  const cancelWorkspaceSpaceScan = useAppStore((state) => state.cancelWorkspaceSpaceScan)
  const progressLabel = getWorkspaceSpaceProgressLabel(progress)

  const scan = useCallback((): void => {
    void refreshWorkspaceSpace().catch(() => {
      /* scanError is stored by the slice */
    })
  }, [refreshWorkspaceSpace])

  const cancelScan = useCallback((): void => {
    void cancelWorkspaceSpaceScan()
  }, [cancelWorkspaceSpaceScan])

  return (
    <div className="border-t border-border/50 bg-muted/15 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <HardDrive className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
              <span className="truncate">공간</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                베타
              </Badge>
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {analysis
                ? isScanning
                  ? `${progressLabel ?? '작업 공간 크기 검색 중'} · 마지막 결과 유지`
                  : analysis.unavailableWorktreeCount > 0
                    ? `${formatBytes(analysis.reclaimableBytes)} 회수 가능 · ${analysis.unavailableWorktreeCount}개 사용 불가`
                    : `${formatBytes(analysis.reclaimableBytes)} 회수 가능 · 작업 공간 ${analysis.scannedWorktreeCount}개`
                : isScanning
                  ? (progressLabel ?? '작업 공간 크기를 검색하는 중입니다.')
                  : '작업 공간 디스크 사용량이 아직 검색되지 않았습니다.'}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            onClick={isScanning ? cancelScan : scan}
            disabled={progress?.state === 'cancelling'}
            className="w-24"
          >
            {isScanning ? (
              progress?.state === 'cancelling' ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )
            ) : (
              <RefreshCw className="size-3" />
            )}
            {isScanning
              ? progress?.state === 'cancelling'
                ? '중지 중'
                : '취소'
              : analysis
                ? '새로고침'
                : '검색'}
          </Button>
          <Button variant="ghost" size="xs" onClick={onOpenFullPage}>
            검토
          </Button>
        </div>
      </div>

      {analysis ? (
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] tabular-nums">
          <div className="rounded border border-border/60 bg-background/40 px-2 py-1">
            <div className="text-muted-foreground">검색됨</div>
            <div className="truncate font-medium text-foreground">
              {formatBytes(analysis.totalSizeBytes)}
            </div>
          </div>
          <div className="rounded border border-border/60 bg-background/40 px-2 py-1">
            <div className="text-muted-foreground">회수 가능</div>
            <div className="truncate font-medium text-foreground">
              {formatBytes(analysis.reclaimableBytes)}
            </div>
          </div>
          <div className="rounded border border-border/60 bg-background/40 px-2 py-1">
            <div className="text-muted-foreground">업데이트됨</div>
            <div className="truncate font-medium text-foreground">
              {getWorkspaceSpaceScanTimeLabel(analysis.scannedAt)}
            </div>
          </div>
        </div>
      ) : null}

      {scanError ? (
        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 truncate">{scanError}</span>
        </div>
      ) : null}
    </div>
  )
}
