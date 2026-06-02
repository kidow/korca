import { useCallback, useEffect, useRef, useState } from 'react'
import type { GlobalSettings } from '../../../../shared/types'
import { getDefaultVoiceSettings } from '../../../../shared/constants'
import type { SpeechModelManifest, SpeechModelState } from '../../../../shared/speech-types'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Download, Trash2, Loader2, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { useShortcutLabel } from '@/hooks/useShortcutLabel'

type VoicePaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function VoicePane({ settings, updateSettings }: VoicePaneProps): React.JSX.Element {
  // Why: voice was made optional on GlobalSettings to keep older test fixtures
  // and pre-voice profiles type-compatible. Persistence merges defaults at
  // load time, so this fallback only matters during a brief render window
  // before fetchSettings completes (or in test contexts).
  const voiceSettings = settings.voice ?? getDefaultVoiceSettings()
  const modelStates = useAppStore((s) => s.modelStates)
  const refreshModelStates = useAppStore((s) => s.refreshModelStates)
  const shortcutLabel = useShortcutLabel('voice.dictation')
  const [catalog, setCatalog] = useState<SpeechModelManifest[]>([])
  const [permissionPending, setPermissionPending] = useState(false)
  const mountedRef = useRef(true)

  const handlePaneRef = useCallback((node: HTMLDivElement | null): void => {
    // Why: the microphone permission prompt can resolve after Settings closes;
    // the pane ref gives that completion a stale-write guard without an Effect.
    mountedRef.current = node !== null
  }, [])

  useEffect(() => {
    let cancelled = false
    refreshModelStates()
    void window.api.speech
      .getCatalog()
      .then((nextCatalog) => {
        if (!cancelled) {
          setCatalog(nextCatalog)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refreshModelStates])

  useEffect(() => {
    const cleanup = window.api.speech.onDownloadProgress(() => {
      refreshModelStates()
    })
    return cleanup
  }, [refreshModelStates])

  const updateVoiceSettings = (updates: Partial<GlobalSettings['voice']>): void => {
    updateSettings({
      voice: {
        ...voiceSettings,
        ...updates
      }
    })
  }

  const toggleVoiceDictation = async (): Promise<void> => {
    if (voiceSettings.enabled) {
      updateVoiceSettings({ enabled: false })
      return
    }

    setPermissionPending(true)
    try {
      // Why: enabling dictation is the point where users expect the macOS
      // microphone prompt, not after their first attempted recording fails.
      const result = await window.api.developerPermissions.request({ id: 'microphone' })
      if (result.status === 'granted' || result.status === 'unsupported') {
        updateVoiceSettings({ enabled: true })
      }

      if (result.status === 'granted') {
        toast.success('마이크 권한이 허용되었습니다')
      } else if (result.openedSystemSettings) {
        toast.message(
          'macOS 개인정보 보호 및 보안을 열었습니다. 권한을 허용한 뒤 받아쓰기를 다시 활성화하세요.'
        )
      } else if (result.status !== 'unsupported') {
        toast.message('음성 받아쓰기를 켜기 전에 마이크 권한이 필요합니다.')
      }
    } catch {
      toast.error('마이크 권한을 요청하지 못했습니다. 음성 받아쓰기를 켜지 않았습니다.')
    } finally {
      if (mountedRef.current) {
        setPermissionPending(false)
      }
    }
  }

  const getModelState = (id: string): SpeechModelState | undefined =>
    modelStates.find((s) => s.id === id)

  const selectedModel = catalog.find((m) => m.id === voiceSettings.sttModel)
  const selectedModelState = voiceSettings.sttModel
    ? getModelState(voiceSettings.sttModel)
    : undefined
  const selectedIsReady = selectedModelState?.status === 'ready'

  return (
    <div ref={handlePaneRef} className="space-y-1">
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="space-y-0.5">
          <Label>음성 받아쓰기 활성화</Label>
          <p className="text-xs text-muted-foreground">
            {shortcutLabel}를 눌러 현재 포커스된 패널에 받아쓰기하세요.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={voiceSettings.enabled}
          aria-label="음성 받아쓰기 활성화"
          aria-busy={permissionPending}
          disabled={permissionPending}
          onClick={() => void toggleVoiceDictation()}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            voiceSettings.enabled ? 'bg-foreground' : 'bg-muted-foreground/30'
          } ${permissionPending ? 'cursor-wait opacity-70' : ''}`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              voiceSettings.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4 py-2">
        <div className="space-y-0.5">
          <Label>받아쓰기 모드</Label>
          <p className="text-xs text-muted-foreground">
            토글: {shortcutLabel}를 한 번 눌러 시작하고 다시 눌러 중지합니다. 홀드: {shortcutLabel}
            를 누르고 있는 동안 받아씁니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-md border border-border/60 bg-background/50 p-0.5">
          {(['toggle', 'hold'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateVoiceSettings({ dictationMode: mode })}
              disabled={!voiceSettings.enabled}
              className={`rounded-sm px-3 py-1 text-sm transition-colors ${
                voiceSettings.dictationMode === mode
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              } ${!voiceSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {mode === 'toggle' ? '토글' : '홀드'}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4 py-2">
        <div className="space-y-0.5">
          <Label>음성 모델</Label>
          <p className="text-xs text-muted-foreground">
            {selectedModel && selectedIsReady
              ? `${selectedModel.label} — ${selectedModel.description}`
              : '받아쓰기를 켜려면 모델을 선택하고 다운로드하세요.'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!voiceSettings.enabled}
              className="shrink-0 gap-1.5"
            >
              {selectedModel && selectedIsReady ? selectedModel.label : '모델 선택'}
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            {catalog.map((manifest) => {
              const mState = getModelState(manifest.id)
              const isReady = mState?.status === 'ready'
              const isDownloading =
                mState?.status === 'downloading' || mState?.status === 'extracting'
              const isActive = voiceSettings.sttModel === manifest.id
              const sizeMb = Math.round(manifest.sizeBytes / 1_000_000)

              return (
                <DropdownMenuItem
                  key={manifest.id}
                  disabled={isDownloading}
                  onSelect={() => {
                    if (isReady) {
                      updateVoiceSettings({ sttModel: manifest.id })
                    } else if (!isDownloading) {
                      void window.api.speech
                        .downloadModel(manifest.id)
                        .catch(() => toast.error('모델을 다운로드하지 못했습니다.'))
                    }
                  }}
                  className={`group flex items-center gap-2.5 py-2.5 ${
                    !isReady && !isDownloading ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {isActive && isReady ? (
                      <Check className="size-3.5" />
                    ) : isDownloading ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{manifest.label}</span>
                      <span className="text-[10px] px-1 py-px rounded-full leading-none bg-muted text-muted-foreground">
                        {manifest.streaming ? 'streaming' : 'offline'}
                      </span>
                      {manifest.recommended && (
                        <span className="text-[10px] px-1 py-px rounded-full leading-none bg-emerald-500/10 text-emerald-500">
                          recommended
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        {isDownloading && mState?.progress !== undefined
                          ? mState.status === 'extracting'
                            ? 'Extracting...'
                            : `${Math.round(mState.progress * 100)}%`
                          : `${sizeMb} MB`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {manifest.description}
                    </p>
                  </div>
                  {isReady && !isActive ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        void window.api.speech
                          .deleteModel(manifest.id)
                          .then(refreshModelStates)
                          .catch(() => toast.error('모델을 삭제하지 못했습니다.'))
                      }}
                      className="shrink-0 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all rounded"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  ) : !isReady && !isDownloading ? (
                    <span className="shrink-0 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="size-3" />
                    </span>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
