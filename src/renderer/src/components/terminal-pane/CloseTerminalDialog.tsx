import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function CloseTerminalDialog({
  open,
  onCancel,
  onConfirm
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel()
        }
      }}
    >
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">터미널을 닫을까요?</DialogTitle>
          <DialogDescription className="text-xs">
            이 터미널에는 아직 실행 중인 프로세스가 있습니다. 터미널을 닫으면 프로세스가 종료됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
          <Button type="button" variant="destructive" size="sm" autoFocus onClick={onConfirm}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
