import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { useAppStore } from '../store'
import { useMountedRef } from '@/hooks/useMountedRef'

/**
 * Persistent "star Korca on GitHub" notification card.
 *
 * Rendered at the bottom-right of the app (alongside UpdateCard). It is
 * intentionally non-auto-dismissing: the user must either click Star or the
 * close button. Dismissing doubles the next-trigger threshold in the main
 * process so the nag backs off exponentially.
 *
 * Visibility is driven by the main-process 'star-nag:show' IPC event — this
 * component does no threshold math or gh-CLI checks locally.
 */
export function StarNagCard(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const mountedRef = useMountedRef()
  // Why: UpdateCard lives at the same bottom-right slot. When it is visible
  // (any non-idle / non-not-available state), stack the star-nag card above
  // it instead of overlapping — we must not cover a pending update prompt
  // because that's a higher-priority action.
  const updateStatus = useAppStore((s) => s.updateStatus)
  const updateCardVisible = updateStatus.state !== 'idle' && updateStatus.state !== 'not-available'

  useEffect(() => {
    return window.api.starNag.onShow(() => {
      setError(false)
      setVisible(true)
    })
  }, [])

  const handleClose = (): void => {
    setVisible(false)
    // Why: fire-and-forget. If persisting the dismissal fails the worst case
    // is we re-fire the same threshold on next launch — not worth blocking
    // the close animation on.
    void window.api.starNag.dismiss()
  }

  useEffect(() => {
    if (!visible) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose closes
    // over stable refs; re-binding on each render is unnecessary.
  }, [visible])

  if (!visible) {
    return null
  }

  const handleStar = async (): Promise<void> => {
    if (busy) {
      return
    }
    setBusy(true)
    setError(false)
    const ok = await window.api.gh.starKorca('star_nag')
    if (mountedRef.current) {
      setBusy(false)
    }
    if (!ok) {
      if (mountedRef.current) {
        setError(true)
      }
      return
    }
    await window.api.starNag.complete()
    if (mountedRef.current) {
      setVisible(false)
    }
  }

  return (
    <div
      // Why: when UpdateCard is up, it occupies bottom-10. Raise the star-nag
      // card above it so both are visible — the update action stays on top
      // visually (it's the higher-priority one) and the star-nag sits above.
      className={`fixed right-4 z-40 w-[360px] max-w-[calc(100vw-32px)]
      max-[480px]:left-4 max-[480px]:right-4 max-[480px]:w-auto ${
        updateCardVisible ? 'bottom-[220px]' : 'bottom-10'
      }`}
    >
      <Card className="py-0 gap-0" role="complementary" aria-labelledby="star-nag-heading">
        <div className="flex flex-col gap-2.5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Star className="size-4 fill-amber-400/60 text-amber-400/80" />
              <h3 id="star-nag-heading" className="text-sm font-semibold">
                Korca가 마음에 드시나요?
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={handleClose}
              aria-label="닫기"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Korca가 시간을 아껴줬다면 GitHub 별점이 큰 도움이 됩니다. 다른 개발자가 프로젝트를 찾는
            데 도움이 되고, 팀이 개선 작업을 계속하는 데도 힘이 됩니다.
          </p>

          {error ? (
            <p className="text-xs text-destructive">
              저장소에 별점을 남기지 못했습니다. <code>gh</code> 인증이 되어 있는지 확인한 뒤 다시
              시도하세요.
            </p>
          ) : null}

          <Button
            variant="default"
            size="sm"
            onClick={() => void handleStar()}
            disabled={busy}
            className="mt-0.5 w-full gap-1.5"
          >
            <Star className="size-3.5" />
            {busy ? '별점 남기는 중…' : 'GitHub에 별점 주기'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
