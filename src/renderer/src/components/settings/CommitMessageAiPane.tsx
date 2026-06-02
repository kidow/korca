/* eslint-disable max-lines -- Why: each agent setting (toggle, agent dropdown,
   model dropdown, thinking effort dropdown, custom command, custom prompt) is
   a SearchableSetting block, and splitting the pane across files would scatter
   the ~6 conditional render branches without making any of them clearer. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Terminal } from 'lucide-react'
import type { GlobalSettings, TuiAgent } from '../../../../shared/types'
import type {
  SourceControlAiOperation,
  SourceControlAiSettingsPatch,
  SourceControlAiSettings
} from '../../../../shared/source-control-ai-types'
import {
  clearSourceControlAiModelChoiceForHost,
  normalizeSourceControlAiSettings,
  readSourceControlAiModelChoiceForHost,
  selectSourceControlAiModelChoiceForHost
} from '../../../../shared/source-control-ai'
import {
  CUSTOM_AGENT_ID,
  getCommitMessageAgentCapability,
  isCustomAgentId,
  listCommitMessageAgentCapabilities,
  resolveCommitMessageAgentChoice,
  type CommitMessageAgentCapability,
  type CommitMessageModelCapability
} from '../../../../shared/commit-message-agent-spec'
import { CUSTOM_PROMPT_PLACEHOLDER } from '../../../../shared/commit-message-prompt'
import {
  getCommitMessageModelDiscoveryHostKeyForScope,
  LOCAL_COMMIT_MESSAGE_HOST_KEY
} from '../../../../shared/commit-message-host-key'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import { getConnectionId } from '@/lib/connection-context'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  discoverRuntimeCommitMessageModels,
  getRuntimeGitScope
} from '../../runtime/runtime-git-client'
import { useAppStore } from '../../store'
import { useActiveWorktree } from '../../store/selectors'
import { SearchableSetting } from './SearchableSetting'
import { matchesSettingsSearch } from './settings-search'

type CommitMessageAiPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  writeSourceControlAiSettings?: (patch: SourceControlAiSettingsPatch) => Promise<void>
  onCustomPromptDirtyChange?: (dirty: boolean) => void
  customPromptDiscardSignal?: number
}

type ModelDiscoveryState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  hostKey: string
  models: CommitMessageModelCapability[]
  defaultModelId?: string
  error?: string
}

type CommitMessageInstructionOperation = Extract<
  SourceControlAiOperation,
  'commitMessage' | 'pullRequest'
>

type CommitMessageInstructionDraftValues = Record<CommitMessageInstructionOperation, string>

type CommitMessageInstructionDraftState = {
  source: CommitMessageInstructionDraftValues
  draft: CommitMessageInstructionDraftValues
  discardSignal: number | undefined
}

const COMMIT_MESSAGE_INSTRUCTION_OPERATIONS: readonly CommitMessageInstructionOperation[] = [
  'commitMessage',
  'pullRequest'
]

function cloneInstructionDraftValues(
  values: CommitMessageInstructionDraftValues
): CommitMessageInstructionDraftValues {
  return {
    commitMessage: values.commitMessage,
    pullRequest: values.pullRequest
  }
}

export function createCommitMessageInstructionDraftState(
  source: CommitMessageInstructionDraftValues,
  discardSignal: number | undefined
): CommitMessageInstructionDraftState {
  return {
    source: cloneInstructionDraftValues(source),
    draft: cloneInstructionDraftValues(source),
    discardSignal
  }
}

export function resolveCommitMessageInstructionDraftState(
  state: CommitMessageInstructionDraftState,
  source: CommitMessageInstructionDraftValues,
  discardSignal: number | undefined
): CommitMessageInstructionDraftState {
  if (state.discardSignal !== discardSignal) {
    return createCommitMessageInstructionDraftState(source, discardSignal)
  }

  let changed = false
  const nextSource = cloneInstructionDraftValues(state.source)
  const nextDraft = cloneInstructionDraftValues(state.draft)
  for (const operation of COMMIT_MESSAGE_INSTRUCTION_OPERATIONS) {
    if (state.source[operation] === source[operation]) {
      continue
    }
    if (state.draft[operation] === state.source[operation]) {
      nextDraft[operation] = source[operation]
    }
    nextSource[operation] = source[operation]
    changed = true
  }

  return changed
    ? {
        source: nextSource,
        draft: nextDraft,
        discardSignal
      }
    : state
}

const UNCONFIGURED_AGENT_SELECT_VALUE = ''
const INHERIT_MODEL_SELECT_VALUE = '__inherit__'
const COMING_SOON_COMMIT_MESSAGE_AGENTS: readonly { id: TuiAgent; label: string }[] = [
  { id: 'gemini', label: 'Gemini' }
]

function readSettings(settings: GlobalSettings): SourceControlAiSettings {
  return normalizeSourceControlAiSettings(settings.sourceControlAi, settings.commitMessageAi)
}

function agentLabel(agentId: TuiAgent, capability: CommitMessageAgentCapability): string {
  return AGENT_CATALOG.find((a) => a.id === agentId)?.label ?? capability.label
}

function readSelectedModelId(
  config: SourceControlAiSettings,
  hostKey: string,
  agentId: TuiAgent
): string | undefined {
  return readSourceControlAiModelChoiceForHost(
    {
      selectedModelByAgent: config.selectedModelByAgent,
      selectedModelByAgentByHost: config.selectedModelByAgentByHost
    },
    hostKey,
    agentId
  )
}

function resolveSelectedModel(
  config: SourceControlAiSettings,
  capability: CommitMessageAgentCapability,
  hostKey: string
): CommitMessageModelCapability {
  const persisted = readSelectedModelId(config, hostKey, capability.id)
  if (persisted) {
    const found = capability.models.find((m) => m.id === persisted)
    if (found) {
      return found
    }
  }
  // Why: defaultModelId is guaranteed to exist in provider capabilities by construction.
  return capability.models.find((m) => m.id === capability.defaultModelId) ?? capability.models[0]
}

function resolveSelectedThinking(
  config: SourceControlAiSettings,
  model: CommitMessageModelCapability
): string | undefined {
  if (!model.thinkingLevels) {
    return undefined
  }
  const persisted = config.selectedThinkingByModel[model.id]
  if (persisted && model.thinkingLevels.some((l) => l.id === persisted)) {
    return persisted
  }
  return model.defaultThinkingLevel
}

export function mergeDiscoveredModelsIntoCommitMessageConfig(
  config: SourceControlAiSettings,
  agentId: TuiAgent,
  models: CommitMessageModelCapability[],
  defaultModelId: string,
  hostKey = LOCAL_COMMIT_MESSAGE_HOST_KEY
): SourceControlAiSettings {
  const persisted = readSelectedModelId(config, hostKey, agentId)
  const nextModelId = models.some((model) => model.id === persisted) ? persisted : defaultModelId
  const selectedModelChoice =
    nextModelId && nextModelId !== persisted
      ? selectSourceControlAiModelChoiceForHost(
          {
            selectedModelByAgent: config.selectedModelByAgent,
            selectedModelByAgentByHost: config.selectedModelByAgentByHost
          },
          hostKey,
          agentId,
          nextModelId
        )
      : {
          selectedModelByAgent: config.selectedModelByAgent,
          selectedModelByAgentByHost: config.selectedModelByAgentByHost
        }
  const nextHostDiscoveredModels = {
    ...config.discoveredModelsByAgentByHost?.[hostKey],
    [agentId]: models
  }
  return {
    ...config,
    ...(hostKey === LOCAL_COMMIT_MESSAGE_HOST_KEY
      ? {
          discoveredModelsByAgent: {
            ...config.discoveredModelsByAgent,
            [agentId]: models
          },
          selectedModelByAgent:
            selectedModelChoice.selectedModelByAgent ?? config.selectedModelByAgent
        }
      : {}),
    discoveredModelsByAgentByHost: {
      ...config.discoveredModelsByAgentByHost,
      [hostKey]: nextHostDiscoveredModels
    },
    selectedModelByAgentByHost: selectedModelChoice.selectedModelByAgentByHost
  }
}

function selectModelForHost(
  config: SourceControlAiSettings,
  hostKey: string,
  agentId: TuiAgent,
  modelId: string
): Pick<SourceControlAiSettings, 'selectedModelByAgent' | 'selectedModelByAgentByHost'> {
  const choice = selectSourceControlAiModelChoiceForHost(
    {
      selectedModelByAgent: config.selectedModelByAgent,
      selectedModelByAgentByHost: config.selectedModelByAgentByHost
    },
    hostKey,
    agentId,
    modelId
  )
  return {
    selectedModelByAgent: choice.selectedModelByAgent ?? config.selectedModelByAgent,
    selectedModelByAgentByHost: choice.selectedModelByAgentByHost
  }
}

export function getCommitMessageSettingsPaneDiscoveryHostKey(
  settings: GlobalSettings,
  activeConnectionId: string | null | undefined,
  hasActiveWorktree: boolean
): string {
  const runtimeScope = hasActiveWorktree
    ? getRuntimeGitScope(settings, activeConnectionId)
    : activeConnectionId
  return getCommitMessageModelDiscoveryHostKeyForScope(runtimeScope)
}

export function CommitMessageAiPane({
  settings,
  updateSettings,
  writeSourceControlAiSettings,
  onCustomPromptDirtyChange,
  customPromptDiscardSignal
}: CommitMessageAiPaneProps): React.JSX.Element {
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const activeWorktree = useActiveWorktree()
  const activeConnectionId = getConnectionId(activeWorktree?.id ?? null)
  const discoveryHostKey = getCommitMessageSettingsPaneDiscoveryHostKey(
    settings,
    activeConnectionId,
    Boolean(activeWorktree?.id)
  )
  const config = readSettings(settings)
  const latestConfigRef = useRef(config)
  latestConfigRef.current = config
  const settingsWriteQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [modelDiscoveryByAgent, setModelDiscoveryByAgent] = useState<
    Partial<Record<TuiAgent, ModelDiscoveryState>>
  >({})
  const persistedCommitInstructions = config.instructionsByOperation.commitMessage ?? ''
  const persistedPullRequestInstructions = config.instructionsByOperation.pullRequest ?? ''
  const persistedInstructionDraftValues: CommitMessageInstructionDraftValues = {
    commitMessage: persistedCommitInstructions,
    pullRequest: persistedPullRequestInstructions
  }
  const [instructionDraftState, setInstructionDraftState] = useState(() =>
    createCommitMessageInstructionDraftState(
      persistedInstructionDraftValues,
      customPromptDiscardSignal
    )
  )
  const [isSavingInstructions, setIsSavingInstructions] = useState(false)
  const resolvedInstructionDraftState = resolveCommitMessageInstructionDraftState(
    instructionDraftState,
    persistedInstructionDraftValues,
    customPromptDiscardSignal
  )
  if (resolvedInstructionDraftState !== instructionDraftState) {
    // Why: prompt drafts should follow persisted settings only while clean,
    // and the parent discard signal must reset all unsaved instruction edits.
    setInstructionDraftState(resolvedInstructionDraftState)
  }
  const commitInstructionsDraft = resolvedInstructionDraftState.draft.commitMessage
  const pullRequestInstructionsDraft = resolvedInstructionDraftState.draft.pullRequest
  const updateInstructionDraft = (
    operation: CommitMessageInstructionOperation,
    value: string
  ): void => {
    setInstructionDraftState((current) => {
      const resolved = resolveCommitMessageInstructionDraftState(
        current,
        persistedInstructionDraftValues,
        customPromptDiscardSignal
      )
      return {
        ...resolved,
        draft: {
          ...resolved.draft,
          [operation]: value
        }
      }
    })
  }
  const isCommitInstructionsDirty = commitInstructionsDraft !== persistedCommitInstructions
  const isPullRequestInstructionsDirty =
    pullRequestInstructionsDraft !== persistedPullRequestInstructions
  const isCustomPromptDirty = isCommitInstructionsDirty || isPullRequestInstructionsDirty
  const commitPromptDraft = commitInstructionsDraft
  const pullRequestPromptDraft = pullRequestInstructionsDraft
  const isCommitPromptDirty = isCommitInstructionsDirty
  const isPullRequestPromptDirty = isPullRequestInstructionsDirty
  const isSavingPrompt = isSavingInstructions

  useEffect(() => {
    onCustomPromptDirtyChange?.(isCustomPromptDirty)
  }, [isCustomPromptDirty, onCustomPromptDirtyChange])

  const onCustomPromptDirtyChangeRef = useRef(onCustomPromptDirtyChange)
  onCustomPromptDirtyChangeRef.current = onCustomPromptDirtyChange
  const setPaneRootRef = useCallback((node: HTMLDivElement | null): void => {
    if (node !== null) {
      return
    }
    // Why: Settings owns the global unsaved-prompt guard; reset it when this
    // pane detaches without keeping a passive cleanup-only Effect.
    onCustomPromptDirtyChangeRef.current?.(false)
  }, [])

  const baseAgentCapabilities = useMemo(listCommitMessageAgentCapabilities, [])
  const agentCapabilities = useMemo(
    () =>
      baseAgentCapabilities.map((capability) => {
        const discovery = modelDiscoveryByAgent[capability.id]
        if (
          capability.modelSource !== 'dynamic' ||
          discovery?.status !== 'ready' ||
          discovery.hostKey !== discoveryHostKey
        ) {
          return capability
        }
        return {
          ...capability,
          models: discovery.models,
          defaultModelId: discovery.defaultModelId ?? capability.defaultModelId
        }
      }),
    [baseAgentCapabilities, discoveryHostKey, modelDiscoveryByAgent]
  )
  const resolvedAgentId = resolveCommitMessageAgentChoice(
    config.agentId,
    settings.defaultTuiAgent,
    settings.disabledTuiAgents
  )
  const unsupportedSelectedAgent =
    config.agentId &&
    !isCustomAgentId(config.agentId) &&
    !getCommitMessageAgentCapability(config.agentId)
      ? config.agentId
      : null
  const activeAgentSelectValue = unsupportedSelectedAgent
    ? UNCONFIGURED_AGENT_SELECT_VALUE
    : (resolvedAgentId ?? UNCONFIGURED_AGENT_SELECT_VALUE)
  const unsupportedDefaultAgent =
    resolvedAgentId === null &&
    !config.agentId &&
    settings.defaultTuiAgent &&
    settings.defaultTuiAgent !== 'blank'
      ? settings.defaultTuiAgent
      : null
  const unsupportedDefaultAgentLabel = unsupportedDefaultAgent
    ? (AGENT_CATALOG.find((a) => a.id === unsupportedDefaultAgent)?.label ??
      unsupportedDefaultAgent)
    : null
  const unsupportedSelectedAgentIsComingSoon = COMING_SOON_COMMIT_MESSAGE_AGENTS.some(
    (agent) => agent.id === unsupportedSelectedAgent
  )
  const unsupportedSelectedAgentLabel = unsupportedSelectedAgent
    ? (COMING_SOON_COMMIT_MESSAGE_AGENTS.find((a) => a.id === unsupportedSelectedAgent)?.label ??
      AGENT_CATALOG.find((a) => a.id === unsupportedSelectedAgent)?.label ??
      unsupportedSelectedAgent)
    : null
  const isCustom = isCustomAgentId(resolvedAgentId)
  const activeAgentId = resolvedAgentId && !isCustom ? resolvedAgentId : null
  const activeCapability = activeAgentId
    ? (agentCapabilities.find((capability) => capability.id === activeAgentId) ??
      getCommitMessageAgentCapability(activeAgentId))
    : undefined
  const activeModel = activeCapability
    ? resolveSelectedModel(config, activeCapability, discoveryHostKey)
    : null
  const activeThinking = activeModel ? resolveSelectedThinking(config, activeModel) : undefined
  const rawActiveDiscovery = activeAgentId ? modelDiscoveryByAgent[activeAgentId] : undefined
  const activeDiscovery =
    rawActiveDiscovery?.hostKey === discoveryHostKey ? rawActiveDiscovery : undefined

  const localWriteConfig = (patch: SourceControlAiSettingsPatch): Promise<void> => {
    const next = settingsWriteQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const latestSettings = useAppStore.getState().settings
        const latestConfig = latestSettings ? readSettings(latestSettings) : latestConfigRef.current
        const resolvedPatch = typeof patch === 'function' ? patch(latestConfig) : patch
        await updateSettings({ sourceControlAi: { ...latestConfig, ...resolvedPatch } })
      })
    settingsWriteQueueRef.current = next
    return next
  }
  const writeConfig = writeSourceControlAiSettings ?? localWriteConfig

  const refreshModels = async (agentId: TuiAgent): Promise<void> => {
    const capability =
      agentCapabilities.find((candidate) => candidate.id === agentId) ??
      getCommitMessageAgentCapability(agentId)
    if (!capability || capability.modelSource !== 'dynamic') {
      return
    }
    setModelDiscoveryByAgent((prev) => ({
      ...prev,
      [agentId]: {
        status: 'loading',
        hostKey: discoveryHostKey,
        models:
          prev[agentId]?.hostKey === discoveryHostKey
            ? (prev[agentId]?.models ?? capability.models)
            : capability.models
      }
    }))
    try {
      const result = await discoverRuntimeCommitMessageModels(
        {
          settings,
          worktreeId: activeWorktree?.id,
          worktreePath: activeWorktree?.path ?? '',
          connectionId: activeConnectionId ?? undefined
        },
        agentId
      )
      if (!result.success) {
        setModelDiscoveryByAgent((prev) => ({
          ...prev,
          [agentId]: {
            status: 'error',
            hostKey: discoveryHostKey,
            models:
              prev[agentId]?.hostKey === discoveryHostKey
                ? (prev[agentId]?.models ?? capability.models)
                : capability.models,
            error: result.error
          }
        }))
        return
      }
      setModelDiscoveryByAgent((prev) => ({
        ...prev,
        [agentId]: {
          status: 'ready',
          hostKey: discoveryHostKey,
          models: result.models,
          defaultModelId: result.defaultModelId
        }
      }))
      writeConfig((current) =>
        mergeDiscoveredModelsIntoCommitMessageConfig(
          current,
          agentId,
          result.models,
          result.defaultModelId,
          discoveryHostKey
        )
      )
    } catch (error) {
      setModelDiscoveryByAgent((prev) => ({
        ...prev,
        [agentId]: {
          status: 'error',
          hostKey: discoveryHostKey,
          models:
            prev[agentId]?.hostKey === discoveryHostKey
              ? (prev[agentId]?.models ?? capability.models)
              : capability.models,
          error: error instanceof Error ? error.message : '모델을 찾지 못했습니다'
        }
      }))
    }
  }

  useEffect(() => {
    if (
      !config.enabled ||
      isCustom ||
      !activeCapability ||
      activeCapability.modelSource !== 'dynamic'
    ) {
      return
    }
    const discovery = modelDiscoveryByAgent[activeCapability.id]
    if (
      discovery?.hostKey === discoveryHostKey &&
      (discovery.status === 'loading' || discovery.status === 'ready')
    ) {
      return
    }
    void refreshModels(activeCapability.id)
    // Why: auto-refresh should run once when a dynamic agent becomes active.
    // Including the discovery map would retry immediately after an error and
    // turn a visible CLI failure into a request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeCapability?.id,
    activeCapability?.modelSource,
    config.enabled,
    discoveryHostKey,
    isCustom
  ])

  const onToggleEnabled = (): void => {
    const next = !config.enabled
    if (!next) {
      writeConfig({ enabled: false })
      return
    }
    // Why: when the user enables the feature for the first time, hydrate the
    // agent / model / thinking choices from their default agent when possible
    // so Generate works without maintaining a second agent preference. If the
    // user previously persisted 'custom', keep it and let them re-edit the
    // command — no implicit reset to a preset.
    const defaultTuiAgent = settings.defaultTuiAgent
    const seedAgentId = resolveCommitMessageAgentChoice(
      config.agentId,
      defaultTuiAgent,
      settings.disabledTuiAgents
    )
    if (!seedAgentId) {
      writeConfig({ enabled: true, agentId: null })
      return
    }
    writeConfig((current) => {
      const currentSeedAgentId = resolveCommitMessageAgentChoice(
        current.agentId,
        defaultTuiAgent,
        settings.disabledTuiAgents
      )
      const agentId = currentSeedAgentId ?? seedAgentId
      const currentCapability = isCustomAgentId(agentId)
        ? undefined
        : getCommitMessageAgentCapability(agentId)
      const seedModel = currentCapability
        ? resolveSelectedModel(current, currentCapability, discoveryHostKey)
        : null
      const seedThinking = seedModel ? resolveSelectedThinking(current, seedModel) : undefined
      const selectedModelPatch = currentCapability
        ? selectModelForHost(
            current,
            discoveryHostKey,
            currentCapability.id,
            readSelectedModelId(current, discoveryHostKey, currentCapability.id) ??
              currentCapability.defaultModelId
          )
        : {
            selectedModelByAgent: current.selectedModelByAgent,
            selectedModelByAgentByHost: current.selectedModelByAgentByHost
          }
      const nextSelectedThinkingByModel = { ...current.selectedThinkingByModel }
      if (seedModel && seedThinking && !nextSelectedThinkingByModel[seedModel.id]) {
        nextSelectedThinkingByModel[seedModel.id] = seedThinking
      }
      return {
        enabled: true,
        agentId,
        ...selectedModelPatch,
        selectedThinkingByModel: nextSelectedThinkingByModel
      }
    })
    useAppStore.getState().recordFeatureInteraction('ai-commit-generation')
  }

  const onAgentChange = (newAgentId: string): void => {
    if (newAgentId === UNCONFIGURED_AGENT_SELECT_VALUE) {
      return
    }
    if (isCustomAgentId(newAgentId)) {
      writeConfig({ agentId: CUSTOM_AGENT_ID })
      return
    }
    const capability = getCommitMessageAgentCapability(newAgentId as TuiAgent)
    if (!capability) {
      return
    }
    writeConfig((current) => {
      const selectedModelPatch = selectModelForHost(
        current,
        discoveryHostKey,
        capability.id,
        readSelectedModelId(current, discoveryHostKey, capability.id) ?? capability.defaultModelId
      )
      const newModel = resolveSelectedModel(
        { ...current, ...selectedModelPatch, agentId: capability.id },
        capability,
        discoveryHostKey
      )
      const nextSelectedThinkingByModel = { ...current.selectedThinkingByModel }
      if (
        newModel.thinkingLevels &&
        newModel.defaultThinkingLevel &&
        !nextSelectedThinkingByModel[newModel.id]
      ) {
        nextSelectedThinkingByModel[newModel.id] = newModel.defaultThinkingLevel
      }
      return {
        agentId: capability.id,
        ...selectedModelPatch,
        selectedThinkingByModel: nextSelectedThinkingByModel
      }
    })
  }

  const onCustomCommandChange = (value: string): void => {
    writeConfig({ customAgentCommand: value })
  }

  const onModelChange = (newModelId: string): void => {
    if (!activeCapability) {
      return
    }
    const model = activeCapability.models.find((m) => m.id === newModelId)
    if (!model) {
      return
    }
    writeConfig((current) => {
      const selectedModelPatch = selectModelForHost(
        current,
        discoveryHostKey,
        activeCapability.id,
        model.id
      )
      const nextSelectedThinkingByModel = { ...current.selectedThinkingByModel }
      if (
        model.thinkingLevels &&
        model.defaultThinkingLevel &&
        !nextSelectedThinkingByModel[model.id]
      ) {
        nextSelectedThinkingByModel[model.id] = model.defaultThinkingLevel
      }
      return {
        ...selectedModelPatch,
        selectedThinkingByModel: nextSelectedThinkingByModel
      }
    })
  }

  const onThinkingChange = (newLevelId: string): void => {
    if (!activeModel) {
      return
    }
    writeConfig((current) => ({
      selectedThinkingByModel: {
        ...current.selectedThinkingByModel,
        [activeModel.id]: newLevelId
      }
    }))
  }

  const readOperationOverrideModelId = (
    operation: SourceControlAiOperation
  ): string | undefined => {
    if (!activeCapability) {
      return undefined
    }
    const choice = config.modelOverridesByOperation?.[operation]
    return readSourceControlAiModelChoiceForHost(choice, discoveryHostKey, activeCapability.id)
  }

  const onOperationModelChange = (
    operation: SourceControlAiOperation,
    newModelId: string
  ): void => {
    if (!activeCapability) {
      return
    }
    if (newModelId === INHERIT_MODEL_SELECT_VALUE) {
      writeConfig((current) => {
        const latestOverrides = { ...current.modelOverridesByOperation }
        const nextChoice = clearSourceControlAiModelChoiceForHost(
          latestOverrides[operation],
          discoveryHostKey,
          activeCapability.id
        )
        if (nextChoice) {
          latestOverrides[operation] = nextChoice
        } else {
          delete latestOverrides[operation]
        }
        return { modelOverridesByOperation: latestOverrides }
      })
      return
    }
    const model = activeCapability.models.find((candidate) => candidate.id === newModelId)
    if (!model) {
      return
    }
    writeConfig((current) => {
      const currentChoice = current.modelOverridesByOperation?.[operation]
      const nextChoice = selectSourceControlAiModelChoiceForHost(
        currentChoice,
        discoveryHostKey,
        activeCapability.id,
        model.id
      )
      if (
        model.thinkingLevels &&
        model.defaultThinkingLevel &&
        !nextChoice.selectedThinkingByModel?.[model.id]
      ) {
        nextChoice.selectedThinkingByModel = {
          ...nextChoice.selectedThinkingByModel,
          [model.id]: model.defaultThinkingLevel
        }
      }
      return {
        modelOverridesByOperation: {
          ...current.modelOverridesByOperation,
          [operation]: nextChoice
        }
      }
    })
  }

  const onOperationThinkingChange = (
    operation: SourceControlAiOperation,
    modelId: string,
    newLevelId: string
  ): void => {
    writeConfig((current) => ({
      modelOverridesByOperation: {
        ...current.modelOverridesByOperation,
        [operation]: {
          ...current.modelOverridesByOperation?.[operation],
          selectedThinkingByModel: {
            ...current.modelOverridesByOperation?.[operation]?.selectedThinkingByModel,
            [modelId]: newLevelId
          }
        }
      }
    }))
  }

  const onSavePrompt = async (operation: CommitMessageInstructionOperation): Promise<void> => {
    const draft = resolvedInstructionDraftState.draft[operation]
    const dirty =
      operation === 'commitMessage' ? isCommitInstructionsDirty : isPullRequestInstructionsDirty
    if (!dirty || isSavingInstructions) {
      return
    }
    setIsSavingInstructions(true)
    try {
      await writeConfig((current) => ({
        instructionsByOperation: {
          ...current.instructionsByOperation,
          [operation]: draft
        }
      }))
    } finally {
      setIsSavingInstructions(false)
    }
  }

  const onDiscardPrompt = (operation: CommitMessageInstructionOperation): void => {
    setInstructionDraftState((current) => {
      const resolved = resolveCommitMessageInstructionDraftState(
        current,
        persistedInstructionDraftValues,
        customPromptDiscardSignal
      )
      return {
        ...resolved,
        draft: {
          ...resolved.draft,
          [operation]: resolved.source[operation]
        }
      }
    })
  }

  const onPrDefaultChange = (
    key: keyof NonNullable<SourceControlAiSettings['prCreationDefaults']>,
    value: boolean
  ): void => {
    writeConfig((current) => ({
      prCreationDefaults: {
        ...current.prCreationDefaults,
        [key]: value
      }
    }))
  }

  const sections: React.ReactNode[] = []

  if (
    matchesSettingsSearch(searchQuery, {
      title: '소스 컨트롤 AI 사용',
      description: '소스 컨트롤의 커밋, 풀 리퀘스트, 브랜치 이름 흐름에 AI 생성을 추가합니다.',
      keywords: ['ai', 'commit', 'message', 'generate', 'agent', 'enabled']
    })
  ) {
    sections.push(
      <SearchableSetting
        key="enabled"
        title="소스 컨트롤 AI 사용"
        description="소스 컨트롤의 커밋, 풀 리퀘스트, 브랜치 이름 흐름에 AI 생성을 추가합니다."
        keywords={['ai', 'commit', 'message', 'generate', 'agent', 'enabled']}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>소스 컨트롤 AI 사용</Label>
          <p className="text-xs text-muted-foreground">
            커밋 메시지와 풀 리퀘스트 세부 정보에 생성 버튼을 추가합니다. 워크트리가 있는 위치에서
            선택한 에이전트 CLI를 실행합니다.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={config.enabled}
          onClick={onToggleEnabled}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            config.enabled ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              config.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </SearchableSetting>
    )
  }

  if (
    config.enabled &&
    matchesSettingsSearch(searchQuery, {
      title: '에이전트',
      description: '소스 컨트롤 텍스트 생성을 위해 호출할 에이전트입니다.',
      keywords: ['agent', 'claude', 'codex', 'opencode', 'gemini', 'cursor']
    })
  ) {
    sections.push(
      <SearchableSetting
        key="agent"
        title="에이전트"
        description="소스 컨트롤 텍스트 생성을 위해 호출할 에이전트입니다."
        keywords={['agent', 'claude', 'codex', 'opencode', 'gemini', 'cursor']}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>에이전트</Label>
          <p className="text-xs text-muted-foreground">
            Korca는 이 CLI를 백그라운드에서 실행해 커밋 메시지와 풀 리퀘스트 세부 정보를 생성합니다.
            워크트리가 있는 위치에 설치되어 있어야 합니다. 로컬 워크트리는 내 컴퓨터, 원격
            워크트리는 SSH 호스트여야 합니다.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Select value={activeAgentSelectValue} onValueChange={onAgentChange}>
            <SelectTrigger size="sm" className="h-8 w-[260px] shrink-0 text-xs">
              <SelectValue placeholder="미설정" />
            </SelectTrigger>
            <SelectContent>
              {agentCapabilities.map((capability) => {
                const id = capability.id
                return (
                  <SelectItem key={id} value={id} className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <AgentIcon agent={id} size={14} />
                      <span>{agentLabel(id, capability)}</span>
                    </span>
                  </SelectItem>
                )
              })}
              {COMING_SOON_COMMIT_MESSAGE_AGENTS.filter(
                (agent) => !agentCapabilities.some((capability) => capability.id === agent.id)
              ).map((agent) => (
                <SelectItem key={agent.id} value={agent.id} disabled className="cursor-not-allowed">
                  <span className="flex items-center gap-2">
                    <AgentIcon agent={agent.id} size={14} />
                    <span>{agent.label}</span>
                    <span className="text-[11px] text-muted-foreground">출시 예정</span>
                  </span>
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_AGENT_ID} className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <Terminal className="size-3.5" />
                  <span>사용자 지정</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {unsupportedDefaultAgentLabel ? (
            <p className="max-w-[260px] text-right text-[11px] text-muted-foreground">
              기본 에이전트가 {unsupportedDefaultAgentLabel}이며, 아직 소스 컨트롤 AI를 지원하지
              않습니다. 지원되는 에이전트나 사용자 지정을 선택하세요.
            </p>
          ) : null}
          {unsupportedSelectedAgentLabel ? (
            <p className="max-w-[260px] text-right text-[11px] text-muted-foreground">
              {unsupportedSelectedAgentIsComingSoon
                ? `${unsupportedSelectedAgentLabel}의 소스 컨트롤 AI는 곧 지원됩니다.`
                : `${unsupportedSelectedAgentLabel}은 아직 소스 컨트롤 AI를 지원하지 않습니다.`}{' '}
              지원되는 에이전트나 사용자 지정을 선택하세요.
            </p>
          ) : null}
        </div>
      </SearchableSetting>
    )
  }

  if (
    config.enabled &&
    isCustom &&
    matchesSettingsSearch(searchQuery, {
      title: '사용자 지정 명령',
      description: '소스 컨트롤 텍스트 생성을 위해 Korca가 실행하는 명령행입니다.',
      keywords: ['custom', 'command', 'cli', 'binary', 'prompt', 'placeholder']
    })
  ) {
    sections.push(
      <SearchableSetting
        key="custom-command"
        title="사용자 지정 명령"
        description="소스 컨트롤 텍스트 생성을 위해 Korca가 실행하는 명령행입니다."
        keywords={['custom', 'command', 'cli', 'binary', 'prompt', 'placeholder']}
        className="space-y-2 py-2"
      >
        <div className="space-y-0.5">
          <Label htmlFor="commit-message-ai-custom-command">사용자 지정 명령</Label>
          <p className="text-xs text-muted-foreground">
            프롬프트를 대체할 위치에{' '}
            <code className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">
              {CUSTOM_PROMPT_PLACEHOLDER}
            </code>
            를 사용하세요. 프롬프트는 하나의 인자로 전달됩니다. 이 값을 빼면 프롬프트는 stdin으로
            전달됩니다.{' '}
            <code className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">claude -p</code> 같은
            CLI에 유용합니다. 따옴표는 인자 묶기 용도일 뿐이며, 셸을 실행하지 않으므로{' '}
            <code className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">$VAR</code>와 백틱은
            확장되지 않습니다.
          </p>
        </div>
        <input
          id="commit-message-ai-custom-command"
          type="text"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          value={config.customAgentCommand}
          onChange={(e) => onCustomCommandChange(e.target.value)}
          placeholder={`e.g. ollama run llama3.1 ${CUSTOM_PROMPT_PLACEHOLDER}`}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </SearchableSetting>
    )
  }

  if (
    config.enabled &&
    activeCapability &&
    activeModel &&
    matchesSettingsSearch(searchQuery, {
      title: '기본 모델',
      description: '작업별 재정의가 없을 때 소스 컨트롤 AI가 사용하는 모델입니다.',
      keywords: ['model', 'haiku', 'sonnet', 'opus', 'gpt']
    })
  ) {
    sections.push(
      <SearchableSetting
        key="model"
        title="기본 모델"
        description="작업별 재정의가 없을 때 소스 컨트롤 AI가 사용하는 모델입니다."
        keywords={['model', 'haiku', 'sonnet', 'opus', 'gpt']}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>기본 모델</Label>
          <p className="text-xs text-muted-foreground">
            {activeCapability.modelSource === 'dynamic'
              ? '선택한 CLI가 모델 탐색을 지원하면 그 목록을 새로고침합니다.'
              : '이 에이전트는 모델 탐색을 제공하지 않으므로 Korca는 수동 카탈로그를 사용합니다.'}
          </p>
          {activeDiscovery?.status === 'error' && (
            <p className="text-xs text-destructive">{activeDiscovery.error}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCapability.modelSource === 'dynamic' && (
            <button
              type="button"
              onClick={() => void refreshModels(activeCapability.id)}
              disabled={activeDiscovery?.status === 'loading'}
              title="모델 새로고침"
              aria-label="모델 새로고침"
              className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${activeDiscovery?.status === 'loading' ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          <Select value={activeModel.id} onValueChange={onModelChange}>
            <SelectTrigger size="sm" className="h-8 w-[260px] shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeCapability.models.map((m) => (
                <SelectItem key={m.id} value={m.id} className="cursor-pointer">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SearchableSetting>
    )
  }

  if (
    config.enabled &&
    activeModel?.thinkingLevels &&
    activeThinking &&
    matchesSettingsSearch(searchQuery, {
      title: '추론 강도',
      description: '선택한 모델의 추론 강도입니다. 값이 높을수록 느립니다.',
      keywords: ['thinking', 'effort', 'reasoning']
    })
  ) {
    sections.push(
      <SearchableSetting
        key="thinking"
        title="추론 강도"
        description="선택한 모델의 추론 강도입니다. 값이 높을수록 느립니다."
        keywords={['thinking', 'effort', 'reasoning']}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>추론 강도</Label>
          <p className="text-xs text-muted-foreground">
            강도가 높을수록 더 신중한 결과를 얻지만 시간이 더 걸리고 토큰도 더 사용합니다.
          </p>
        </div>
        <Select value={activeThinking} onValueChange={onThinkingChange}>
          <SelectTrigger size="sm" className="h-8 text-xs w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activeModel.thinkingLevels.map((level) => (
              <SelectItem key={level.id} value={level.id} className="cursor-pointer">
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SearchableSetting>
    )
  }

  if (
    config.enabled &&
    activeCapability &&
    activeModel &&
    matchesSettingsSearch(searchQuery, {
      title: '고급 모델 재정의',
      description: '커밋 메시지와 PR 세부 정보에 대해 작업별로 다른 모델을 선택할 수 있습니다.',
      keywords: ['모델', '재정의', '커밋', '풀 리퀘스트', 'PR', '추론']
    })
  ) {
    const operationRows: {
      operation: SourceControlAiOperation
      label: string
      description: string
    }[] = [
      {
        operation: 'commitMessage',
        label: '커밋 메시지 모델',
        description: '커밋 메시지 생성에 다른 모델을 사용합니다.'
      },
      {
        operation: 'pullRequest',
        label: 'PR 세부 정보 모델',
        description: '풀 리퀘스트 제목과 설명 생성에 다른 모델을 사용합니다.'
      }
    ]
    sections.push(
      <SearchableSetting
        key="model-overrides"
        title="고급 모델 재정의"
        description="커밋 메시지와 PR 세부 정보에 대해 작업별로 다른 모델을 선택할 수 있습니다."
        keywords={['모델', '재정의', '커밋', '풀 리퀘스트', 'PR', '추론']}
        className="space-y-3 px-1 py-2"
      >
        <div className="space-y-0.5">
          <Label>고급 모델 재정의</Label>
          <p className="text-xs text-muted-foreground">
            커밋 메시지나 PR 세부 정보에 다른 모델 동작이 필요할 때만 변경하세요.
          </p>
        </div>
        <div className="space-y-3">
          {operationRows.map((row) => {
            const overrideModelId = readOperationOverrideModelId(row.operation)
            const selectedModel = overrideModelId
              ? activeCapability.models.find((model) => model.id === overrideModelId)
              : undefined
            const selectedThinking = selectedModel?.thinkingLevels?.some(
              (level) =>
                level.id ===
                config.modelOverridesByOperation?.[row.operation]?.selectedThinkingByModel?.[
                  selectedModel.id
                ]
            )
              ? config.modelOverridesByOperation?.[row.operation]?.selectedThinkingByModel?.[
                  selectedModel.id
                ]
              : selectedModel?.defaultThinkingLevel
            return (
              <div
                key={row.operation}
                className="space-y-2 rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">{row.description}</p>
                  </div>
                  <Select
                    value={overrideModelId ?? INHERIT_MODEL_SELECT_VALUE}
                    onValueChange={(value) => onOperationModelChange(row.operation, value)}
                  >
                    <SelectTrigger size="sm" className="h-8 w-[220px] shrink-0 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={INHERIT_MODEL_SELECT_VALUE} className="cursor-pointer">
                        기본 모델 사용
                      </SelectItem>
                      {activeCapability.models.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="cursor-pointer">
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
                        onOperationThinkingChange(row.operation, selectedModel.id, value)
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModel.thinkingLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id} className="cursor-pointer">
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
      </SearchableSetting>
    )
  }

  if (
    (config.enabled || isCommitPromptDirty) &&
    (isCommitPromptDirty ||
      matchesSettingsSearch(searchQuery, {
        title: '커밋 메시지 프롬프트',
        description: '커밋 메시지를 생성할 때만 추가되는 프롬프트 텍스트입니다.',
        keywords: ['프롬프트', 'Conventional Commits', 'gitmoji', '스타일']
      }))
  ) {
    sections.push(
      <SearchableSetting
        key="commit-prompt"
        title="커밋 메시지 프롬프트"
        description="커밋 메시지를 생성할 때만 추가되는 프롬프트 텍스트입니다."
        keywords={['프롬프트', 'Conventional Commits', 'gitmoji', '스타일']}
        forceVisible={isCommitPromptDirty}
        className="space-y-2 px-1 py-2"
      >
        <div className="space-y-0.5">
          <Label htmlFor="source-control-ai-commit-prompt">커밋 메시지 프롬프트</Label>
          <p className="text-xs text-muted-foreground">
            이 프롬프트는 커밋 메시지를 생성할 때만 추가됩니다. Conventional Commits, 티켓 접두사,
            팀이 선호하는 다른 커밋 스타일에 사용할 수 있습니다.
          </p>
        </div>
        <textarea
          id="source-control-ai-commit-prompt"
          rows={4}
          value={commitPromptDraft}
          onChange={(e) => updateInstructionDraft('commitMessage', e.target.value)}
          placeholder="Conventional Commits 형식(feat:, fix:, ...)을 사용하세요. 있으면 티켓 키를 적으세요."
          className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {isCommitPromptDirty ? '저장되지 않은 변경 사항' : '저장됨'}
          </p>
          <div className="flex items-center gap-2">
            {isCommitPromptDirty ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onDiscardPrompt('commitMessage')}
                disabled={isSavingPrompt}
              >
                변경 취소
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => void onSavePrompt('commitMessage')}
              disabled={!isCommitPromptDirty || isSavingPrompt}
            >
              {isSavingPrompt ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </SearchableSetting>
    )
  }

  if (
    (config.enabled || isPullRequestPromptDirty) &&
    (isPullRequestPromptDirty ||
      matchesSettingsSearch(searchQuery, {
        title: '풀 리퀘스트 프롬프트',
        description: '풀 리퀘스트 세부 정보를 생성할 때만 추가되는 프롬프트 텍스트입니다.',
        keywords: ['프롬프트', '풀 리퀘스트', 'PR', '설명', '템플릿']
      }))
  ) {
    sections.push(
      <SearchableSetting
        key="pull-request-prompt"
        title="풀 리퀘스트 프롬프트"
        description="풀 리퀘스트 세부 정보를 생성할 때만 추가되는 프롬프트 텍스트입니다."
        keywords={['프롬프트', '풀 리퀘스트', 'PR', '설명', '템플릿']}
        forceVisible={isPullRequestPromptDirty}
        className="space-y-2 px-1 py-2"
      >
        <div className="space-y-0.5">
          <Label htmlFor="source-control-ai-pr-prompt">풀 리퀘스트 프롬프트</Label>
          <p className="text-xs text-muted-foreground">
            이 프롬프트는 풀 리퀘스트 제목, 설명, 초안 상태, 기준 브랜치 제안을 생성할 때만
            추가됩니다. 커밋 메시지에는 영향을 주지 않습니다.
          </p>
        </div>
        <textarea
          id="source-control-ai-pr-prompt"
          rows={4}
          value={pullRequestPromptDraft}
          onChange={(e) => updateInstructionDraft('pullRequest', e.target.value)}
          placeholder="사용자에게 보이는 변경 사항을 먼저 요약하고, 검토자 메모와 테스트 증거를 적으세요."
          className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {isPullRequestPromptDirty ? '저장되지 않은 변경 사항' : '저장됨'}
          </p>
          <div className="flex items-center gap-2">
            {isPullRequestPromptDirty ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onDiscardPrompt('pullRequest')}
                disabled={isSavingPrompt}
              >
                변경 취소
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => void onSavePrompt('pullRequest')}
              disabled={!isPullRequestPromptDirty || isSavingPrompt}
            >
              {isSavingPrompt ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </SearchableSetting>
    )
  }

  if (
    config.enabled &&
    matchesSettingsSearch(searchQuery, {
      title: 'PR 생성 기본값',
      description: 'PR 작성 화면이 열릴 때 적용되는 기본값입니다.',
      keywords: ['풀 리퀘스트', 'PR', '초안', '템플릿', '생성', '열기']
    })
  ) {
    const prDefaults = config.prCreationDefaults ?? {}
    const rows: {
      key: keyof NonNullable<SourceControlAiSettings['prCreationDefaults']>
      label: string
      description: string
    }[] = [
      {
        key: 'draft',
        label: '기본으로 초안',
        description: '새 풀 리퀘스트를 초안으로 시작합니다.'
      },
      {
        key: 'useTemplate',
        label: '사용 가능할 때 PR 템플릿 사용',
        description: '설명이 없을 때 저장소의 풀 리퀘스트 템플릿을 우선 사용합니다.'
      },
      {
        key: 'generateDetailsOnOpen',
        label: 'PR 열 때 세부 정보 생성',
        description: '작성 화면이 열릴 때 한 번 풀 리퀘스트 세부 정보를 생성합니다.'
      },
      {
        key: 'openAfterCreate',
        label: '생성 후 PR 열기',
        description: '제출 후 생성된 호스티드 리뷰를 브라우저에서 엽니다.'
      }
    ]
    sections.push(
      <SearchableSetting
        key="pr-creation-defaults"
        title="PR 생성 기본값"
        description="PR 작성 화면이 열릴 때 적용되는 기본값입니다."
        keywords={['풀 리퀘스트', 'PR', '초안', '템플릿', '생성', '열기']}
        className="space-y-3 px-1 py-2"
      >
        <div className="space-y-0.5">
          <Label>PR 생성 기본값</Label>
          <p className="text-xs text-muted-foreground">
            제공자에 관계없는 PR 작성 화면의 기본값입니다. 저장소 설정에서 각 항목을 개별로 덮어쓸
            수 있습니다.
          </p>
        </div>
        <div className="space-y-2">
          {rows.map((row) => {
            const checked = prDefaults[row.key] === true
            return (
              <label
                key={row.key}
                className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2"
              >
                <span className="space-y-0.5">
                  <span className="block text-xs font-medium text-foreground">{row.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{row.description}</span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onPrDefaultChange(row.key, event.target.checked)}
                  className="mt-0.5 size-4 rounded border-border accent-primary"
                />
              </label>
            )
          })}
        </div>
      </SearchableSetting>
    )
  }

  if (sections.length === 0) {
    return <div className="space-y-4" />
  }
  // Why: this pane lives nested inside the Git section, so we draw an explicit
  // sub-heading + top border to keep its toggles visually distinct from the
  // Branch Prefix / Refresh Local Base Ref / Korca Attribution rows above.
  return (
    <div
      ref={setPaneRootRef}
      id="source-control-ai-settings"
      data-settings-section="source-control-ai-settings"
      className="space-y-4 border-t border-border/40 pt-4"
    >
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">소스 컨트롤 AI</h3>
        <p className="text-xs text-muted-foreground">
          하나의 백그라운드 에이전트 CLI로 커밋 메시지와 풀 리퀘스트 세부 정보를 생성합니다.
        </p>
      </div>
      {sections}
    </div>
  )
}
