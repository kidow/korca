import { HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

export function TerminalSessionStateSaveFailureDialog({
  open,
  onDismiss,
  onOpenSpaceAnalyzer
}: {
  open: boolean
  onDismiss: () => void
  onOpenSpaceAnalyzer: () => void
}): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onDismiss()
        }
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
              <HardDrive className="size-4 text-muted-foreground" />
            </div>
            <DialogTitle className="text-base">디스크 공간을 사용할 수 없습니다</DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-5">
            Korca가 이 터미널 세션을 저장하지 못했습니다. 로컬 저장 공간이 가득 찼거나 쓰기
            불가능합니다. 정리할 작업 공간 저장소를 찾으려면 디스크 공간 분석기를 여세요.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/35 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          분석기는 여기서 바로 열립니다. 나중에 하려면 왼쪽 아래 도구 상자 메뉴에서 공간 분석기를
          선택해도 됩니다.
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            닫기
          </Button>
          <Button type="button" size="sm" autoFocus onClick={onOpenSpaceAnalyzer}>
            디스크 공간 분석기 열기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
