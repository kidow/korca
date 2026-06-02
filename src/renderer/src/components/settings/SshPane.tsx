import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Upload } from 'lucide-react'
import { MAX_SSH_RELAY_GRACE_PERIOD_SECONDS, type SshTarget } from '../../../../shared/ssh-types'
import { SSH_TERMINATE_RECONNECT_REQUIRED } from '../../../../shared/constants'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '../ui/button'
import { removeSshTargetWithBestEffortCleanup } from './ssh-target-remove'
import { SshTargetCard } from './SshTargetCard'
import { SshTargetDestructiveActions } from './SshTargetDestructiveActions'
import { SshTargetForm, EMPTY_FORM, type EditingTarget } from './SshTargetForm'
import {
  getEditingTargetForSshTarget,
  getSshTargetDraftConnectionFields,
  isRelayGracePeriodValid,
  parseRelayGracePeriodSeconds
} from './ssh-target-draft'
export { SSH_PANE_SEARCH_ENTRIES } from './ssh-search'

type SshPaneProps = Record<string, never>

export function SshPane(_props: SshPaneProps): React.JSX.Element {
  const [targets, setTargets] = useState<SshTarget[]>([])
  // Why: connection states are already hydrated and kept up-to-date by the
  // global store (via useIpcEvents.ts). Reading from the store avoids
  // duplicating the onStateChanged listener and per-target getState IPC calls.
  const sshConnectionStates = useAppStore((s) => s.sshConnectionStates)
  const recordFeatureInteraction = useAppStore((s) => s.recordFeatureInteraction)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditingTarget>(EMPTY_FORM)
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())
  const mountedRef = useMountedRef()

  const setSshTargetsMetadata = useAppStore((s) => s.setSshTargetsMetadata)
  const clearRemovedSshTargetState = useAppStore((s) => s.clearRemovedSshTargetState)

  const loadTargets = useCallback(
    async (opts?: { signal?: AbortSignal }) => {
      try {
        const result = (await window.api.ssh.listTargets()) as SshTarget[]
        if (opts?.signal?.aborted || !mountedRef.current) {
          return
        }
        setTargets(result)
        setSshTargetsMetadata(result)
      } catch {
        if (!opts?.signal?.aborted && mountedRef.current) {
          toast.error('SSH 대상 목록을 불러오지 못했습니다')
        }
      }
    },
    [mountedRef, setSshTargetsMetadata]
  )

  useEffect(() => {
    const abortController = new AbortController()
    void loadTargets({ signal: abortController.signal })
    return () => abortController.abort()
  }, [loadTargets])

  const handleSave = async (): Promise<void> => {
    const { host, configHost, username, port } = getSshTargetDraftConnectionFields(form)
    if (!host) {
      toast.error('호스트 또는 SSH 설정 별칭이 필요합니다')
      return
    }

    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error('포트는 1에서 65535 사이여야 합니다')
      return
    }

    const graceSeconds = parseRelayGracePeriodSeconds(form)
    if (!isRelayGracePeriodValid(form, graceSeconds)) {
      toast.error(
        `릴레이 유예 시간은 60초 이상 ${MAX_SSH_RELAY_GRACE_PERIOD_SECONDS}초 이하여야 하며, 아니면 재설정까지 유지하도록 선택하세요`
      )
      return
    }

    const target = {
      label: form.label.trim() || (username ? `${username}@${host}` : configHost),
      configHost,
      host,
      port,
      username,
      relayGracePeriodSeconds: graceSeconds,
      ...(form.identityFile.trim() ? { identityFile: form.identityFile.trim() } : {}),
      ...(form.proxyCommand.trim() ? { proxyCommand: form.proxyCommand.trim() } : {}),
      ...(form.jumpHost.trim() ? { jumpHost: form.jumpHost.trim() } : {})
    }

    try {
      await (editingId
        ? window.api.ssh.updateTarget({ id: editingId, updates: target })
        : window.api.ssh.addTarget({ target }))
      recordFeatureInteraction('ssh')
      if (!mountedRef.current) {
        return
      }
      toast.success(editingId ? '대상을 업데이트했습니다' : '대상을 추가했습니다')
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadTargets()
    } catch (err) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : '대상을 저장하지 못했습니다')
      }
    }
  }

  const terminateSessionsWithReconnect = async (targetId: string): Promise<void> => {
    try {
      await window.api.ssh.terminateSessions({ targetId })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes(SSH_TERMINATE_RECONNECT_REQUIRED)) {
        throw err
      }
      // Why: disconnect is now non-destructive, so preserved remote PTYs may
      // require a fresh relay attachment before they can be explicitly killed.
      await window.api.ssh.connect({ targetId })
      await window.api.ssh.terminateSessions({ targetId })
    }
  }

  const handleRemove = async (id: string): Promise<void> => {
    try {
      await removeSshTargetWithBestEffortCleanup(window.api.ssh, id)
      // Why: a deleted passphrase-gated target may still have deferred
      // reconnect metadata; clear it so focused SSH tabs stop retrying it.
      clearRemovedSshTargetState(id)
      if (mountedRef.current) {
        toast.success('대상을 제거했습니다')
      }
      await loadTargets()
    } catch (err) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : '대상을 제거하지 못했습니다')
      }
    }
  }

  const handleEdit = (target: SshTarget): void => {
    setEditingId(target.id)
    setForm(getEditingTargetForSshTarget(target))
    setShowForm(true)
  }

  const handleConnect = async (targetId: string): Promise<void> => {
    try {
      await window.api.ssh.connect({ targetId })
      recordFeatureInteraction('ssh')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '연결에 실패했습니다')
    }
  }

  const handleDisconnect = async (targetId: string): Promise<void> => {
    try {
      await window.api.ssh.disconnect({ targetId })
      recordFeatureInteraction('ssh')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '연결 해제에 실패했습니다')
    }
  }

  const handleTerminateSessions = async (targetId: string): Promise<void> => {
    try {
      await terminateSessionsWithReconnect(targetId)
      toast.success('원격 터미널을 종료했습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '원격 터미널을 종료하지 못했습니다')
    }
  }

  const handleResetRelay = async (targetId: string): Promise<void> => {
    try {
      await window.api.ssh.resetRelay({ targetId })
      if (mountedRef.current) {
        toast.success('원격 릴레이를 초기화했습니다')
      }
      await loadTargets()
    } catch (err) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : '원격 릴레이를 초기화하지 못했습니다')
      }
    }
  }

  const handleTest = async (targetId: string): Promise<void> => {
    setTestingIds((prev) => new Set(prev).add(targetId))
    try {
      const result = await window.api.ssh.testConnection({ targetId })
      recordFeatureInteraction('ssh')
      if (mountedRef.current) {
        if (result.success) {
          toast.success('연결에 성공했습니다')
        } else {
          toast.error(result.error ?? '연결 테스트에 실패했습니다')
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : '테스트에 실패했습니다')
      }
    } finally {
      if (mountedRef.current) {
        setTestingIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
      }
    }
  }

  const handleImport = async (): Promise<void> => {
    try {
      const imported = (await window.api.ssh.importConfig()) as SshTarget[]
      recordFeatureInteraction('ssh')
      if (mountedRef.current) {
        if (imported.length === 0) {
          toast('~/.ssh/config에서 새 호스트를 찾지 못했습니다')
        } else {
          toast.success(`호스트 ${imported.length}개를 가져왔습니다`)
        }
      }
      await loadTargets()
    } catch (err) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : '가져오기에 실패했습니다')
      }
    }
  }

  const cancelForm = (): void => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">대상</p>
          <p className="text-xs text-muted-foreground">
            원격 호스트를 추가해 Korca에서 연결하세요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => void handleImport()}
            className="gap-1.5"
          >
            <Upload className="size-3" />
            가져오기
          </Button>
          {!showForm ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_FORM)
                setShowForm(true)
              }}
              className="gap-1.5"
            >
              <Plus className="size-3" />
              대상 추가
            </Button>
          ) : null}
        </div>
      </div>

      <SshTargetDestructiveActions
        connectionStates={sshConnectionStates}
        onRemove={handleRemove}
        onResetRelay={handleResetRelay}
        onTerminateSessions={handleTerminateSessions}
      >
        {({ busyActionForTarget, requestRemove, requestResetRelay, requestTerminateSessions }) => (
          <>
            {/* Target list */}
            {targets.length === 0 && !showForm ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-5 text-sm text-muted-foreground">
                SSH 대상이 아직 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {targets.map((target) => (
                  <SshTargetCard
                    key={target.id}
                    target={target}
                    state={sshConnectionStates.get(target.id)}
                    testing={testingIds.has(target.id)}
                    busyAction={busyActionForTarget(target.id)}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onTerminateSessions={(id) =>
                      requestTerminateSessions({ id, label: target.label })
                    }
                    onResetRelay={(id) => requestResetRelay({ id, label: target.label })}
                    onTest={handleTest}
                    onEdit={handleEdit}
                    onRemove={(id) => requestRemove({ id, label: target.label })}
                  />
                ))}
              </div>
            )}

            {/* Add/Edit form */}
            {showForm ? (
              <SshTargetForm
                editingId={editingId}
                form={form}
                onFormChange={setForm}
                onSave={() => void handleSave()}
                onCancel={cancelForm}
              />
            ) : null}
          </>
        )}
      </SshTargetDestructiveActions>
    </div>
  )
}
