import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AGENT_CATALOG } from '@/lib/agent-catalog'
import { AgentStep } from './AgentStep'

describe('AgentStep', () => {
  it('renders the translated detected label', () => {
    const html = renderToStaticMarkup(
      <AgentStep
        selectedAgent={null}
        onSelect={vi.fn()}
        detectedSet={new Set([AGENT_CATALOG[0].id])}
        isDetecting={false}
      />
    )

    expect(html).toContain('시스템에서 감지됨')
  })

  it('does not render the more-agents disclosure', () => {
    const html = renderToStaticMarkup(
      <AgentStep
        selectedAgent={AGENT_CATALOG[1].id}
        onSelect={vi.fn()}
        detectedSet={new Set([AGENT_CATALOG[0].id])}
        isDetecting={false}
      />
    )

    expect(html).not.toContain('Show ')
    expect(html).not.toContain('Hide agents')
  })
})
