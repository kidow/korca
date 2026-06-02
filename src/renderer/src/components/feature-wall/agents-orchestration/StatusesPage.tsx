/* oxlint-disable react-doctor/no-adjust-state-on-prop-change -- pre-existing pattern, predates this rule */
import { useEffect, useRef, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { Wrench } from 'lucide-react'
import { AgentStateDot } from '@/components/AgentStateDot'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import { ClaudeIcon, OpenAIIcon } from '../../status-bar/icons'
import { cn } from '@/lib/utils'

type ClaudeActivity = { kind: 'tool'; tool: string; arg: string } | { kind: 'msg'; text: ReactNode }

const CLAUDE_ACTIVITIES: readonly ClaudeActivity[] = [
  { kind: 'tool', tool: '편집', arg: 'auth/withSession.ts' },
  { kind: 'msg', text: '지금 세션 미들웨어를 보고 있습니다…' },
  { kind: 'tool', tool: 'Bash', arg: 'pnpm run typecheck:node' },
  { kind: 'msg', text: '타입 검사는 통과했습니다. 다음은 로그인 라우트입니다.' },
  { kind: 'tool', tool: '읽기', arg: 'routes/login.ts' },
  { kind: 'tool', tool: '편집', arg: 'middleware/session.ts' },
  { kind: 'msg', text: '리다이렉트 경로에 대한 테스트를 추가하는 중입니다.' },
  { kind: 'tool', tool: 'Bash', arg: 'pnpm test auth' },
  { kind: 'tool', tool: '편집', arg: 'auth.test.ts' }
]

export function StatusesPage(props: { active: boolean; reducedMotion: boolean }): JSX.Element {
  const { active, reducedMotion } = props
  const [revealed, setRevealed] = useState({ claude: false, opencode: false, codex: false })
  const [claudeIdx, setClaudeIdx] = useState(0)
  const [claudeFading, setClaudeFading] = useState(false)

  useEffect(() => {
    if (!active) {
      setRevealed({ claude: false, opencode: false, codex: false })
      setClaudeIdx(0)
      setClaudeFading(false)
      return
    }
    if (reducedMotion) {
      setRevealed({ claude: true, opencode: true, codex: true })
      return
    }
    const timeouts: number[] = []
    const schedule = (fn: () => void, delay: number): void => {
      timeouts.push(window.setTimeout(fn, delay))
    }
    schedule(() => setRevealed((r) => ({ ...r, claude: true })), 700)
    schedule(() => setRevealed((r) => ({ ...r, opencode: true })), 1200)
    schedule(() => setRevealed((r) => ({ ...r, codex: true })), 1900)

    let idx = 0
    const cycleId = window.setInterval(() => {
      setClaudeFading(true)
      const swap = window.setTimeout(() => {
        idx = (idx + 1) % CLAUDE_ACTIVITIES.length
        setClaudeIdx(idx)
        setClaudeFading(false)
      }, 280)
      timeouts.push(swap)
    }, 2400)
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id))
      window.clearInterval(cycleId)
    }
  }, [active, reducedMotion])

  return (
    <div className="flex h-full flex-col gap-5">
      <SupportedAgentsMarquee reducedMotion={reducedMotion} />
      <div className="rounded-[10px] bg-foreground/[0.05] px-2 py-2.5 shadow-[inset_0_0_0_1px_rgba(24,24,27,0.06)]">
        <div className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-3 px-1.5">
          <span className="inline-block size-[9px] rounded-full bg-emerald-500" />
          <div className="truncate text-[15.5px] font-semibold leading-[1.2]">인증 흐름 재설계</div>
        </div>
        <div className="flex flex-col gap-3 pl-[30px] pr-2 pt-2.5 pb-1">
          <AgentRow
            icon={<OpenAIIcon size={18} />}
            name="Codex"
            state={revealed.codex ? 'permission' : 'working'}
            permission={revealed.codex}
          >
            {revealed.codex ? (
              <span>
                <CodeChip>pnpm migrate latest</CodeChip> 실행을 원함
              </span>
            ) : (
              <Skel widthPct={64} />
            )}
          </AgentRow>
          <AgentRow icon={<ClaudeIcon size={18} />} name="Claude" state="working">
            {revealed.claude ? (
              <span
                className={cn(
                  'block transition-opacity duration-[280ms]',
                  claudeFading ? 'opacity-0' : 'opacity-100'
                )}
              >
                <ClaudeActivityLine activity={CLAUDE_ACTIVITIES[claudeIdx]} />
              </span>
            ) : (
              <Skel widthPct={78} />
            )}
          </AgentRow>
          <AgentRow icon={<AgentIcon agent="opencode" size={18} />} name="OpenCode" state="done">
            {revealed.opencode ? (
              <span>
                <CodeChip>src/auth/session.test.ts</CodeChip> 업데이트됨
              </span>
            ) : (
              <Skel widthPct={56} />
            )}
          </AgentRow>
        </div>
      </div>
    </div>
  )
}

