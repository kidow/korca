import React, { useCallback, useState } from 'react'
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
import type { KorcaHookScriptKind } from '@/lib/korca-hook-trust'

type ScriptKind = KorcaHookScriptKind

const SCRIPT_KIND_LABEL: Record<ScriptKind, string> = {
  setup: 'setup script',
  archive: 'archive script',
  issueCommand: 'issue command'
}

const SCRIPT_KIND_TRIGGER: Record<ScriptKind, string> = {
  setup: 'when this workspace is created',
  archive: 'when this workspace is removed',
  issueCommand: 'when this workspace launches with a linked issue'
}

const KorcaYamlTrustDialog = React.memo(function KorcaYamlTrustDialog() {
  const activeModal = useAppStore((s) => s.activeModal)
  const modalData = useAppStore((s) => s.modalData)
  const closeModal = useAppStore((s) => s.closeModal)
  const markKorcaHookScriptConfirmed = useAppStore((s) => s.markKorcaHookScriptConfirmed)
  const markKorcaHookRepoAlwaysTrusted = useAppStore((s) => s.markKorcaHookRepoAlwaysTrusted)

  const isOpen = activeModal === 'confirm-korca-yaml-hooks'
  const [alwaysTrustState, setAlwaysTrustState] = useState(() => ({
    isOpen,
    value: false
  }))

  // Why: never show a stale "always trust" choice on a new hook prompt.
  // Resetting during render avoids one paint with the old decision checked.
  if (alwaysTrustState.isOpen !== isOpen) {
    setAlwaysTrustState({ isOpen, value: false })
  }
  const alwaysTrust = alwaysTrustState.isOpen === isOpen ? alwaysTrustState.value : false
  const setAlwaysTrust = (value: boolean): void => {
    setAlwaysTrustState({ isOpen, value })
  }

  const repoId = typeof modalData.repoId === 'string' ? modalData.repoId : ''
  const repoName = typeof modalData.repoName === 'string' ? modalData.repoName : 'this repository'
  const scriptKind: ScriptKind =
    modalData.scriptKind === 'archive'
      ? 'archive'
      : modalData.scriptKind === 'issueCommand'
        ? 'issueCommand'
        : 'setup'
  const scriptContent = typeof modalData.scriptContent === 'string' ? modalData.scriptContent : ''
  const contentHash = typeof modalData.contentHash === 'string' ? modalData.contentHash : ''
  const previouslyApproved = modalData.previouslyApproved === true
  const onResolve =
    typeof modalData.onResolve === 'function'
      ? (modalData.onResolve as (decision: 'run' | 'skip') => void)
      : null

  const resolveAndClose = useCallback(
    (decision: 'run' | 'skip') => {
      if (decision === 'run' && repoId) {
        if (alwaysTrust) {
          markKorcaHookRepoAlwaysTrusted(repoId)
        } else if (contentHash) {
          markKorcaHookScriptConfirmed(repoId, scriptKind, contentHash)
        }
      }
      onResolve?.(decision)
      closeModal()
    },
    [
      alwaysTrust,
      closeModal,
      contentHash,
      markKorcaHookRepoAlwaysTrusted,
      markKorcaHookScriptConfirmed,
      onResolve,
      repoId,
      scriptKind
    ]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resolveAndClose('skip')
      }
    },
    [resolveAndClose]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {previouslyApproved
              ? `${repoName}'s ${SCRIPT_KIND_LABEL[scriptKind]} changed — run the new version?`
              : `Run ${SCRIPT_KIND_LABEL[scriptKind]} from ${repoName}?`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {previouslyApproved ? (
              <>
                <code>korca.yaml</code> changed since you last approved. Re-review before it runs{' '}
                {SCRIPT_KIND_TRIGGER[scriptKind]}.
              </>
            ) : (
              <>
                This repository&apos;s <code>korca.yaml</code> runs on your machine{' '}
                {SCRIPT_KIND_TRIGGER[scriptKind]}. Only run if you trust {repoName}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {scriptContent && (
          <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {previouslyApproved ? `New ${scriptKind} script` : `${scriptKind} script`}
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-foreground scrollbar-sleek">
              {scriptContent}
            </pre>
          </div>
        )}

        <label
          className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors ${
            alwaysTrust
              ? 'border-primary/60 bg-primary/5'
              : 'border-border/70 bg-muted/25 hover:border-border hover:bg-muted/40'
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={alwaysTrust}
            onChange={(event) => setAlwaysTrust(event.target.checked)}
          />
          <span className="text-xs font-medium text-foreground">
            Always trust <code>korca.yaml</code> in {repoName}
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => resolveAndClose('skip')}>
            Don&apos;t run
          </Button>
          <Button onClick={() => resolveAndClose('run')}>Run hooks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

export default KorcaYamlTrustDialog
