import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import type { GlobalSettings } from '../../../../shared/types'
import type { SourceControlAiSettings } from '../../../../shared/source-control-ai-types'
import {
  getCommitMessageModelDiscoveryHostKey,
  getCommitMessageModelDiscoveryHostKeyForScope
} from '../../../../shared/commit-message-host-key'
import { useAppStore } from '../../store'
import {
  CommitMessageAiPane,
  createCommitMessageInstructionDraftState,
  getCommitMessageSettingsPaneDiscoveryHostKey,
  mergeDiscoveredModelsIntoCommitMessageConfig,
  resolveCommitMessageInstructionDraftState
} from './CommitMessageAiPane'
import { COMMIT_MESSAGE_AI_PANE_SEARCH_ENTRIES } from './commit-message-ai-search'

function renderPane(settings: GlobalSettings): string {
  return renderToStaticMarkup(
    React.createElement(CommitMessageAiPane, {
      settings,
      updateSettings: () => {}
    })
  )
}

function buildSettings(overrides: Partial<GlobalSettings> = {}): GlobalSettings {
  return {
    commitMessageAi: {
      enabled: false,
      agentId: null,
      selectedModelByAgent: {},
      selectedThinkingByModel: {},
      customPrompt: '',
      customAgentCommand: ''
    },
    ...overrides
  } as GlobalSettings
}

