import { useState } from 'react'
import { Check, Ellipsis, Import, Monitor, Plus, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
import { BROWSER_FAMILY_LABELS } from '../../../../shared/constants'
import type { BrowserViewportPresetId } from '../../../../shared/types'
import {
  BROWSER_VIEWPORT_PRESETS,
  browserViewportPresetToOverride,
  getBrowserViewportPreset
} from '../../../../shared/browser-viewport-presets'

type BrowserToolbarMenuProps = {
  currentProfileId: string | null
  workspaceId: string
  browserPageId: string
  viewportPresetId: BrowserViewportPresetId | null
  onDestroyWebview: () => void
}

export function BrowserToolbarMenu({
  currentProfileId,
  workspaceId,
  browserPageId,
  viewportPresetId,
  onDestroyWebview
}: BrowserToolbarMenuProps): React.JSX.Element {
  const browserSessionProfiles = useAppStore((s) => s.browserSessionProfiles)
  const detectedBrowsers = useAppStore((s) => s.detectedBrowsers)
  const switchBrowserTabProfile = useAppStore((s) => s.switchBrowserTabProfile)
  const createBrowserSessionProfile = useAppStore((s) => s.createBrowserSessionProfile)
  const importCookiesFromBrowser = useAppStore((s) => s.importCookiesFromBrowser)
  const importCookiesToProfile = useAppStore((s) => s.importCookiesToProfile)
  const fetchDetectedBrowsers = useAppStore((s) => s.fetchDetectedBrowsers)
  const browserSessionImportState = useAppStore((s) => s.browserSessionImportState)
  const setBrowserPageViewportPreset = useAppStore((s) => s.setBrowserPageViewportPreset)

  const applyViewportPreset = (nextId: BrowserViewportPresetId | null): void => {
    setBrowserPageViewportPreset(browserPageId, nextId)
    const preset = getBrowserViewportPreset(nextId)
    const override = preset ? browserViewportPresetToOverride(preset) : null
    void window.api.browser.setViewportOverride({ browserPageId, override })
  }

  const [newProfileDialogOpen, setNewProfileDialogOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [pendingSwitchProfileId, setPendingSwitchProfileId] = useState<string | null | undefined>(
    undefined
  )
  const mountedRef = useMountedRef()

  const effectiveProfileId = currentProfileId ?? 'default'

  const defaultProfile = browserSessionProfiles.find((p) => p.id === 'default')
  // Why: Default profile always appears first in the list and cannot be deleted.
  // Non-default profiles follow in their natural order.
  const allProfiles = defaultProfile
    ? [defaultProfile, ...browserSessionProfiles.filter((p) => p.id !== 'default')]
    : browserSessionProfiles

  const handleSwitchProfile = (profileId: string | null): void => {
    const targetId = profileId ?? 'default'
    if (targetId === effectiveProfileId) {
      return
    }
    setPendingSwitchProfileId(profileId)
  }

  const confirmSwitchProfile = (): void => {
    if (pendingSwitchProfileId === undefined) {
      return
    }
    const targetId = pendingSwitchProfileId ?? 'default'
    // Why: Must destroy before store update. The webviewRegistry is keyed by
    // workspace ID (stable across switches). Without explicit destroy, the mount
    // effect would reclaim the old webview with the stale partition.
    onDestroyWebview()
    switchBrowserTabProfile(workspaceId, pendingSwitchProfileId)
    const profile = browserSessionProfiles.find((p) => p.id === targetId)
    toast.success(`${profile?.label ?? '기본'} 프로필로 전환했습니다`)
    setPendingSwitchProfileId(undefined)
  }

  const handleCreateProfile = async (): Promise<void> => {
    const trimmed = newProfileName.trim()
    if (!trimmed) {
      return
    }

    setIsCreatingProfile(true)
    try {
      const profile = await createBrowserSessionProfile('isolated', trimmed)
      if (!profile) {
        if (mountedRef.current) {
          toast.error('프로필을 만들지 못했습니다.')
        }
        return
      }

      if (!mountedRef.current) {
        return
      }

      setNewProfileDialogOpen(false)
      setNewProfileName('')

      onDestroyWebview()
      switchBrowserTabProfile(workspaceId, profile.id)
      toast.success(`${profile.label} 프로필을 만들고 전환했습니다`)
    } finally {
      if (mountedRef.current) {
        setIsCreatingProfile(false)
      }
    }
  }

  const handleImportFromBrowser = async (
    browserFamily: string,
    browserProfile?: string
  ): Promise<void> => {
    const result = await importCookiesFromBrowser(effectiveProfileId, browserFamily, browserProfile)
    if (result.ok) {
      const browser = detectedBrowsers.find((b) => b.family === browserFamily)
      toast.success(
        `${browser?.label ?? browserFamily}${browserProfile ? ` (${browserProfile})` : ''}에서 ${result.summary.importedCookies}개의 쿠키를 가져왔습니다.`
      )
    } else {
      toast.error(result.reason)
    }
  }

  const handleImportFromFile = async (): Promise<void> => {
    const result = await importCookiesToProfile(effectiveProfileId)
    if (result.ok) {
      toast.success(`파일에서 ${result.summary.importedCookies}개의 쿠키를 가져왔습니다.`)
    } else if (result.reason !== 'canceled') {
      toast.error(result.reason)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="브라우저 메뉴">
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {allProfiles.map((profile) => {
            const isActive = profile.id === effectiveProfileId
            return (
              <DropdownMenuItem
                key={profile.id}
                onSelect={() => handleSwitchProfile(profile.id === 'default' ? null : profile.id)}
              >
                <Check
                  className={`mr-2 size-3.5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                />
                <span className="truncate">{profile.label}</span>
                {profile.source?.browserFamily && (
                  <span className="ml-auto pl-2 text-[10px] text-muted-foreground">
                    {BROWSER_FAMILY_LABELS[profile.source.browserFamily] ??
                      profile.source.browserFamily}
                  </span>
                )}
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setNewProfileDialogOpen(true)}>
            <Plus className="mr-2 size-3.5" />
            새 프로필…
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub
            onOpenChange={(open) => {
              if (open) {
                // Why: macOS treats other browsers' profile folders as app
                // data. Only probe them when the user opens the import menu.
                void fetchDetectedBrowsers()
              }
            }}
          >
            <DropdownMenuSubTrigger disabled={browserSessionImportState?.status === 'importing'}>
              <Import className="mr-2 size-3.5" />
              쿠키 가져오기
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {detectedBrowsers.map((browser) =>
                  browser.profiles.length > 1 ? (
                    <DropdownMenuSub key={browser.family}>
                      <DropdownMenuSubTrigger>{browser.label}에서</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {browser.profiles.map((profile) => (
                            <DropdownMenuItem
                              key={profile.directory}
                              onSelect={() =>
                                void handleImportFromBrowser(browser.family, profile.directory)
                              }
                            >
                              {profile.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ) : (
                    <DropdownMenuItem
                      key={browser.family}
                      onSelect={() => void handleImportFromBrowser(browser.family)}
                    >
                      {browser.label}에서
                    </DropdownMenuItem>
                  )
                )}
                {detectedBrowsers.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onSelect={() => void handleImportFromFile()}>
                  파일에서…
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Monitor className="mr-2 size-3.5" />
              뷰포트 크기
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {/* Why: Viewport is a "pick one of N" control, so use a radio group
                    for proper a11y semantics (role="menuitemradio", aria-checked).
                    The "Default" option represents a null preset (no override),
                    encoded as the sentinel string 'default' because
                    DropdownMenuRadioGroup values must be strings. */}
                <DropdownMenuRadioGroup
                  value={viewportPresetId ?? 'default'}
                  onValueChange={(v) =>
                    applyViewportPreset(v === 'default' ? null : (v as BrowserViewportPresetId))
                  }
                >
                  <DropdownMenuRadioItem value="default">기본값</DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  {BROWSER_VIEWPORT_PRESETS.map((preset) => (
                    <DropdownMenuRadioItem key={preset.id} value={preset.id}>
                      <span className="truncate">{preset.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              useAppStore.getState().openSettingsTarget({ pane: 'browser', repoId: null })
              useAppStore.getState().openSettingsPage()
            }}
          >
            <Settings className="mr-2 size-3.5" />
            브라우저 설정…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={pendingSwitchProfileId !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSwitchProfileId(undefined)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-base">프로필 전환</DialogTitle>
            <DialogDescription className="text-xs">
              프로필을 전환하면 이 페이지가 다시 로드됩니다. 저장되지 않은 폼 데이터는 사라집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingSwitchProfileId(undefined)}
            >
              취소
            </Button>
            <Button size="sm" onClick={confirmSwitchProfile}>
              전환
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newProfileDialogOpen} onOpenChange={setNewProfileDialogOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-base">새 브라우저 프로필</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreateProfile()
            }}
          >
            <Input
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="프로필 이름"
              autoFocus
              maxLength={50}
              className="mb-4"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewProfileDialogOpen(false)
                  setNewProfileName('')
                }}
              >
                취소
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newProfileName.trim() || isCreatingProfile}
              >
                {isCreatingProfile ? '생성 중…' : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
