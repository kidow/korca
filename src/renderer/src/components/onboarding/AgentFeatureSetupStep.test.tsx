import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AgentFeatureSetupStep } from './AgentFeatureSetupStep'

describe('AgentFeatureSetupStep', () => {
  it('renders the agent feature setup checklist', () => {
    const html = renderToStaticMarkup(
      <AgentFeatureSetupStep
        featureSetup={{
          browserUse: true,
          computerUse: true,
          orchestration: true
        }}
        onFeatureSetupChange={vi.fn()}
        featureSetupCommand={null}
        featureSetupCommandSelection={null}
        setupBusyLabel={null}
        onStartFeatureSetup={vi.fn()}
      />
    )

    expect(html).toContain('에이전트 브라우저 사용')
    expect(html).toContain('컴퓨터 사용')
    expect(html).toContain('에이전트 조정')
    expect(html).toContain('기능 켜기')
    expect(html).toContain('role="checkbox"')
  })
})