describe('CommitMessageAiPane', () => {
  beforeEach(() => {
    useAppStore.setState({ settingsSearchQuery: '' })
  })

  it('updates clean instruction drafts when persisted instructions change', () => {
    const state = createCommitMessageInstructionDraftState(
      {
        commitMessage: 'commit-a',
        pullRequest: 'pr-a'
      },
      1
    )

    const resolved = resolveCommitMessageInstructionDraftState(
      state,
      {
        commitMessage: 'commit-b',
        pullRequest: 'pr-a'
      },
      1
    )

    expect(resolved.draft).toEqual({
      commitMessage: 'commit-b',
      pullRequest: 'pr-a'
    })
  })

  it('preserves dirty instruction drafts until the discard signal changes', () => {
    const state = createCommitMessageInstructionDraftState(
      {
        commitMessage: 'commit-a',
        pullRequest: 'pr-a'
      },
      1
    )
    state.draft.commitMessage = 'local edit'

    const withExternalChange = resolveCommitMessageInstructionDraftState(
      state,
      {
        commitMessage: 'commit-b',
        pullRequest: 'pr-b'
      },
      1
    )
    expect(withExternalChange.draft).toEqual({
      commitMessage: 'local edit',
      pullRequest: 'pr-b'
    })

    const afterDiscard = resolveCommitMessageInstructionDraftState(
      withExternalChange,
      {
        commitMessage: 'commit-b',
        pullRequest: 'pr-b'
      },
      2
    )
    expect(afterDiscard.draft).toEqual({
      commitMessage: 'commit-b',
      pullRequest: 'pr-b'
    })
  })

  it('renders only the opt-in control before the feature is enabled', () => {
    const markup = renderPane(buildSettings())

    expect(markup).toContain('소스 컨트롤 AI')
    expect(markup).toContain('소스 컨트롤 AI 사용')
    expect(markup).toContain('aria-checked="false"')
    expect(markup).not.toContain('워크트리가 있는 위치에서')
    expect(markup).not.toContain('추론 강도')
  })

  it('renders model, thinking, and prompt controls for enabled preset agents', () => {
    const markup = renderPane(
      buildSettings({
        commitMessageAi: {
          enabled: true,
          agentId: 'codex',
          selectedModelByAgent: { codex: 'gpt-5.5' },
          selectedThinkingByModel: { 'gpt-5.5': 'medium' },
          customPrompt: 'Use Conventional Commits.',
          customAgentCommand: ''
        }
      })
    )

    expect(markup).toContain('aria-checked="true"')
    expect(markup).toContain('워크트리가 있는 위치에서')
    expect(markup).toContain('기본 모델')
    expect(markup).toContain('추론 강도')
    expect(markup).toContain('커밋 메시지 모델')
    expect(markup).toContain('PR 세부 정보 모델')
    expect(markup).not.toContain('브랜치 이름 모델')
    expect(markup).toContain('강도가 높을수록 더 신중한 결과를 얻지만')
    expect(markup).toContain('Use Conventional Commits.')
    expect(markup).toContain('저장')
    expect(markup).toContain('저장됨')
  })

  it('keeps the agent and model selectors aligned for long labels', () => {
    const markup = renderPane(
      buildSettings({
        commitMessageAi: {
          enabled: true,
          agentId: 'copilot',
          selectedModelByAgent: { copilot: 'gpt-5.5' },
          selectedThinkingByModel: {},
          customPrompt: '',
          customAgentCommand: ''
        }
      })
    )

    expect(markup.match(/w-\[260px\]/g)).toHaveLength(2)
    expect(markup.match(/shrink-0/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('renders custom command settings for custom agents', () => {
    const markup = renderPane(
      buildSettings({
        commitMessageAi: {
          enabled: true,
          agentId: 'custom',
          selectedModelByAgent: {},
          selectedThinkingByModel: {},
          customPrompt: '',
          customAgentCommand: 'ollama run llama3.1 {prompt}'
        }
      })
    )

    expect(markup).toContain('소스 컨트롤 AI')
    expect(markup).toContain('사용자 지정 명령')
    expect(markup).toContain('ollama run llama3.1 {prompt}')
  })

  it('shows an unconfigured state when the default agent is unsupported', () => {
    const markup = renderPane(
      buildSettings({
        defaultTuiAgent: 'aider',
        commitMessageAi: {
          enabled: true,
          agentId: null,
          selectedModelByAgent: {},
          selectedThinkingByModel: {},
          customPrompt: '',
          customAgentCommand: ''
        }
      })
    )

    expect(markup).toContain('미설정')
    expect(markup).toContain('기본 에이전트가 Aider')
    expect(markup).toContain('지원되는 에이전트나 사용자 지정을 선택하세요')
    expect(markup).not.toContain('선택한 에이전트가 사용하는 모델')
    expect(markup).not.toContain('추론 강도')
  })

  it('shows Gemini as coming soon instead of a selectable generator', () => {
    const markup = renderPane(
      buildSettings({
        commitMessageAi: {
          enabled: true,
          agentId: 'gemini',
          selectedModelByAgent: {},
          selectedThinkingByModel: {},
          customPrompt: '',
          customAgentCommand: ''
        }
      })
    )

    expect(markup).toContain('Gemini')
    expect(markup).toContain('Gemini의 소스 컨트롤 AI는 곧 지원됩니다')
    expect(markup).not.toContain('작업별 재정의가 없을 때 소스 컨트롤 AI가 사용하는 모델')
  })

  it('keeps custom command discoverable in settings search metadata', () => {
    const customCommandEntry = COMMIT_MESSAGE_AI_PANE_SEARCH_ENTRIES.find(
      (entry) => entry.title === '사용자 지정 명령'
    )

    expect(customCommandEntry?.keywords).toEqual(
      expect.arrayContaining(['custom', 'command', 'ollama'])
    )
  })

  it('merges discovered models without clobbering newer settings fields', () => {
    const config: SourceControlAiSettings = {
      enabled: true,
      agentId: 'cursor',
      selectedModelByAgent: { cursor: 'stale-model', codex: 'gpt-5.5' },
      selectedThinkingByModel: { 'gpt-5.5': 'low' },
      instructionsByOperation: { commitMessage: 'Use Conventional Commits.' },
      customAgentCommand: '',
      discoveredModelsByAgent: {}
    }

    const merged = mergeDiscoveredModelsIntoCommitMessageConfig(
      config,
      'cursor',
      [{ id: 'auto', label: 'Auto' }],
      'auto'
    )

    expect(merged.instructionsByOperation.commitMessage).toBe('Use Conventional Commits.')
    expect(merged.agentId).toBe('cursor')
    expect(merged.selectedModelByAgent).toEqual({
      cursor: 'auto',
      codex: 'gpt-5.5'
    })
    expect(merged.discoveredModelsByAgent?.cursor).toEqual([{ id: 'auto', label: 'Auto' }])
    expect(merged.discoveredModelsByAgentByHost?.local?.cursor).toEqual([
      { id: 'auto', label: 'Auto' }
    ])
  })

  it('keeps SSH discovered models out of the legacy local cache', () => {
    const config: SourceControlAiSettings = {
      enabled: true,
      agentId: 'cursor',
      selectedModelByAgent: { cursor: 'auto' },
      selectedThinkingByModel: {},
      instructionsByOperation: {},
      customAgentCommand: '',
      discoveredModelsByAgent: { cursor: [{ id: 'auto', label: 'Auto' }] },
      selectedModelByAgentByHost: {},
      discoveredModelsByAgentByHost: {}
    }

    const merged = mergeDiscoveredModelsIntoCommitMessageConfig(
      config,
      'cursor',
      [{ id: 'remote-only', label: 'Remote Only' }],
      'remote-only',
      'ssh:conn-1'
    )

    expect(merged.selectedModelByAgent.cursor).toBe('auto')
    expect(merged.discoveredModelsByAgent?.cursor).toEqual([{ id: 'auto', label: 'Auto' }])
    expect(merged.selectedModelByAgentByHost?.['ssh:conn-1']?.cursor).toBe('remote-only')
    expect(merged.discoveredModelsByAgentByHost?.['ssh:conn-1']?.cursor).toEqual([
      { id: 'remote-only', label: 'Remote Only' }
    ])
  })

  it('keys model discovery cache by execution host', () => {
    expect(getCommitMessageModelDiscoveryHostKey(null)).toBe('local')
    expect(getCommitMessageModelDiscoveryHostKey('ssh-1')).toBe('ssh:ssh-1')
    expect(getCommitMessageModelDiscoveryHostKey(undefined)).toBe('unknown')
    expect(getCommitMessageModelDiscoveryHostKeyForScope('runtime:env-1')).toBe('runtime:env-1')
    expect(getCommitMessageModelDiscoveryHostKeyForScope('ssh-1')).toBe('ssh:ssh-1')
  })

  it('keeps local active worktree discovery scoped to local, not unknown', () => {
    expect(getCommitMessageSettingsPaneDiscoveryHostKey(buildSettings(), null, true)).toBe('local')
    expect(getCommitMessageSettingsPaneDiscoveryHostKey(buildSettings(), undefined, true)).toBe(
      'unknown'
    )
    expect(
      getCommitMessageSettingsPaneDiscoveryHostKey(
        buildSettings({ activeRuntimeEnvironmentId: 'env-1' }),
        null,
        true
      )
    ).toBe('runtime:env-1')
  })
})
