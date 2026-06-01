import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

export const ONBOARDING_SKIP_CONFIRMATION_COPY = {
  title: '온보딩을 건너뛸까요?',
  description: '오래 걸리지 않습니다!',
  skipLabel: '건너뛰기',
  keepGoingLabel: '아니요, 계속 진행'
} as const

export function OnboardingSkipConfirmationDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSkip: () => void
}): React.JSX.Element {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[120] bg-black/35"
        className="z-[130] sm:max-w-[360px]"
      >
        <DialogHeader>
          <DialogTitle>{ONBOARDING_SKIP_CONFIRMATION_COPY.title}</DialogTitle>
          <DialogDescription>{ONBOARDING_SKIP_CONFIRMATION_COPY.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onSkip}>
            {ONBOARDING_SKIP_CONFIRMATION_COPY.skipLabel}
          </Button>
          <Button type="button" onClick={() => props.onOpenChange(false)}>
            {ONBOARDING_SKIP_CONFIRMATION_COPY.keepGoingLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
