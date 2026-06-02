import React, { useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'

const RemoveFolderDialog = React.memo(function RemoveFolderDialog() {
  const activeModal = useAppStore((s) => s.activeModal)
  const modalData = useAppStore((s) => s.modalData)
  const closeModal = useAppStore((s) => s.closeModal)
  const removeProject = useAppStore((s) => s.removeProject)

  const isOpen = activeModal === 'confirm-remove-folder'
  const repoId = typeof modalData.repoId === 'string' ? modalData.repoId : ''
  const displayName = typeof modalData.displayName === 'string' ? modalData.displayName : ''

  const handleConfirm = useCallback(() => {
    if (repoId) {
      void removeProject(repoId)
    }
    closeModal()
  }, [closeModal, removeProject, repoId])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeModal()
      }
    },
    [closeModal]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">프로젝트 제거</DialogTitle>
          <DialogDescription className="text-xs">
            이것은 <span className="break-all font-medium text-foreground">{displayName}</span> from
            Korca. 디스크에는 그대로 남아 있습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            제거
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

export default RemoveFolderDialog
