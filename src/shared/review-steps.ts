// Per-step copy for the review tile in the Explore Korca modal. Mirrors
// agents-orchestration-steps.ts and workbench-steps.ts so the rail / body
// code can render all three the same way.

export type ReviewStepId = 'notes' | 'pr-view' | 'ship'

export type ReviewStep = {
  readonly id: ReviewStepId
  readonly name: string
  readonly subtitle: string
  readonly description: string
}

export const REVIEW_STEPS: readonly ReviewStep[] = [
  {
    id: 'notes',
    name: '노트',
    subtitle: '노트 & diff',
    description: '집중된 리뷰 노트를 에이전트에 보냅니다.'
  },
  {
    id: 'pr-view',
    name: 'PR 확인',
    subtitle: 'PR 확인 & 코멘트',
    description: 'Checks 탭에서 PR 상태를 확인합니다.'
  },
  {
    id: 'ship',
    name: 'AI로 배포',
    subtitle: 'AI로 배포',
    description: 'AI가 커밋과 PR 초안을 준비하도록 합니다.'
  }
] as const

export function getReviewSteps(): readonly ReviewStep[] {
  return REVIEW_STEPS
}
