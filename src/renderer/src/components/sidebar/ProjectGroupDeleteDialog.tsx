import React, { useCallback, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ProjectGroupDeleteDialogProps = {
  open: boolean
  groupName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
}

export function ProjectGroupDeleteDialog({
  open,
  groupName,
  onOpenChange,
  onConfirm
}: ProjectGroupDeleteDialogProps): React.JSX.Element {
  const [deleting, setDeleting] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const mountedRef = useRef(true)

  const handleDialogContentRef = useCallback((node: HTMLDivElement | null): void => {
    // Why: deleting can resolve after the dialog closes; the content ref keeps
    // late completions from mutating stale dialog state without an Effect.
    mountedRef.current = node !== null
  }, [])

  // Why: opening the dialog must clear a stale in-flight state before the
  // destructive button renders; an Effect would leave one disabled frame.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && deleting) {
      setDeleting(false)
    }
  }

  const handleConfirm = useCallback(async () => {
    if (deleting) {
      return
    }
    setDeleting(true)
    try {
      await onConfirm()
      if (mountedRef.current) {
        setDeleting(false)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to delete project group:', error)
      if (mountedRef.current) {
        setDeleting(false)
      }
    }
  }, [deleting, onConfirm, onOpenChange])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setDeleting(false)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        ref={handleDialogContentRef}
        className="max-w-sm sm:max-w-sm"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-sm">프로젝트 그룹 삭제</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="break-all font-medium text-foreground">{groupName}</span>을(를)
            삭제하고 연결된 프로젝트를 그룹 해제합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-xs"
            disabled={deleting}
            onClick={handleConfirm}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
