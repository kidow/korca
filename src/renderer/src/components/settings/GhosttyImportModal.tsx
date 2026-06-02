import type { GhosttyImportPreview } from '../../../../shared/types'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { SETTING_LABELS } from './setting-labels'

type GhosttyImportModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: GhosttyImportPreview | null
  loading: boolean
  onApply: () => void | Promise<void>
  applied?: boolean
  applyError?: string | null
}

function formatDiffValue(value: unknown): string {
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ')
  }
  return String(value)
}

export function GhosttyImportModal({
  open,
  onOpenChange,
  preview,
  loading,
  onApply,
  applied = false,
  applyError = null
}: GhosttyImportModalProps): React.JSX.Element {
  const hasChanges = preview?.found === true && Object.keys(preview.diff).length > 0
  const configPaths =
    preview?.configPaths ?? (preview?.configPath !== undefined ? [preview.configPath] : [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Ghostty에서 가져오기</DialogTitle>
          <DialogDescription className="text-xs">
            Ghostty 설정에서 가져올 설정을 검토합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-xs text-muted-foreground">미리보기를 불러오는 중…</p>
        ) : preview == null ? null : preview.found ? (
          <div className="space-y-3">
            {configPaths.length > 0 && !applied && (
              <p className="text-xs text-muted-foreground break-all">
                {configPaths.length === 1 ? '설정 파일' : '설정 파일들'}: {configPaths.join(', ')}
              </p>
            )}
            {applied ? (
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">가져오기 완료</p>
                <ul className="text-xs space-y-1">
                  {Object.entries(preview.diff).map(([key, value]) => (
                    <li key={key} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{SETTING_LABELS[key] ?? key}</span>
                      <span className="font-mono">{formatDiffValue(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : hasChanges ? (
              <div>
                <p className="text-xs font-medium mb-1">업데이트할 설정</p>
                <ul className="text-xs space-y-1">
                  {Object.entries(preview.diff).map(([key, value]) => (
                    <li key={key} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{SETTING_LABELS[key] ?? key}</span>
                      <span className="font-mono">{formatDiffValue(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                가져올 새 설정이 없습니다. 현재 설정과 이미 일치합니다.
              </p>
            )}

            {!applied && applyError && <p className="text-xs text-red-500">{applyError}</p>}

            {!applied && preview.unsupportedKeys.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">지원되지 않는 키</p>
                <ul className="text-xs space-y-1">
                  {preview.unsupportedKeys.map((key) => (
                    <li key={key} className="text-muted-foreground">
                      {key}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : preview.error ? (
          <p className="text-xs text-red-500">{preview.error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            이 시스템에서 Ghostty 설정을 찾지 못했습니다.
          </p>
        )}

        <DialogFooter>
          {applied ? (
            <Button onClick={() => onOpenChange(false)}>완료</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              {hasChanges && <Button onClick={() => void onApply()}>변경 사항 적용</Button>}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
