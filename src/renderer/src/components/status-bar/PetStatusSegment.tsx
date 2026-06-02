import React from 'react'
import { Check, PackageOpen, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '../../store'
import { BUNDLED_PET, BUNDLED_PETS, findBundledPet, isBundledPetId } from '../pet/pet-models'
import { PET_SIZE_MAX, PET_SIZE_MIN } from '../../../../shared/types'

// Why: cluster pet-related controls (show/hide, character picker, custom
// upload + removal, jump-to-settings) behind a single status-bar segment. Only
// rendered when experimentalPet is on (gated by the caller). Pet
// visibility is independently tracked so users can dismiss without having to
// find the experimental flag again.
function PetStatusSegmentInner(): React.JSX.Element {
  const petVisible = useAppStore((s) => s.petVisible)
  const setPetVisible = useAppStore((s) => s.setPetVisible)
  const petId = useAppStore((s) => s.petId)
  const setPetId = useAppStore((s) => s.setPetId)
  const customPets = useAppStore((s) => s.customPets)
  const addCustomPet = useAppStore((s) => s.addCustomPet)
  const removeCustomPet = useAppStore((s) => s.removeCustomPet)
  const petSize = useAppStore((s) => s.petSize)
  const setPetSize = useAppStore((s) => s.setPetSize)
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)

  const bundled = isBundledPetId(petId)
  const activeBundled = bundled ? (findBundledPet(petId) ?? BUNDLED_PET) : null
  const activeCustom = bundled ? null : customPets.find((m) => m.id === petId)
  const activeLabel = activeBundled ? activeBundled.label : (activeCustom?.label ?? '펫')
  const label = petVisible ? activeLabel : `${activeLabel} 숨김`

  const handleImport = async (): Promise<void> => {
    console.log('[pet-overlay] upload: click')
    if (!window.api?.pet?.import) {
      console.warn('[pet-overlay] upload: window.api.pet.import missing — restart Korca')
      toast.error('사용자 펫 업로드는 전체 앱 재시작이 필요합니다.')
      return
    }
    try {
      const model = await window.api.pet.import()
      console.log('[pet-overlay] upload: result', model)
      if (!model) {
        return
      }
      addCustomPet(model)
      if (!petVisible) {
        setPetVisible(true)
      }
      setPetId(model.id)
    } catch (error) {
      console.error('[pet-overlay] upload: error', error)
      toast.error(error instanceof Error ? error.message : '파일을 가져오지 못했습니다')
    }
  }

  const handleImportPetBundle = async (): Promise<void> => {
    if (!window.api?.pet?.importPetBundle) {
      toast.error('펫 번들 가져오기는 전체 앱 재시작이 필요합니다.')
      return
    }
    try {
      const model = await window.api.pet.importPetBundle()
      if (!model) {
        return
      }
      addCustomPet(model)
      if (!petVisible) {
        setPetVisible(true)
      }
      setPetId(model.id)
    } catch (error) {
      console.error('[pet-overlay] pet bundle: error', error)
      toast.error(error instanceof Error ? error.message : '펫 번들을 가져오지 못했습니다')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center cursor-pointer pl-1 pr-[6.5rem] py-0.5"
          aria-label="펫 메뉴"
        >
          <span
            className={`rounded px-1 py-0.5 text-[11px] font-medium text-muted-foreground group-hover:bg-accent/70 group-hover:text-foreground ${petVisible ? '' : 'opacity-50'}`}
          >
            {label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className="min-w-[220px]">
        <DropdownMenuLabel>펫</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            setPetVisible(!petVisible)
          }}
        >
          {petVisible ? '펫 숨기기' : '펫 표시'}
        </DropdownMenuItem>
        {/* Why: in-menu range so users can resize the overlay without leaving
            the dropdown — pet sprites can import larger than the default 180px
            box and visually overwhelm the viewport. preventDefault on pointer
            events stops Radix from closing the menu while the user drags. */}
        <div
          className="px-2 py-1.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>크기</span>
            <span className="tabular-nums">{petSize}px</span>
          </div>
          <input
            type="range"
            min={PET_SIZE_MIN}
            max={PET_SIZE_MAX}
            step={10}
            value={petSize}
            onChange={(e) => setPetSize(Number(e.target.value))}
            className="w-full"
            aria-label="펫 크기"
          />
        </div>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>펫 선택</DropdownMenuSubTrigger>
          {/* Why: portal so the submenu escapes the parent Content's overflow
              clipping — without this, the submenu opens inside the scroll
              container and gets clipped. Matches the convention used in
              BrowserToolbarMenu/BrowserProfileRow. */}
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="min-w-[220px]">
              {BUNDLED_PETS.map((pet) => {
                const selected = pet.id === petId
                return (
                  <DropdownMenuItem
                    key={pet.id}
                    onSelect={() => {
                      if (!petVisible) {
                        setPetVisible(true)
                      }
                      setPetId(pet.id)
                    }}
                  >
                    <span className="flex w-4 items-center justify-center">
                      {selected ? <Check className="size-3.5" aria-hidden /> : null}
                    </span>
                    {pet.label}
                  </DropdownMenuItem>
                )
              })}
              {customPets.length > 0 ? <DropdownMenuSeparator /> : null}
              {customPets.map((model) => {
                const selected = model.id === petId
                return (
                  <DropdownMenuItem
                    key={model.id}
                    className="group"
                    onSelect={() => {
                      if (!petVisible) {
                        setPetVisible(true)
                      }
                      setPetId(model.id)
                    }}
                  >
                    <span className="flex w-4 items-center justify-center">
                      {selected ? <Check className="size-3.5" aria-hidden /> : null}
                    </span>
                    <span className="flex-1 truncate">{model.label}</span>
                    <button
                      type="button"
                      className="ml-2 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      aria-label={`${model.label} 제거`}
                      onClick={(event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        removeCustomPet(model.id)
                      }}
                    >
                      <Trash2 className="size-3" aria-hidden />
                    </button>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  // Why: let the menu close naturally (no preventDefault) before
                  // invoking the native file picker. Keeping the menu open when
                  // the OS dialog opens caused the dialog to appear behind the
                  // dropdown overlay on macOS.
                  void handleImport()
                }}
              >
                <Upload className="size-3.5" aria-hidden />
                직접 업로드…
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void handleImportPetBundle()
                }}
              >
                <PackageOpen className="size-3.5" aria-hidden />
                .codex-pet 번들 가져오기…
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            openSettingsTarget({
              pane: 'experimental',
              repoId: null,
              sectionId: 'experimental-pet'
            })
            openSettingsPage()
          }}
        >
          Pet settings…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const PetStatusSegment = React.memo(PetStatusSegmentInner)
