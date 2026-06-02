import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

type TerminalQuickCommandDialogFooterProps = {
  canSave: boolean
  submitShortcutLabel: string
  onCancel: () => void
  onSave: () => void
}

export function TerminalQuickCommandDialogFooter({
  canSave,
  submitShortcutLabel,
  onCancel,
  onSave
}: TerminalQuickCommandDialogFooterProps): React.JSX.Element {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        취소
      </Button>
      <Button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        title={`저장 (${submitShortcutLabel})`}
      >
        저장
        <span className="ml-1 text-[10px] opacity-60">{submitShortcutLabel}</span>
      </Button>
    </DialogFooter>
  )
}
