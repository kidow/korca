/* eslint-disable max-lines -- Why: repo Source Control AI settings keep one
   draft/save flow across model, instruction, and PR-default override groups. */
import { useMemo, useState } from 'react'
import type { Repo } from '../../../../shared/types'
import type {
  RepoSourceControlAiOverrides,
  SourceControlAiOperation
} from '../../../../shared/source-control-ai-types'
import {
  clearSourceControlAiModelChoiceForHost,
  normalizeRepoSourceControlAiOverrides,
  normalizeSourceControlAiSettings,
  readSourceControlAiModelChoiceForHost,
  selectSourceControlAiModelChoiceForHost
} from '../../../../shared/source-control-ai'
import {
  getCommitMessageAgentCapability,
  isCustomAgentId,
  resolveCommitMessageAgentChoice
} from '../../../../shared/commit-message-agent-spec'
import {
  getCommitMessageModelDiscoveryHostKeyForScope,
  LOCAL_COMMIT_MESSAGE_HOST_KEY
} from '../../../../shared/commit-message-host-key'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useAppStore } from '../../store'
import { getRuntimeGitScope } from '../../runtime/runtime-git-client'
import { getRepositorySourceControlAiSectionId } from './repository-settings-targets'
import { Button } from '../ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'

type RepositorySourceControlAiSectionProps = {
  repo: Repo
  updateRepo: (repoId: string, updates: Partial<Repo>) => void | Promise<boolean>
}

const INHERIT_MODEL_VALUE = '__inherit__'
const PROMPT_MODE_INHERIT = 'inherit'
const PROMPT_MODE_OVERRIDE = 'override'

const OPERATIONS: {
  operation: SourceControlAiOperation
  modelLabel: string
  instructionLabel: string
  globalPlaceholder: string
}[] = [
  {
    operation: 'commitMessage',
    modelLabel: '커밋 메시지 모델',
    instructionLabel: '커밋 메시지 프롬프트',
    globalPlaceholder: '전역 커밋 메시지 프롬프트가 비어 있습니다.'
  },
  {
    operation: 'pullRequest',
    modelLabel: 'PR 세부 정보 모델',
    instructionLabel: '풀 리퀘스트 프롬프트',
    globalPlaceholder: '전역 풀 리퀘스트 프롬프트가 비어 있습니다.'
  },
  {
    operation: 'branchName',
    modelLabel: '브랜치 이름 모델',
    instructionLabel: '브랜치 이름 프롬프트',
    globalPlaceholder: '전역 브랜치 이름 프롬프트가 비어 있습니다.'
  }
]

type PrDefaultKey = keyof NonNullable<RepoSourceControlAiOverrides['prCreationDefaults']>
type RepoAiDraftState = {
  repoId: string
  value: RepoSourceControlAiOverrides
  baseSerialized: string
}

function hasOwnPrompt(
  prompts: RepoSourceControlAiOverrides['instructionsByOperation'],
  operation: SourceControlAiOperation
): boolean {
  return typeof prompts?.[operation] === 'string'
}

function triStateValue(value: boolean | null | undefined): 'inherit' | 'on' | 'off' {
  if (value === true) {
    return 'on'
  }
  if (value === false) {
    return 'off'
  }
  return 'inherit'
}

function normalizeRepoAiDraft(
  value: RepoSourceControlAiOverrides | null | undefined
): RepoSourceControlAiOverrides {
  return normalizeRepoSourceControlAiOverrides(value) ?? {}
}

function serializeRepoAiDraft(value: RepoSourceControlAiOverrides): string {
  return JSON.stringify(normalizeRepoAiDraft(value))
}

export function createRepoAiDraftState(
  repoId: string,
  value: RepoSourceControlAiOverrides
): RepoAiDraftState {
  const normalized = normalizeRepoAiDraft(value)
  return {
    repoId,
    value: normalized,
    baseSerialized: serializeRepoAiDraft(normalized)
  }
}

