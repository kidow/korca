// Per-step copy for the workbench tile in the Explore Korca modal. Mirrors
// agents-orchestration-steps.ts so the rail / body code can render both the
// same way.

export type WorkbenchStepId = 'terminal' | 'editor' | 'browser'

export type WorkbenchStep = {
  readonly id: WorkbenchStepId
  // Short label rendered in the rail.
  readonly name: string
  // Subtitle shown directly under the modal's main title.
  readonly subtitle: string
  // One-sentence summary rendered under the subtitle.
  readonly description: string
}

export const WORKBENCH_STEPS: readonly WorkbenchStep[] = [
  {
    id: 'terminal',
    name: '터미널',
    subtitle: '터미널',
    description: '에이전트, 테스트, 개발 로그를 한 번에 볼 수 있게 유지합니다.'
  },
  {
    id: 'editor',
    name: '에디터',
    subtitle: '에디터',
    description: 'Korca를 떠나지 않고 노션 스타일 마크다운 에디터로 메모를 작성합니다.'
  },
  {
    id: 'browser',
    name: '브라우저',
    subtitle: '브라우저',
    description:
      'Korca의 브라우저에서 앱을 실행하고, 선택한 UI 요소를 에이전트에 보내며, 에이전트가 웹페이지와 상호작용하도록 합니다.'
  }
] as const

export function getWorkbenchSteps(): readonly WorkbenchStep[] {
  return WORKBENCH_STEPS
}