function AgentRow(props: {
  icon: JSX.Element
  name: string
  state: 'working' | 'done' | 'permission'
  permission?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <div
      className="grid grid-cols-[18px_20px_minmax(0,1fr)] items-center gap-3"
      aria-label={props.name}
    >
      <span className="inline-flex size-[18px] items-center justify-center">
        <AgentStateDot state={props.state} size="md" />
      </span>
      <span className="inline-flex size-5 items-center justify-center">{props.icon}</span>
      <span
        className={cn(
          'truncate text-[13px] leading-[1.3]',
          props.permission ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'
        )}
      >
        {props.children}
      </span>
    </div>
  )
}

function ClaudeActivityLine(props: { activity: ClaudeActivity }): JSX.Element {
  const a = props.activity
  if (a.kind === 'msg') {
    return <span>{a.text}</span>
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate">
      <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
        <Wrench className="size-2.5" aria-hidden />
        {a.tool}
      </span>
      <CodeChip>{a.arg}</CodeChip>
    </span>
  )
}

function CodeChip(props: { children: ReactNode }): JSX.Element {
  return (
    <code className="rounded-[3px] bg-foreground/[0.06] px-1 py-px font-mono text-[12px] text-foreground">
      {props.children}
    </code>
  )
}

function Skel(props: { widthPct: number }): JSX.Element {
  return (
    <span
      className="inline-block h-2 rounded-[5px] bg-foreground/[0.16] align-[-1px]"
      style={{ width: `${props.widthPct}%` }}
    />
  )
}

// Long horizontal scroller of supported agent pills. Track is duplicated so a
// -50% translate loop reads as seamless infinite scroll.
function SupportedAgentsMarquee(props: { reducedMotion: boolean }): JSX.Element {
  const trackRef = useRef<HTMLDivElement | null>(null)
  return (
    <div className="relative -mx-1 mb-1 border-b border-border pb-2 pt-1 overflow-hidden">
      <div
        className="overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)'
        }}
      >
        <div
          ref={trackRef}
          className={cn(
            'inline-flex gap-2 whitespace-nowrap',
            props.reducedMotion ? '' : 'feature-wall-marquee-track'
          )}
        >
          {AGENT_CATALOG.map((agent) => (
            <MarqueePill key={`a-${agent.id}`} agentId={agent.id} label={agent.label} />
          ))}
          {AGENT_CATALOG.map((agent) => (
            <MarqueePill key={`b-${agent.id}`} agentId={agent.id} label={agent.label} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MarqueePill(props: {
  agentId: (typeof AGENT_CATALOG)[number]['id']
  label: string
}): JSX.Element {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] leading-none shadow-[inset_0_0_0_1px_rgba(24,24,27,0.06)]">
      <span className="inline-flex size-3.5 items-center justify-center">
        <AgentIcon agent={props.agentId} size={14} />
      </span>
      <span>{props.label}</span>
    </span>
  )
}
