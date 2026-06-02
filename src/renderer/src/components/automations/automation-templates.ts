import type { AutomationSchedulePreset } from '../../../../shared/automations-types'
import type { TuiAgent } from '../../../../shared/types'

export type AutomationTemplate = {
  id: string
  category: string
  label: string
  description: string
  name: string
  prompt: string
  preset: AutomationSchedulePreset
  time?: string
  dayOfWeek?: string
  agentId?: TuiAgent
  missedRunGraceMinutes?: string
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'repo-health-weekday',
    category: '저장소 상태',
    label: '평일 저장소 점검',
    description: '매 평일 종속성, 실패한 테스트, 위험한 열린 변경 사항을 점검합니다.',
    name: '평일 저장소 점검',
    prompt:
      'Review the repository health. Check dependency updates, failing tests, lint/typecheck status, and risky open changes. Summarize findings and suggest the next action.',
    preset: 'weekdays',
    time: '09:00',
    missedRunGraceMinutes: '720'
  },
  {
    id: 'release-prep-weekly',
    category: '릴리스 준비',
    label: '릴리스 준비도',
    description: '현재 프로젝트 상태를 바탕으로 주간 릴리스 위험 요약을 만듭니다.',
    name: '릴리스 준비 점검',
    prompt:
      'Prepare a release readiness summary. Look for blockers, unmerged risky changes, missing validation, and documentation gaps. End with a concise release/no-release recommendation.',
    preset: 'weekly',
    time: '14:00',
    dayOfWeek: '4',
    missedRunGraceMinutes: '1440'
  },
  {
    id: 'recurring-review-daily',
    category: '반복 검토',
    label: '일일 변경 검토',
    description: '최근 작업을 훑어 정확성, UX, 테스트 범위 위험을 짚어냅니다.',
    name: '일일 변경 검토',
    prompt:
      'Review recent changes in this workspace. Focus on correctness risks, UX regressions, missing tests, and follow-up tasks. Keep the report short and actionable.',
    preset: 'daily',
    time: '16:30',
    missedRunGraceMinutes: '180'
  },
  {
    id: 'maintenance-hourly',
    category: '유지보수',
    label: '시간별 대기열 점검',
    description: '멈춘 작업, 오래된 생성 파일, 실패한 로컬 검증을 찾습니다.',
    name: '시간별 유지보수 점검',
    prompt:
      'Check for stuck work, stale generated files, failing validation, and anything that needs human attention. Report only actionable issues.',
    preset: 'hourly',
    time: '00:15',
    missedRunGraceMinutes: '30'
  }
]
