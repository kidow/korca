import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FEATURE_TOUR_PREVIEW_COPY, FeatureTourPreview } from './FeatureTourPreview'

describe('FeatureTourPreview first-run copy', () => {
  it('teaches that workspaces keep terminal and agent activity together', () => {
    const workspaceFrame = FEATURE_TOUR_PREVIEW_COPY.find((frame) => frame.id === 1)

    expect(workspaceFrame?.caption).toContain('브랜치')
    expect(workspaceFrame?.caption).toContain('에이전트 활동')
  })

  it('teaches that opening a workspace returns to its terminal', () => {
    const terminalFrame = FEATURE_TOUR_PREVIEW_COPY.find((frame) => frame.id === 4)

    expect(terminalFrame?.caption).toContain('작업공간')
    expect(terminalFrame?.caption).toContain('터미널')
  })

  it('renders the cycling captions into the first-run preview', () => {
    const html = renderToStaticMarkup(<FeatureTourPreview />)

    expect(html).toContain('각 작업공간은 브랜치, 터미널, 에이전트 활동을 함께 유지합니다.')
    expect(html).toContain('어떤 작업공간이든 열어 터미널로 돌아가고')
  })
})
