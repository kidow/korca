// Per-step copy for the agents-orchestration tile in the Explore Korca modal.

export type AgentsStepId = 'statuses' | 'usage' | 'orchestration'

export type AgentsStep = {
  readonly id: AgentsStepId
  // Short label rendered in the bottom stepper.
  readonly name: string
  // Subtitle shown directly under the modal's main title — "you are looking
  // at this slice of the workflow".
  readonly subtitle: string
  // One-sentence summary rendered under the subtitle.
  readonly description: string
  // Whether the step is optional — surfaced as an "Optional" pill next to the
  // subtitle so users know they can skip the related setup.
  readonly optional?: boolean
}

export const AGENTS_STEPS: readonly AgentsStep[] = [
  {
    id: 'statuses',
    name: '가시성',
    subtitle: '에이전트 가시성',
    description: '어떤 에이전트가 작업 중인지, 대기 중인지, 실행 중인지, 막혔는지 확인합니다.'
  },
  {
    id: 'orchestration',
    name: '오케스트레이션',
    subtitle: '오케스트레이션',
    description: '에이전트가 Korca 작업공간을 조율해 더 큰 작업을 처리하도록 합니다.'
  },
  {
    id: 'usage',
    name: '사용량',
    subtitle: '사용량',
    description: '연결된 계정별 사용량과 rate limit을 확인해, 언제 전환해야 하는지 알 수 있습니다.',
    optional: true
  }
] as const

export function getAgentsSteps(): readonly AgentsStep[] {
  return AGENTS_STEPS
}
