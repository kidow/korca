/* oxlint-disable react-doctor/no-adjust-state-on-prop-change -- pre-existing pattern, predates this rule */
import { useEffect, useState } from 'react'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAppStore } from '@/store'
import {
  getRuntimeRepoBaseRefDefault,
  searchRuntimeRepoBaseRefs
} from '@/runtime/runtime-repo-client'

type BaseRefPickerProps = {
  repoId: string
  currentBaseRef?: string
  onSelect: (ref: string) => void
  onUsePrimary?: () => void
}

export function BaseRefPicker({
  repoId,
  currentBaseRef,
  onSelect,
  onUsePrimary
}: BaseRefPickerProps): React.JSX.Element {
  const activeRuntimeEnvironmentId = useAppStore(
    (state) => state.settings?.activeRuntimeEnvironmentId ?? null
  )
  // Why: null until the IPC resolves (or when the repo has no default base ref
  // available). We avoid seeding with 'origin/main' because that would display
  // a fabricated default in repos that don't actually have origin/main.
  const [defaultBaseRef, setDefaultBaseRef] = useState<string | null>(null)
  // Why: starts at 0 so the multi-remote hint stays suppressed until the IPC
  // resolves. `0` is also the failure sentinel: if the main-process remote
  // count throws, we prefer no hint over a wrong hint (fail-closed per
  // docs/upstream-base-ref-design.md §4).
  const [remoteCount, setRemoteCount] = useState<number>(0)
  const [baseRefQuery, setBaseRefQuery] = useState('')
  const [baseRefResults, setBaseRefResults] = useState<string[]>([])
  const [isSearchingBaseRefs, setIsSearchingBaseRefs] = useState(false)

  useEffect(() => {
    let stale = false

    const loadDefaultBaseRef = async (): Promise<void> => {
      try {
        const result = await getRuntimeRepoBaseRefDefault({ activeRuntimeEnvironmentId }, repoId)
        if (!stale) {
          setDefaultBaseRef(result.defaultBaseRef)
          setRemoteCount(result.remoteCount)
        }
      } catch (err) {
        console.error('[BaseRefPicker] getBaseRefDefault failed', err)
        if (!stale) {
          setDefaultBaseRef(null)
          setRemoteCount(0)
        }
      }
    }

    setBaseRefQuery('')
    setBaseRefResults([])
    // Why: reset the previous repo's default ref before the new IPC resolves so
    // we never attribute a stale "Following primary branch (<ref>)" label to
    // the newly selected repo during the brief resolution window.
    setDefaultBaseRef(null)
    setRemoteCount(0)
    void loadDefaultBaseRef()

    return () => {
      stale = true
    }
  }, [activeRuntimeEnvironmentId, repoId])

  useEffect(() => {
    const trimmedQuery = baseRefQuery.trim()
    if (trimmedQuery.length < 2) {
      setBaseRefResults([])
      setIsSearchingBaseRefs(false)
      return
    }

    let stale = false
    setIsSearchingBaseRefs(true)

    const timer = window.setTimeout(() => {
      void searchRuntimeRepoBaseRefs({ activeRuntimeEnvironmentId }, repoId, trimmedQuery, 20)
        .then((results) => {
          if (!stale) {
            setBaseRefResults(results)
          }
        })
        .catch((err) => {
          console.error('[BaseRefPicker] searchBaseRefs failed', err)
          if (!stale) {
            setBaseRefResults([])
          }
        })
        .finally(() => {
          if (!stale) {
            setIsSearchingBaseRefs(false)
          }
        })
    }, 200)

    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [activeRuntimeEnvironmentId, baseRefQuery, repoId])

  const effectiveBaseRef = currentBaseRef ?? defaultBaseRef

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-foreground">
            {effectiveBaseRef ?? '기본 기준 ref 없음'}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentBaseRef
              ? '이 저장소에 고정됨'
              : defaultBaseRef
                ? `기본 브랜치(${defaultBaseRef})를 따름`
                : '아래에서 기준 브랜치를 선택하세요'}
          </p>
          {/* Why: passive hint that fork workflows have other remotes worth
              searching (e.g. `upstream`). Host-agnostic and remote-name-agnostic
              by design — we don't hardcode `upstream` because a repo's source
              remote could be named anything (`source`, `canonical`, etc.).
              Suppressed when remoteCount <= 1 or when the IPC failed
              (remoteCount === 0), preserving today's no-hint behavior.
              See docs/upstream-base-ref-design.md §4. */}
          {remoteCount > 1 ? (
            // Why: no aria-live — this is static instructional copy that renders
            // whenever remoteCount>1, not a dynamic status update. aria-live would
            // cause screen readers to re-announce it on every mount/repo switch.
            <p className="text-xs text-muted-foreground">
              여러 원격 저장소가 감지되었습니다. 원격 이름(예: <code>upstream</code>)이나 전체
              ref(예: <code>upstream/main</code>)를 입력해 결과 범위를 좁히세요.
            </p>
          ) : null}
        </div>
        {onUsePrimary && (
          <Button variant="outline" size="sm" onClick={onUsePrimary} disabled={!currentBaseRef}>
            기본값 사용
          </Button>
        )}
      </div>

      <Input
        value={baseRefQuery}
        onChange={(e) => setBaseRefQuery(e.target.value)}
        placeholder="브랜치를 이름으로 검색..."
        className="max-w-md"
      />

      {isSearchingBaseRefs ? (
        <p className="text-xs text-muted-foreground">브랜치 검색 중...</p>
      ) : null}

      {!isSearchingBaseRefs && baseRefQuery.trim().length >= 2 ? (
        baseRefResults.length > 0 ? (
          <ScrollArea className="max-h-48 rounded-md border border-border/50">
            <div className="p-1">
              {baseRefResults.map((ref) => (
                <button
                  key={ref}
                  onClick={() => {
                    // Why: clear the query so the picker returns to its
                    // resting state after a selection. Leaving the query
                    // populated would keep the results list rendered and
                    // visually compete with the new "Pinned for this repo"
                    // label, implying the selection is still pending.
                    setBaseRefQuery('')
                    setBaseRefResults([])
                    onSelect(ref)
                  }}
                  className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
                    effectiveBaseRef === ref
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{ref}</span>
                  {effectiveBaseRef === ref ? (
                    <span className="text-[10px] uppercase tracking-[0.18em]">현재</span>
                  ) : null}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground">일치하는 브랜치를 찾지 못했습니다.</p>
        )
      ) : null}
    </div>
  )
}
