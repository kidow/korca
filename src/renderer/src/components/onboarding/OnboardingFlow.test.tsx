import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultOnboardingState, getDefaultSettings } from '../../../../shared/constants'
import { useAppStore } from '@/store'
import OnboardingFlow from './OnboardingFlow'
import { ONBOARDING_SKIP_CONFIRMATION_COPY } from './OnboardingSkipConfirmationDialog'

describe('OnboardingFlow', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true)
    useAppStore.setState({
      repos: [],
      settings: getDefaultSettings('/tmp')
    })
    vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
  })

  afterEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true)
    vi.unstubAllGlobals()
  })

  it('renders the tour intro in the standard left-aligned onboarding shell', () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow
        onboarding={{
          ...getDefaultOnboardingState(),
          lastCompletedStep: 5
        }}
        onOnboardingChange={vi.fn()}
      />
    )

    expect(html).toContain('Orca 둘러보기')
    expect(html).toContain('Orca의 고급 기능을 60초 만에 살펴보세요.')
    expect(html).toContain('둘러보기 시작')
    // Why: the prior intro carried a redundant lead, a four-item checklist, and
    // a help-menu footnote. The tour animation already conveys all of that, so
    // the body is now just the preview + a single CTA — guard against drift.
    expect(html).not.toContain('Preview the core workflow.')
    expect(html).not.toContain('Run agents in isolated worktrees.')
    expect(html).not.toContain('Available later under Help')
    expect(html).toContain('계속')
    expect(html).toContain('프로젝트 설정으로 건너뛰기')
    expect(html).not.toContain('둘러보기 건너뛰기')
  })

  it('keeps agent setup actions out of the footer', () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow
        onboarding={{
          ...getDefaultOnboardingState(),
          lastCompletedStep: 3
        }}
        onOnboardingChange={vi.fn()}
      />
    )

    expect(html).toContain('에이전트용 Orca를 설정하세요')
    expect(html).toContain('에이전트가 쓸 고급 Orca 기능을 켜세요.')
    expect(html).toContain('기능 켜기')
    expect(html).toContain('계속')
    expect(html).toContain('프로젝트 설정으로 건너뛰기')
    expect(html).not.toContain('>Skip</button>')
  })

  it('skips GitHub task setup when the GitHub CLI is already detected', () => {
    useAppStore.setState({
      preflightStatus: {
        git: { installed: true },
        gh: { installed: true, authenticated: false }
      },
      preflightStatusChecked: true
    })

    const html = renderToStaticMarkup(
      <OnboardingFlow
        onboarding={{
          ...getDefaultOnboardingState(),
          lastCompletedStep: 4
        }}
        onOnboardingChange={vi.fn()}
      />
    )

    expect(html).toContain('Orca 둘러보기')
    expect(html).not.toContain('GitHub 작업을 설정하세요')
    expect(html).not.toContain('작업 소스를 연결하세요')
  })

  it('shows only GitHub on the task setup page when the GitHub CLI is missing', () => {
    useAppStore.setState({
      preflightStatus: {
        git: { installed: true },
        gh: { installed: false, authenticated: false }
      },
      preflightStatusChecked: true
    })

    const html = renderToStaticMarkup(
      <OnboardingFlow
        onboarding={{
          ...getDefaultOnboardingState(),
          lastCompletedStep: 4
        }}
        onOnboardingChange={vi.fn()}
      />
    )

    expect(html).toContain('GitHub 작업을 설정하세요')
    expect(html).toContain('GitHub CLI를 설치하면 다음을 할 수 있습니다:')
    expect(html).toContain('GitHub')
    expect(html).not.toContain(
      '<h3 class="text-[15px] font-semibold leading-tight text-foreground">Linear</h3>'
    )
    expect(html).toContain(
      'Linear, GitLab, Bitbucket, Azure DevOps, Gitea, and Jira live in Settings'
    )
  })

  it('renders onboarding inside a centered modal shell', () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow onboarding={getDefaultOnboardingState()} onOnboardingChange={vi.fn()} />
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('data-onboarding-modal="true"')
    expect(html).toContain('h-[calc(100vh-2rem)]')
    expect(html).toContain('rounded-xl')
    expect(html).toContain('h-7 w-auto shrink-0 invert dark:invert-0')
    expect(html).not.toContain('min-h-screen')
    expect(html).not.toContain('background-color:#12181e')
  })

  it('renders concise skip confirmation copy', () => {
    expect(ONBOARDING_SKIP_CONFIRMATION_COPY).toEqual({
      title: '온보딩을 건너뛸까요?',
      description: '오래 걸리지 않습니다!',
      skipLabel: '건너뛰기',
      keepGoingLabel: '아니요, 계속 진행'
    })
  })
})