export function resolveRepoAiDraftState(
  current: RepoAiDraftState,
  repoId: string,
  persistedRepoAi: RepoSourceControlAiOverrides,
  persistedSerialized = serializeRepoAiDraft(persistedRepoAi)
): RepoAiDraftState {
  const currentSerialized = serializeRepoAiDraft(current.value)
  // Why: render-time draft sync relies on object identity to avoid repeating
  // the same state update during server-rendered settings tests.
  if (
    current.repoId === repoId &&
    currentSerialized === persistedSerialized &&
    current.baseSerialized === persistedSerialized
  ) {
    return current
  }
  if (
    current.repoId !== repoId ||
    currentSerialized === current.baseSerialized ||
    currentSerialized === persistedSerialized
  ) {
    return {
      repoId,
      value: persistedRepoAi,
      baseSerialized: persistedSerialized
    }
  }
  return current
}

export function RepositorySourceControlAiSection({
  repo,
  updateRepo
}: RepositorySourceControlAiSectionProps): React.JSX.Element {
  const mountedRef = useMountedRef()
  const settings = useAppStore((state) => state.settings)
  const source = normalizeSourceControlAiSettings(
    settings?.sourceControlAi,
    settings?.commitMessageAi
  )
  const hostScope = getRuntimeGitScope(settings, repo.connectionId)
  const hostKey = getCommitMessageModelDiscoveryHostKeyForScope(hostScope)
  const agentId = resolveCommitMessageAgentChoice(
    source.agentId,
    settings?.defaultTuiAgent,
    settings?.disabledTuiAgents
  )
  const baseCapability =
    agentId && !isCustomAgentId(agentId) ? getCommitMessageAgentCapability(agentId) : null
  const discoveredModels =
    agentId && !isCustomAgentId(agentId)
      ? (source.discoveredModelsByAgentByHost?.[hostKey]?.[agentId] ??
        (hostKey === LOCAL_COMMIT_MESSAGE_HOST_KEY
          ? source.discoveredModelsByAgent?.[agentId]
          : undefined))
      : undefined
  const capability =
    baseCapability && discoveredModels?.length
      ? { ...baseCapability, models: discoveredModels }
      : baseCapability
  const persistedRepoAi = useMemo(
    () => normalizeRepoAiDraft(repo.sourceControlAi),
    [repo.sourceControlAi]
  )
  const persistedSerialized = useMemo(
    () => serializeRepoAiDraft(persistedRepoAi),
    [persistedRepoAi]
  )
  // Why: repo.sourceControlAi is saved as one nested value; a local draft keeps
  // textarea keystrokes and sibling controls from racing over IPC/RPC.
  const [draftState, setDraftState] = useState<RepoAiDraftState>(() =>
    createRepoAiDraftState(repo.id, persistedRepoAi)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const resolvedDraftState = resolveRepoAiDraftState(
    draftState,
    repo.id,
    persistedRepoAi,
    persistedSerialized
  )
  if (resolvedDraftState !== draftState) {
    // Why: repo settings may be refreshed externally; clean drafts should
    // follow that source before paint, while dirty edits stay in place.
    setDraftState(resolvedDraftState)
    if (saveError !== null) {
      setSaveError(null)
    }
  }

  const repoAi = resolvedDraftState.value
  const draftSerialized = useMemo(() => serializeRepoAiDraft(repoAi), [repoAi])
  const isDirty =
    resolvedDraftState.repoId !== repo.id || draftSerialized !== resolvedDraftState.baseSerialized

  const updateDraftRepoAi = (
    update: (current: RepoSourceControlAiOverrides) => RepoSourceControlAiOverrides
  ): void => {
    setDraftState((current) => {
      const resolved = resolveRepoAiDraftState(
        current,
        repo.id,
        persistedRepoAi,
        persistedSerialized
      )
      return {
        ...resolved,
        value: normalizeRepoAiDraft(update(resolved.value))
      }
    })
    setSaveError(null)
  }

  const saveDraft = async (): Promise<void> => {
    if (!isDirty || isSaving) {
      return
    }
    const next = normalizeRepoAiDraft(resolvedDraftState.value)
    const nextSerialized = serializeRepoAiDraft(next)
    setIsSaving(true)
    setSaveError(null)
    try {
      const result = await updateRepo(repo.id, { sourceControlAi: next })
      if (!mountedRef.current) {
        return
      }
      if (result === false) {
        setSaveError('소스 컨트롤 AI 설정 저장에 실패했습니다.')
        return
      }
      setDraftState((current) => {
        if (current.repoId !== repo.id) {
          return current
        }
        const currentSerialized = serializeRepoAiDraft(current.value)
        return {
          repoId: repo.id,
          value: currentSerialized === nextSerialized ? next : current.value,
          baseSerialized: nextSerialized
        }
      })
    } catch {
      if (mountedRef.current) {
        setSaveError('소스 컨트롤 AI 설정 저장에 실패했습니다.')
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false)
      }
    }
  }

  const discardDraft = (): void => {
    setDraftState(createRepoAiDraftState(repo.id, persistedRepoAi))
    setSaveError(null)
  }

  const updateModelOverride = (operation: SourceControlAiOperation, modelId: string): void => {
    if (!capability) {
      return
    }
    updateDraftRepoAi((current) => {
      const nextModelOverrides = { ...current.modelOverridesByOperation }
      if (modelId === INHERIT_MODEL_VALUE) {
        const nextChoice = clearSourceControlAiModelChoiceForHost(
          nextModelOverrides[operation],
          hostKey,
          capability.id
        )
        if (nextChoice) {
          nextModelOverrides[operation] = nextChoice
        } else {
          delete nextModelOverrides[operation]
        }
        return { ...current, modelOverridesByOperation: nextModelOverrides }
      }
      const model = capability.models.find((candidate) => candidate.id === modelId)
      if (!model) {
        return current
      }
      const nextChoice = selectSourceControlAiModelChoiceForHost(
        current.modelOverridesByOperation?.[operation],
        hostKey,
        capability.id,
        model.id
      )
      if (model.thinkingLevels && model.defaultThinkingLevel) {
        nextChoice.selectedThinkingByModel = {
          ...nextChoice.selectedThinkingByModel,
          [model.id]: nextChoice.selectedThinkingByModel?.[model.id] ?? model.defaultThinkingLevel
        }
      }
      return {
        ...current,
        modelOverridesByOperation: {
          ...nextModelOverrides,
          [operation]: nextChoice
        }
      }
    })
  }

  const updatePromptMode = (
    operation: SourceControlAiOperation,
    mode: string,
    inheritedValue: string
  ): void => {
    updateDraftRepoAi((current) => {
      const nextPrompts = { ...current.instructionsByOperation }
      if (mode === PROMPT_MODE_INHERIT) {
        delete nextPrompts[operation]
      } else if (!hasOwnPrompt(nextPrompts, operation)) {
        nextPrompts[operation] = inheritedValue
      }
      return { ...current, instructionsByOperation: nextPrompts }
    })
  }

  const updatePromptOverride = (operation: SourceControlAiOperation, value: string): void => {
    updateDraftRepoAi((current) => ({
      ...current,
      instructionsByOperation: {
        ...current.instructionsByOperation,
        [operation]: value
      }
    }))
  }

  const updateOperationThinking = (
    operation: SourceControlAiOperation,
    modelId: string,
    value: string
  ): void => {
    updateDraftRepoAi((current) => {
      const choice = current.modelOverridesByOperation?.[operation]
      return {
        ...current,
        modelOverridesByOperation: {
          ...current.modelOverridesByOperation,
          [operation]: {
            ...choice,
            selectedThinkingByModel: {
              ...choice?.selectedThinkingByModel,
              [modelId]: value
            }
          }
        }
      }
    })
  }

  const updatePrDefault = (key: PrDefaultKey, value: string): void => {
    updateDraftRepoAi((current) => {
      const nextDefaults = { ...current.prCreationDefaults }
      if (value === 'inherit') {
        delete nextDefaults[key]
      } else {
        nextDefaults[key] = value === 'on'
      }
      return { ...current, prCreationDefaults: nextDefaults }
    })
  }

  const prDefaultRows: { key: PrDefaultKey; label: string }[] = [
    { key: 'draft', label: '기본 초안' },
    { key: 'useTemplate', label: '사용 가능한 경우 PR 템플릿 사용' },
    { key: 'generateDetailsOnOpen', label: 'PR 생성 화면을 열 때 세부 정보 생성' },
    { key: 'openAfterCreate', label: '생성 후 PR 열기' }
  ]

  return (
    <section
      id={getRepositorySourceControlAiSectionId(repo.id)}
      data-settings-section={getRepositorySourceControlAiSectionId(repo.id)}
      className="space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold">소스 컨트롤 AI</h3>
          <p className="text-xs text-muted-foreground">
            저장소별 재정의입니다. 여기서 값을 지정하기 전까지 각 필드는 전역 설정을 사용합니다.
          </p>
          {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className="text-[11px] text-muted-foreground">
            {isDirty ? '저장되지 않은 변경 사항' : '저장됨'}
          </span>
          {isDirty ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={discardDraft}
              disabled={isSaving}
            >
              버리기
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => void saveDraft()}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      {capability ? (
        <div className="space-y-3">
          {OPERATIONS.map((row) => {
            const choice = repoAi.modelOverridesByOperation?.[row.operation]
            const selectedModelId = readSourceControlAiModelChoiceForHost(
              choice,
              hostKey,
              capability.id
            )
            const selectedModel = selectedModelId
              ? capability.models.find((model) => model.id === selectedModelId)
              : null
            const selectedThinking =
              selectedModel?.thinkingLevels && selectedModel.defaultThinkingLevel
                ? (choice?.selectedThinkingByModel?.[selectedModel.id] ??
                  selectedModel.defaultThinkingLevel)
                : null
            return (
              <div
                key={row.operation}
                className="space-y-2 rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-xs font-medium">{row.modelLabel}</Label>
                  <Select
                    value={selectedModelId ?? INHERIT_MODEL_VALUE}
                    onValueChange={(value) => updateModelOverride(row.operation, value)}
                  >
                    <SelectTrigger size="sm" className="h-8 w-[240px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={INHERIT_MODEL_VALUE}>전역 모델 사용</SelectItem>
                      {capability.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedModel?.thinkingLevels && selectedThinking ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[11px] text-muted-foreground">추론</span>
                    <Select
                      value={selectedThinking}
                      onValueChange={(value) =>
                        updateOperationThinking(row.operation, selectedModel.id, value)
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModel.thinkingLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          지원되는 전역 소스 컨트롤 AI 에이전트를 선택한 후에만 모델 재정의를 사용할 수
          있습니다.
        </p>
      )}

      <div className="space-y-3">
        {OPERATIONS.map((row) => {
          const inherited = source.instructionsByOperation[row.operation]?.trim() ?? ''
          const hasOverride = hasOwnPrompt(repoAi.instructionsByOperation, row.operation)
          const value = hasOverride ? (repoAi.instructionsByOperation?.[row.operation] ?? '') : ''
          return (
            <div key={row.instructionLabel} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-xs font-medium">{row.instructionLabel}</Label>
                <Select
                  value={hasOverride ? PROMPT_MODE_OVERRIDE : PROMPT_MODE_INHERIT}
                  onValueChange={(mode) => updatePromptMode(row.operation, mode, inherited)}
                >
                  <SelectTrigger size="sm" className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROMPT_MODE_INHERIT}>전역 사용</SelectItem>
                    <SelectItem value={PROMPT_MODE_OVERRIDE}>사용자 지정</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <textarea
                rows={3}
                value={hasOverride ? value : ''}
                onChange={(event) => updatePromptOverride(row.operation, event.target.value)}
                disabled={!hasOverride}
                placeholder={hasOverride ? '' : inherited || row.globalPlaceholder}
                className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
              />
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">PR 생성 기본값</Label>
        <div className="space-y-2">
          {prDefaultRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
            >
              <span className="text-xs text-foreground">{row.label}</span>
              <Select
                value={triStateValue(repoAi.prCreationDefaults?.[row.key])}
                onValueChange={(value) => updatePrDefault(row.key, value)}
              >
                <SelectTrigger size="sm" className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">전역 사용</SelectItem>
                  <SelectItem value="on">켜짐</SelectItem>
                  <SelectItem value="off">꺼짐</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
