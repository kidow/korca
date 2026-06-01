import type { ReactNode } from 'react'
import { Check, Globe2, MonitorCog, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  OnboardingFeatureSetupId,
  OnboardingFeatureSetupSelection
} from './onboarding-feature-setup'

type FeatureSetupChecklistProps = {
  value: OnboardingFeatureSetupSelection
  onChange: (value: OnboardingFeatureSetupSelection) => void
}

type FeatureSetupRow = {
  id: OnboardingFeatureSetupId
  title: string
  description: string
  setupSummary: string
  icon: ReactNode
}

const FEATURE_SETUP_ROWS: readonly FeatureSetupRow[] = [
  {
    id: 'browserUse',
    title: '에이전트 브라우저 사용',
    description: '에이전트가 사이트를 탐색하고, 페이지를 살피고, 브라우저 작업을 처리할 수 있습니다.',
    setupSummary: '브라우저 사용을 켜고, orca-cli를 준비하며, 설정용 쿠키를 남깁니다.',
    icon: <Globe2 className="size-4" />
  },
  {
    id: 'computerUse',
    title: '컴퓨터 사용',
    description: '에이전트가 앱 창을 살펴보고, 요청하면 로컬 앱을 조작할 수 있습니다.',
    setupSummary: 'Orca CLI를 등록하고, 권한을 열고, 스킬을 준비합니다.',
    icon: <MonitorCog className="size-4" />
  },
  {
    id: 'orchestration',
    title: '에이전트 조정',
    description: '에이전트끼리 메시지를 주고받고, 작업을 맡고, 인수인계를 조율할 수 있습니다.',
    setupSummary: 'Orca CLI를 등록하고, 조정을 켜고, 스킬을 준비합니다.',
    icon: <Workflow className="size-4" />
  }
]

export function FeatureSetupChecklist({
  value,
  onChange
}: FeatureSetupChecklistProps): React.JSX.Element {
  return (
    <section className="mt-6">
      <div className="grid gap-3 md:grid-cols-3">
        {FEATURE_SETUP_ROWS.map((row) => {
          const selected = value[row.id]
          return (
            <button
              key={row.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              className={cn(
                'flex min-h-40 flex-col rounded-lg border px-4 py-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'border-violet-500/60 bg-violet-500/10 text-foreground ring-2 ring-violet-500/30'
                  : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
              )}
              onClick={() => onChange({ ...value, [row.id]: !selected })}
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg border',
                    selected
                      ? 'border-border bg-muted text-foreground'
                      : 'border-border bg-muted/40'
                  )}
                >
                  {row.icon}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border transition-colors',
                    selected
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-border bg-background'
                  )}
                >
                  {selected ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
              </span>
              <span className="mt-3 text-sm font-medium text-foreground">{row.title}</span>
              <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {row.description}
              </span>
              <span className="mt-auto pt-3 text-[11px] leading-relaxed text-muted-foreground">
                {row.setupSummary}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
