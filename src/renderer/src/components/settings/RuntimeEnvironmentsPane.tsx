/* eslint-disable max-lines -- Why: the server settings pane keeps active
   server selection, saved server mutation, and confirmation dialogs together so
   the state transitions stay auditable. */
import { Loader2, Plus, RefreshCw, Share2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useMountedRef } from '@/hooks/useMountedRef'
import type { GlobalSettings } from '../../../../shared/types'
import type { PublicKnownRuntimeEnvironment } from '../../../../shared/runtime-environments'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { SearchableSetting } from './SearchableSetting'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { RuntimePairingUrlGenerator } from './RuntimePairingUrlGenerator'
import {
  RUNTIME_ENVIRONMENTS_SEARCH_ENTRY,
  WEB_RUNTIME_ENVIRONMENTS_SEARCH_ENTRY
} from './runtime-environments-search'

const LOCAL_RUNTIME_VALUE = '__local__'
const NO_RUNTIME_VALUE = '__none__'

type RuntimeEnvironmentsPaneProps = {
  settings: GlobalSettings
  switchRuntimeEnvironment: (environmentId: string | null) => Promise<boolean>
  canGeneratePairingUrl?: boolean
  allowLocalRuntime?: boolean
}

export function RuntimeEnvironmentsPane({
  settings,
  switchRuntimeEnvironment,
  canGeneratePairingUrl = true,
  allowLocalRuntime = true
}: RuntimeEnvironmentsPaneProps): React.JSX.Element {
  const [environments, setEnvironments] = useState<PublicKnownRuntimeEnvironment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [switchingValue, setSwitchingValue] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingSwitchValue, setPendingSwitchValue] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<PublicKnownRuntimeEnvironment | null>(null)
  const [addServerFormOpen, setAddServerFormOpen] = useState(false)
  const [shareServerFormOpen, setShareServerFormOpen] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const mountedRef = useMountedRef()
  const activeValue =
    settings.activeRuntimeEnvironmentId ??
    (allowLocalRuntime ? LOCAL_RUNTIME_VALUE : NO_RUNTIME_VALUE)
  const isBusy = isSaving || switchingValue !== null || removingId !== null
  const removingActiveServer = pendingRemove?.id === settings.activeRuntimeEnvironmentId
  const searchEntry = canGeneratePairingUrl
    ? RUNTIME_ENVIRONMENTS_SEARCH_ENTRY
    : WEB_RUNTIME_ENVIRONMENTS_SEARCH_ENTRY

  const loadEnvironments = useCallback(async (): Promise<void> => {
    if (mountedRef.current) {
      setIsLoading(true)
    }
    try {
      const nextEnvironments = await window.api.runtimeEnvironments.list()
      if (mountedRef.current) {
        setEnvironments(nextEnvironments)
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : '런타임 환경을 불러오지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [mountedRef])

  useEffect(() => {
    void loadEnvironments()
  }, [loadEnvironments])

  const closeAddServerForm = (): void => {
    if (isSaving) {
      return
    }
    setAddServerFormOpen(false)
    setName('')
    setPairingCode('')
  }

  const addEnvironment = async (): Promise<void> => {
    const trimmedName = name.trim()
    const trimmedPairingCode = pairingCode.trim()
    if (!trimmedName || !trimmedPairingCode) {
      toast.error('이름과 페어링 코드는 필수입니다.')
      return
    }
    const duplicate = environments.find(
      (environment) => environment.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate) {
      toast.error(`"${duplicate.name}"이라는 서버가 이미 있습니다.`)
      return
    }
    setIsSaving(true)
    try {
      if (!allowLocalRuntime && settings.activeRuntimeEnvironmentId) {
        const disconnected = await switchRuntimeEnvironment(null)
        if (!disconnected) {
          return
        }
      }
      const result = await window.api.runtimeEnvironments.addFromPairingCode({
        name: trimmedName,
        pairingCode: trimmedPairingCode
      })
      if (mountedRef.current) {
        setName('')
        setPairingCode('')
      }
      await loadEnvironments()
      if (!allowLocalRuntime) {
        const switched = await switchRuntimeEnvironment(result.environment.id)
        if (!switched) {
          await window.api.runtimeEnvironments.remove({ selector: result.environment.id })
          await loadEnvironments()
          return
        }
        if (mountedRef.current) {
          toast.success(`${result.environment.name}에 연결했습니다.`)
        }
      } else {
        if (mountedRef.current) {
          toast.success(
            `${result.environment.name}을 저장했습니다. 준비되면 활성 서버에서 전환하세요.`
          )
        }
      }
      if (mountedRef.current) {
        setAddServerFormOpen(false)
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(error instanceof Error ? error.message : '런타임 환경을 저장하지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false)
      }
    }
  }

  const removeEnvironment = async (
    environment: PublicKnownRuntimeEnvironment
  ): Promise<boolean> => {
    setRemovingId(environment.id)
    setRemoveError(null)
    try {
      if (settings.activeRuntimeEnvironmentId === environment.id) {
        const switched = await switchRuntimeEnvironment(null)
        if (!switched) {
          if (mountedRef.current) {
            setRemoveError(
              allowLocalRuntime
                ? '로컬 데스크톱으로 전환하지 못했습니다. 문제를 해결한 뒤 다시 시도하세요.'
                : '이 서버에서 연결을 끊지 못했습니다. 문제를 해결한 뒤 다시 시도하세요.'
            )
          }
          return false
        }
        if (!allowLocalRuntime) {
          await loadEnvironments()
          if (mountedRef.current) {
            toast.success(`${environment.name}을 제거했습니다.`)
          }
          return true
        }
      }
      await window.api.runtimeEnvironments.remove({ selector: environment.id })
      await loadEnvironments()
      if (mountedRef.current) {
        toast.success(`${environment.name}을 제거했습니다.`)
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : '런타임 환경을 제거하지 못했습니다.'
      if (mountedRef.current) {
        setRemoveError(message)
        toast.error(message)
      }
      return false
    } finally {
      if (mountedRef.current) {
        setRemovingId(null)
      }
    }
  }

  const switchToValue = async (value: string): Promise<boolean> => {
    if (value === NO_RUNTIME_VALUE) {
      return false
    }
    setSwitchingValue(value)
    setSwitchError(null)
    try {
      const switched = await switchRuntimeEnvironment(
        allowLocalRuntime && value === LOCAL_RUNTIME_VALUE ? null : value
      )
      if (switched) {
        if (mountedRef.current) {
          toast.success(`${getEnvironmentLabel(value)}로 전환했습니다.`)
        }
        return true
      }
      if (mountedRef.current) {
        setSwitchError('서버를 전환하지 못했습니다. 문제를 해결한 뒤 다시 시도하세요.')
      }
      return false
    } catch (error) {
      const message = error instanceof Error ? error.message : '서버를 전환하지 못했습니다.'
      if (mountedRef.current) {
        setSwitchError(message)
        toast.error(message)
      }
      return false
    } finally {
      if (mountedRef.current) {
        setSwitchingValue(null)
      }
    }
  }

  const getEnvironmentLabel = (value: string): string => {
    if (value === LOCAL_RUNTIME_VALUE) {
      return '로컬 데스크톱'
    }
    if (value === NO_RUNTIME_VALUE) {
      return '연결된 서버 없음'
    }
    return environments.find((environment) => environment.id === value)?.name ?? '원격 서버'
  }

  return (
    <SearchableSetting
      title={searchEntry.title}
      description={searchEntry.description}
      keywords={searchEntry.keywords}
      className="space-y-4 py-2"
    >
      <div className="space-y-2">
        <div className="space-y-1">
          <Label id="runtime-active-server-label">활성 서버</Label>
          <p className="text-xs text-muted-foreground">
            {allowLocalRuntime
              ? "Local keeps today's desktop behavior. Saved servers route supported client calls through the remote runtime."
              : 'Saved servers route this browser through a paired Korca runtime.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activeValue}
            onValueChange={(value) => {
              if (value !== activeValue) {
                setSwitchError(null)
                setPendingSwitchValue(value)
              }
            }}
            disabled={isBusy}
          >
            <SelectTrigger
              size="sm"
              className="min-w-[260px]"
              aria-labelledby="runtime-active-server-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowLocalRuntime ? (
                <SelectItem value={LOCAL_RUNTIME_VALUE}>로컬 데스크톱</SelectItem>
              ) : environments.length === 0 ? (
                <SelectItem value={NO_RUNTIME_VALUE} disabled>
                  No server connected
                </SelectItem>
              ) : null}
              {environments.map((environment) => (
                <SelectItem key={environment.id} value={environment.id}>
                  {environment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="서버 새로고침"
            title="서버 새로고침"
            onClick={() => void loadEnvironments()}
            disabled={isLoading || isBusy}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">저장된 서버</div>
          {addServerFormOpen ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAddServerFormOpen(true)}
              disabled={isBusy}
            >
              <Plus />
              서버 추가
            </Button>
          )}
        </div>

        {addServerFormOpen ? (
          <form
            className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              void addEnvironment()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
              <div className="space-y-1">
                <Label htmlFor="runtime-server-name">서버 이름</Label>
                <Input
                  id="runtime-server-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="개발 서버"
                  className="h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="runtime-server-pairing-code">페어링 코드</Label>
                <Input
                  id="runtime-server-pairing-code"
                  aria-describedby="runtime-server-pairing-code-help"
                  value={pairingCode}
                  onChange={(event) => setPairingCode(event.target.value)}
                  placeholder="korca://pair?code=..."
                  className="h-8 min-w-0 font-mono text-xs"
                />
                <p id="runtime-server-pairing-code-help" className="text-xs text-muted-foreground">
                  서버에서{' '}
                  <span className="font-mono">korca serve --pairing-address &lt;host&gt;</span> 를
                  실행한 뒤 출력된 페어링 URL을 붙여넣으세요.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeAddServerForm}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isBusy || !name.trim() || !pairingCode.trim()}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Plus />}
                서버 추가
              </Button>
            </div>
          </form>
        ) : null}

        <div className="rounded-lg border border-border/50">
          {environments.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">저장된 서버가 없습니다.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {environments.map((environment) => (
                <div
                  key={environment.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{environment.name}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {environment.endpoints[0]?.endpoint ?? '엔드포인트 없음'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setRemoveError(null)
                      setPendingRemove(environment)
                    }}
                    disabled={isBusy}
                    aria-label={`Remove ${environment.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canGeneratePairingUrl ? (
        <div className="overflow-hidden rounded-lg border border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 space-y-0.5">
              <div className="text-sm font-medium">이 Korca 서버 공유</div>
              <p className="text-xs text-muted-foreground">
                브라우저나 다른 Korca 클라이언트가 연결할 수 있도록 철회 가능한 접근 권한을
                만듭니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShareServerFormOpen((open) => !open)}
            >
              <Share2 />
              {shareServerFormOpen ? '폼 숨기기' : '새 링크'}
            </Button>
          </div>
          <div className="border-t border-border/40 px-3 py-3">
            <RuntimePairingUrlGenerator
              framed={false}
              showHeader={false}
              showGeneratorForm={shareServerFormOpen}
            />
          </div>
        </div>
      ) : null}

      <Dialog
        open={pendingSwitchValue !== null}
        onOpenChange={(open) => {
          if (!open && switchingValue === null) {
            setSwitchError(null)
            setPendingSwitchValue(null)
          }
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-sm">서버 전환</DialogTitle>
            <DialogDescription>
              Korca는 다음 서버의 프로젝트를 불러오기 전에 현재 서버의 원격 터미널과 브라우저 탭을
              닫습니다.
            </DialogDescription>
          </DialogHeader>
          {pendingSwitchValue ? (
            <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2 text-xs">
              <div className="text-muted-foreground">전환 대상</div>
              <div className="mt-0.5 truncate font-medium">
                {getEnvironmentLabel(pendingSwitchValue)}
              </div>
            </div>
          ) : null}
          {switchError ? <p className="text-sm text-destructive">{switchError}</p> : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSwitchError(null)
                setPendingSwitchValue(null)
              }}
              disabled={switchingValue !== null}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                const value = pendingSwitchValue
                if (!value) {
                  return
                }
                void switchToValue(value).then((switched) => {
                  if (switched && mountedRef.current) {
                    setPendingSwitchValue(null)
                  }
                })
              }}
              disabled={switchingValue !== null}
            >
              {switchingValue !== null ? <Loader2 className="animate-spin" /> : null}
              전환
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open && removingId === null) {
            setRemoveError(null)
            setPendingRemove(null)
          }
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-sm">서버 제거</DialogTitle>
            <DialogDescription>
              {removingActiveServer
                ? allowLocalRuntime
                  ? '활성 서버를 먼저 제거하면 Korca가 로컬 데스크톱으로 돌아가고, 해당 서버의 원격 터미널과 브라우저 탭을 닫습니다.'
                  : '활성 서버를 제거하면 이 브라우저 연결이 끊기고 해당 서버의 원격 터미널과 브라우저 탭을 닫습니다.'
                : '이 저장된 서버는 Korca에서 제거됩니다. 활성 서버는 바뀌지 않습니다.'}
            </DialogDescription>
          </DialogHeader>
          {pendingRemove ? (
            <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2 text-xs">
              <div className="truncate font-medium">{pendingRemove.name}</div>
              <div className="mt-0.5 truncate font-mono text-muted-foreground">
                {pendingRemove.endpoints[0]?.endpoint ?? '엔드포인트 없음'}
              </div>
            </div>
          ) : null}
          {removeError ? <p className="text-sm text-destructive">{removeError}</p> : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveError(null)
                setPendingRemove(null)
              }}
              disabled={removingId !== null}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const environment = pendingRemove
                if (!environment) {
                  return
                }
                void removeEnvironment(environment).then((removed) => {
                  if (removed && mountedRef.current) {
                    setPendingRemove(null)
                  }
                })
              }}
              disabled={removingId !== null}
            >
              {removingId !== null ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SearchableSetting>
  )
}
