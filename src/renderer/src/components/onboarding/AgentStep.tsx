import { Check, ExternalLink } from 'lucide-react'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import { cn } from '@/lib/utils'
import type { TuiAgent } from '../../../../shared/types'

type AgentStepProps = {
  selectedAgent: TuiAgent | null
  // `fromCollapsedSection` tells the controller whether the click happened
  // under the `<details>` disclosure so `onboarding_agent_picked` can carry
  // it without re-deriving from props at the emit site.
  onSelect: (agent: TuiAgent, fromCollapsedSection: boolean) => void
  detectedSet: Set<TuiAgent>
  isDetecting: boolean
}

export function AgentStep({ selectedAgent, onSelect, detectedSet, isDetecting }: AgentStepProps) {
  const detected = AGENT_CATALOG.filter((agent) => detectedSet.has(agent.id))
  const hasDetected = detected.length > 0
  const primary = hasDetected ? detected : AGENT_CATALOG.slice(0, 6)
  const selectedEntry =
    selectedAgent && !detectedSet.has(selectedAgent)
      ? AGENT_CATALOG.find((a) => a.id === selectedAgent)
      : undefined
  return (
    <div className="space-y-5">
      {!hasDetected && !isDetecting && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-200/90">
          PATH에서 감지된 에이전트가 없습니다. 나중에 하나를 설치하거나, 빈 터미널로 계속하세요.
        </div>
      )}
      {selectedEntry && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-200/90">
          <span>
            <span className="font-medium">{selectedEntry.label}</span>은 PATH에 아직 없습니다.
            Korca가 기본값으로 설정하며, 언제든 설치할 수 있습니다.
          </span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-medium text-amber-800 hover:bg-amber-400/20 dark:text-amber-100"
            onClick={() => void window.api.shell.openUrl(selectedEntry.homepageUrl)}
          >
            설치 안내
            <ExternalLink className="size-3" />
          </button>
        </div>
      )}
      <section className="space-y-3">
        <SectionHeader
          label={hasDetected ? '시스템에서 감지됨' : '인기 에이전트'}
          count={primary.length}
          showDetectedIndicator={hasDetected}
        />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {primary.map((agent) => (
            <AgentButton
              key={agent.id}
              agent={agent}
              selected={selectedAgent === agent.id}
              onClick={() => onSelect(agent.id, false)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHeader({
  label,
  count,
  showDetectedIndicator = false
}: {
  label: string
  count: number
  showDetectedIndicator?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {showDetectedIndicator && (
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
      )}
      <span>{label}</span>
      <span className="text-muted-foreground/60">·</span>
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </div>
  )
}

function AgentButton({
  agent,
  selected,
  onClick
}: {
  agent: (typeof AGENT_CATALOG)[number]
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all',
        selected
          ? 'border-violet-500/60 bg-violet-500/10 ring-2 ring-violet-500/30'
          : 'border-border bg-muted/30 hover:bg-muted/60'
      )}
      onClick={onClick}
    >
      {selected ? (
        <div className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-violet-500 text-white shadow-sm">
          <Check className="size-3" strokeWidth={3} />
        </div>
      ) : null}
      <div className="flex min-w-0 items-start gap-2.5 pr-6">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-foreground">
          <AgentIcon agent={agent.id} size={16} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{agent.label}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {agent.cmd}
          </div>
        </div>
      </div>
    </button>
  )
}
