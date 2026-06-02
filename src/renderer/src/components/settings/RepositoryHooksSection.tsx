/* oxlint-disable react-doctor/no-adjust-state-on-prop-change -- pre-existing pattern, predates this rule */
/* eslint-disable max-lines -- Why: the script editor, advanced/Command Source disclosure, issue-command override, and YAML state surfaces share tightly coupled state and persistence; splitting them across files would scatter prop drilling. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  HookCommandSourcePolicy,
  KorcaHooks,
  Repo,
  RepoHookSettings,
  SetupRunPolicy
} from '../../../../shared/types'
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { SearchableSetting } from './SearchableSetting'
import { useAppStore } from '@/store'
import { readRuntimeIssueCommand, writeRuntimeIssueCommand } from '@/runtime/runtime-hooks-client'
import { DEFAULT_REPO_HOOK_SETTINGS } from './SettingsConstants'
import { resolveHookCommandSourcePolicy } from '../../../../shared/hook-command-source-policy'
import { getRepositoryLocalCommandsSectionId } from './repository-settings-targets'
import { matchesSettingsSearch } from './settings-search'

type RepositoryHooksSectionProps = {
  repo: Repo
  yamlHooks: KorcaHooks | null
  hasHooksFile: boolean
  hooksInspectionReady: boolean
  mayNeedUpdate: boolean
  copiedTemplate: boolean
  forceVisible?: boolean
  onCopyTemplate: () => void
  onUpdateHookSettings: (settings: RepoHookSettings) => void
}

type PolicyOption<P> = { policy: P; label: string; description: string }
const LOCAL_HOOK_NAMES = ['setup', 'archive'] as const
type LocalHookName = (typeof LOCAL_HOOK_NAMES)[number]
type HookSettingsPolicyDraft = Partial<
  Pick<RepoHookSettings, 'setupRunPolicy' | 'commandSourcePolicy'>
>

const SETUP_RUN_POLICY_OPTIONS: PolicyOption<SetupRunPolicy>[] = [
  { policy: 'ask', label: '매번 묻기', description: '설정을 실행하기 전에 묻습니다.' },
  { policy: 'run-by-default', label: '기본으로 실행', description: '설정을 자동으로 실행합니다.' },
  {
    policy: 'skip-by-default',
    label: '기본으로 건너뛰기',
    description: '선택했을 때만 설정을 실행합니다.'
  }
]

const COMMAND_SOURCE_POLICY_OPTIONS: PolicyOption<HookCommandSourcePolicy>[] = [
  {
    policy: 'shared-only',
    label: 'korca.yaml만',
    description: '커밋된 저장소 명령만 실행하고 로컬 명령은 무시합니다.'
  },
  {
    policy: 'local-only',
    label: '로컬만',
    description: 'korca.yaml를 무시하고 로컬 명령만 실행합니다.'
  },
  {
    policy: 'run-both',
    label: '둘 다 실행',
    description: 'korca.yaml를 먼저 실행한 뒤 로컬 명령을 실행합니다.'
  }
]

const COMMAND_SOURCE_LABEL: Record<HookCommandSourcePolicy, string> = {
  'shared-only': 'korca.yaml만',
  'local-only': '로컬만',
  'run-both': '둘 다 실행'
}

type LocalHookField = {
  name: LocalHookName
  label: string
  description: string
  placeholder: string
}

const LOCAL_HOOK_FIELDS: LocalHookField[] = [
  {
    name: 'setup',
    label: '설정 스크립트',
    description:
      '새 워크트리가 만들어진 뒤 실행됩니다. 의존성을 설치하고, 환경 파일을 복사하고, 마이그레이션을 실행합니다.',
    placeholder: '# e.g.\npnpm install\ncp "$KORCA_ROOT_PATH/.env" "$KORCA_WORKTREE_PATH/.env"'
  },
  {
    name: 'archive',
    label: '보관 스크립트',
    description: '워크트리를 보관하거나 제거하기 전에 실행됩니다.',
    placeholder: '# e.g.\necho "Cleaning up $KORCA_WORKSPACE_NAME"'
  }
]

const ENV_VARS: readonly { name: string; description: string }[] = [
  {
    name: '$KORCA_ROOT_PATH',
    description:
      '기본 저장소 체크아웃 경로입니다. .env 같은 공유 파일을 워크트리로 복사할 때 유용합니다.'
  },
  {
    name: '$KORCA_WORKTREE_PATH',
    description: '만들고 있는 워크트리의 경로입니다. 설정 명령은 이 디렉터리에서 실행됩니다.'
  },
  {
    name: '$KORCA_WORKSPACE_NAME',
    description: '작업 공간 이름입니다. 보통 브랜치 이름을 바탕으로 합니다.'
  }
]

const EXAMPLE_TEMPLATE = `scripts:
  setup: |
    pnpm worktree:setup
  archive: |
    echo "Cleaning up before archive"
issueCommand: |
  Complete {{artifact_url}}`

function getHookSettingsDraft(hookSettings: Repo['hookSettings']): RepoHookSettings {
  return {
    ...DEFAULT_REPO_HOOK_SETTINGS,
    ...hookSettings,
    scripts: {
      ...DEFAULT_REPO_HOOK_SETTINGS.scripts,
      ...hookSettings?.scripts
    }
  }
}

function areHookSettingsDraftsEqual(a: RepoHookSettings, b: RepoHookSettings): boolean {
  return (
    a.mode === b.mode &&
    a.setupRunPolicy === b.setupRunPolicy &&
    a.commandSourcePolicy === b.commandSourcePolicy &&
    a.scripts.setup === b.scripts.setup &&
    a.scripts.archive === b.scripts.archive
  )
}

export type LocalCommandSourcePolicyNotice =
  | { kind: 'checking' }
  | { kind: 'action'; policy: 'local-only' | 'run-both'; label: string }

export function getLocalCommandSourcePolicyNotice({
  hooksInspectionReady,
  currentPolicy,
  setupScript,
  archiveScript,
  hasSharedScript
}: {
  hooksInspectionReady: boolean
  currentPolicy: HookCommandSourcePolicy
  setupScript: string | undefined
  archiveScript: string | undefined
  hasSharedScript: boolean
}): LocalCommandSourcePolicyNotice | null {
  if (!setupScript?.trim() && !archiveScript?.trim()) {
    return null
  }
  if (currentPolicy !== 'shared-only') {
    return null
  }
  if (!hooksInspectionReady) {
    return { kind: 'checking' }
  }
  return hasSharedScript
    ? { kind: 'action', policy: 'run-both', label: 'Run both' }
    : { kind: 'action', policy: 'local-only', label: '로컬 명령 사용' }
}

const YAML_STATE_STYLES: Record<
  string,
  { card: string; title: string; heading: string; description: string }
> = {
  loaded: {
    card: 'border-emerald-500/20 bg-emerald-500/5',
    title: 'text-emerald-700 dark:text-emerald-300',
    heading: '`korca.yaml` 사용 중',
    description:
      '공유 훅과 이슈 자동화 기본값이 저장소에 정의되어 있으며 이를 사용하는 모든 사람이 이용할 수 있습니다.'
  },
  'update-available': {
    card: 'border-amber-500/20 bg-amber-500/5',
    title: 'text-amber-700 dark:text-amber-300',
    heading: '`korca.yaml`를 구문 분석할 수 없습니다',
    description:
      '이 파일에는 현재 Korca 버전이 인식하지 못하는 설정 키가 있습니다. Korca를 업데이트하거나 파일의 오타를 확인하세요.'
  },
  invalid: {
    card: 'border-amber-500/20 bg-amber-500/5',
    title: 'text-amber-700 dark:text-amber-300',
    heading: '`korca.yaml`를 구문 분석할 수 없습니다',
    description:
      '핵심 설정 파일은 저장소 루트에 있지만, Korca가 아직 지원되는 훅 정의를 구문 분석하지 못했습니다.'
  },
  missing: {
    card: 'border-border/50 bg-muted/20',
    title: 'text-foreground',
    heading: '`korca.yaml`이 감지되지 않음',
    description:
      '이 저장소에서 공유 설정, 보관, 이슈 자동화 기본값을 사용하려면 `korca.yaml` 파일을 추가하세요. 예제 템플릿:'
  }
}

function PolicyOptionGrid<P extends string>({
  options,
  selected,
  onSelect,
  columns
}: {
  options: PolicyOption<P>[]
  selected: P
  onSelect: (p: P) => void
  columns: string
}): React.JSX.Element {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map(({ policy, label, description }) => {
        const active = selected === policy
        return (
          <button
            type="button"
            key={policy}
            onClick={() => onSelect(policy)}
            className={`rounded-xl border px-3 py-2.5 text-center transition-colors ${
              active
                ? 'border-foreground/15 bg-accent text-accent-foreground'
                : 'border-border/60 bg-background text-foreground hover:border-border hover:bg-muted/40'
            }`}
          >
            <span className={`block text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
              {label}
            </span>
            <p
              className={`mt-1 text-[11px] leading-4 ${active ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}
            >
              {description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function SegmentedPolicyToggle<P extends string>({
  options,
  selected,
  onSelect
}: {
  options: PolicyOption<P>[]
  selected: P
  onSelect: (p: P) => void
}): React.JSX.Element {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-0.5">
      {options.map(({ policy, label, description }) => {
        const active = selected === policy
        return (
          <button
            type="button"
            key={policy}
            onClick={() => onSelect(policy)}
            title={description}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function ExampleTemplateCard({
  copiedTemplate,
  onCopyTemplate
}: {
  copiedTemplate: boolean
  onCopyTemplate: () => void
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <p className="text-[10px] tracking-[0.18em] text-muted-foreground">
        예시 <code className="rounded bg-muted px-1 py-0.5">korca.yaml</code> 템플릿
      </p>
      <div className="relative rounded-lg border border-border/50 bg-background/70">
        <Button
          type="button"
          variant={copiedTemplate ? 'secondary' : 'ghost'}
          size="sm"
          className={`absolute right-2 top-2 z-10 h-6 px-2 text-[11px] ${
            copiedTemplate ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={onCopyTemplate}
        >
          {copiedTemplate ? '복사됨' : '복사'}
        </Button>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words p-3 pr-16 font-mono text-[11px] leading-5 text-muted-foreground">
          {EXAMPLE_TEMPLATE}
        </pre>
      </div>
    </div>
  )
}

function YamlScriptBlock({ content }: { content: string }): React.JSX.Element {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border/50 bg-muted/30 p-3 font-mono text-[11.5px] leading-5 text-foreground">
      {content}
    </pre>
  )
}

function EnvVarChips(): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        Available environment variables (hover for details):
      </p>
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap gap-1.5">
          {ENV_VARS.map(({ name, description }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <code
                  tabIndex={0}
                  className="cursor-help rounded-md border border-border/50 bg-muted/35 px-2 py-1 font-mono text-[11px] text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {name}
                </code>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="max-w-80 text-left text-wrap">
                {description}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}

type SaveStatus = 'idle' | 'saving' | 'saved'

function SaveIndicator({ status }: { status: SaveStatus }): React.JSX.Element | null {
  if (status === 'idle') {
    return null
  }
  const isSaving = status === 'saving'
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
      aria-live="polite"
    >
      <span
        className={`size-1.5 rounded-full ${
          isSaving ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
        }`}
      />
      {isSaving ? 'Saving...' : 'Saved'}
    </span>
  )
}

function LocalCommandSourceNotice({
  notice,
  onSelectPolicy
}: {
  notice: LocalCommandSourcePolicyNotice
  onSelectPolicy: (policy: 'local-only' | 'run-both') => void
}): React.JSX.Element {
  const isChecking = notice.kind === 'checking'
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Local scripts will not run
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {isChecking
              ? 'Local scripts are saved. Korca is still checking korca.yaml before it can recommend which script source to use.'
              : 'Local scripts are saved, but Script Source is set to korca.yaml only.'}
          </p>
        </div>
      </div>
      {notice.kind === 'action' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onSelectPolicy(notice.policy)}
        >
          {notice.label}
        </Button>
      ) : (
        <span className="shrink-0 rounded-full border border-border/60 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
          Checking...
        </span>
      )}
    </div>
  )
}

type ScriptEditorProps = {
  field: LocalHookField
  value: string
  hasShared: boolean
  sharedScript: string | undefined
  onChange: (next: string) => void
  onCommit: () => void
  sectionId?: string
}

function ScriptEditor({
  field,
  value,
  hasShared,
  sharedScript,
  onChange,
  onCommit,
  sectionId
}: ScriptEditorProps): React.JSX.Element {
  const [showLocal, setShowLocal] = useState(value.length > 0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const lastValueRef = useRef(value)
  const savedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (value === lastValueRef.current) {
      return
    }
    lastValueRef.current = value
    setSaveStatus('saving')
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
    }
    // Why: persistence is synchronous from the editor's POV, but we briefly
    // show "Saving..." then "Saved" so the indicator carries the auto-save trust
    // signal a Save button would (without the click).
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus('saved')
      savedTimerRef.current = window.setTimeout(() => {
        setSaveStatus('idle')
        savedTimerRef.current = null
      }, 1500)
    }, 250)
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current)
        savedTimerRef.current = null
      }
    }
  }, [value])

  const showLocalEditor = showLocal || value.length > 0 || !hasShared
  const lineCount = value ? value.split('\n').length : 0

  return (
    <div
      className="space-y-3 rounded-2xl border border-border/50 bg-background/80 p-4 shadow-sm"
      id={sectionId}
    >
      <div className="space-y-1">
        <h5 className="text-sm font-semibold">{field.label}</h5>
        <p className="text-xs text-muted-foreground">{field.description}</p>
      </div>

      <EnvVarChips />

      {hasShared ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              korca.yaml
              <span className="font-normal text-emerald-700/80 dark:text-emerald-300/80">
                - 팀과 공유됨
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              변경하려면 <code className="rounded bg-muted px-1 py-0.5">korca.yaml</code>를
              수정하세요.
            </span>
          </div>
          <YamlScriptBlock content={sharedScript ?? ''} />
        </div>
      ) : null}

      {showLocalEditor ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {hasShared ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                로컬
                <span className="font-normal">- 이 머신에서만 사용</span>
              </span>
            ) : (
              <span />
            )}
            <SaveIndicator status={saveStatus} />
          </div>
          <textarea
            value={value}
            aria-label={field.label}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onCommit}
            placeholder={field.placeholder}
            spellCheck={false}
            rows={Math.min(Math.max(lineCount + 1, 4), 14)}
            className="w-full min-w-0 resize-y rounded-lg border border-input bg-muted/20 px-3 py-2 font-mono text-[12px] leading-[1.55] shadow-xs transition-[color,box-shadow] outline-none placeholder:italic placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          <p className="text-[11px] text-muted-foreground">
            Runs as a single shell script. Saved on this machine.
          </p>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowLocal(true)}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add local script
        </Button>
      )}
    </div>
  )
}

export function RepositoryHooksSection({
  repo,
  yamlHooks,
  hasHooksFile,
  hooksInspectionReady,
  mayNeedUpdate,
  copiedTemplate,
  forceVisible = false,
  onCopyTemplate,
  onUpdateHookSettings
}: RepositoryHooksSectionProps): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const settingsSearchQuery = useAppStore((s) => s.settingsSearchQuery)
  const yamlState = yamlHooks
    ? 'loaded'
    : hasHooksFile
      ? mayNeedUpdate
        ? 'update-available'
        : 'invalid'
      : 'missing'

  const [hookSettingsDraft, setHookSettingsDraft] = useState(() =>
    getHookSettingsDraft(repo.hookSettings)
  )
  const hookSettingsDraftRef = useRef(hookSettingsDraft)
  hookSettingsDraftRef.current = hookSettingsDraft
  const localCommandsRepoIdRef = useRef(repo.id)
  const localCommandsDraftDirtyRef = useRef(false)
  const localCommandsAutosaveTimerRef = useRef<number | null>(null)
  const persistRef = useRef(onUpdateHookSettings)
  persistRef.current = onUpdateHookSettings
  const localCommandsPersistForRepoRef = useRef(onUpdateHookSettings)

  const selectedSetupRunPolicy: SetupRunPolicy =
    hookSettingsDraft.setupRunPolicy ?? 'run-by-default'

  const [issueCommandDraft, setIssueCommandDraft] = useState('')
  const [hasSharedIssueCommand, setHasSharedIssueCommand] = useState(false)
  const [issueCommandSaveError, setIssueCommandSaveError] = useState<string | null>(null)
  const issueCommandDraftRef = useRef(issueCommandDraft)
  issueCommandDraftRef.current = issueCommandDraft
  const lastCommittedIssueCommandRef = useRef('')

  const syncHookSettingsDraft = useCallback((next: RepoHookSettings) => {
    if (areHookSettingsDraftsEqual(hookSettingsDraftRef.current, next)) {
      return
    }
    hookSettingsDraftRef.current = next
    setHookSettingsDraft(next)
  }, [])

  const persistHookSettings = useCallback((next: RepoHookSettings) => {
    hookSettingsDraftRef.current = next
    setHookSettingsDraft(next)
    localCommandsDraftDirtyRef.current = false
    persistRef.current(next)
  }, [])

  const clearLocalCommandsAutosaveTimer = useCallback(() => {
    if (localCommandsAutosaveTimerRef.current !== null) {
      window.clearTimeout(localCommandsAutosaveTimerRef.current)
      localCommandsAutosaveTimerRef.current = null
    }
  }, [])

  const flushScriptDraft = useCallback(
    (persistHookSettings?: (settings: RepoHookSettings) => void) => {
      clearLocalCommandsAutosaveTimer()
      if (!localCommandsDraftDirtyRef.current) {
        return
      }
      localCommandsDraftDirtyRef.current = false
      const persist = persistHookSettings ?? persistRef.current
      persist(hookSettingsDraftRef.current)
    },
    [clearLocalCommandsAutosaveTimer]
  )

  const queueScriptDraftPersist = useCallback(() => {
    localCommandsDraftDirtyRef.current = true
    clearLocalCommandsAutosaveTimer()
    // Why: repo settings persistence may be an SSH RPC; coalesce typing bursts
    // so a pasted script does not enqueue one repo.update call per character.
    localCommandsAutosaveTimerRef.current = window.setTimeout(() => {
      flushScriptDraft()
    }, 700)
  }, [clearLocalCommandsAutosaveTimer, flushScriptDraft])

  const updateScriptDraft = useCallback(
    (hookName: LocalHookName, nextScript: string) => {
      const current = hookSettingsDraftRef.current
      const next: RepoHookSettings = {
        ...current,
        scripts: {
          ...current.scripts,
          [hookName]: nextScript
        }
      }
      hookSettingsDraftRef.current = next
      setHookSettingsDraft(next)
      // Why: changing local commands should not silently change Command Source;
      // if local commands are excluded, the warning below offers an explicit switch.
      queueScriptDraftPersist()
    },
    [queueScriptDraftPersist]
  )

  const commitScriptDraft = useCallback(() => {
    flushScriptDraft()
  }, [flushScriptDraft])

  // Why: unmount can happen before textareas blur; the root ref preserves the
  // pending local-command save without paying for a cleanup-only Effect.
  const flushScriptDraftOnUnmount = useCallback(
    (node: HTMLElement | null): void => {
      if (node === null) {
        flushScriptDraft()
      }
    },
    [flushScriptDraft]
  )

  const updateHookSettingsPolicyDraft = useCallback(
    (updates: HookSettingsPolicyDraft) => {
      persistHookSettings({ ...hookSettingsDraftRef.current, ...updates })
    },
    [persistHookSettings]
  )

  // Why: repo switches reset state before textareas can blur, so flush the
  // dirty draft through the previous repo's captured updater.
  useEffect(() => {
    const next = getHookSettingsDraft(repo.hookSettings)
    const isSameRepo = localCommandsRepoIdRef.current === repo.id

    if (isSameRepo) {
      localCommandsPersistForRepoRef.current = onUpdateHookSettings
      if (!localCommandsDraftDirtyRef.current) {
        syncHookSettingsDraft(next)
      }
      return
    }

    flushScriptDraft(localCommandsPersistForRepoRef.current)
    localCommandsRepoIdRef.current = repo.id
    localCommandsPersistForRepoRef.current = onUpdateHookSettings
    hookSettingsDraftRef.current = next
    setHookSettingsDraft(next)
  }, [flushScriptDraft, onUpdateHookSettings, repo.id, repo.hookSettings, syncHookSettingsDraft])

  useEffect(() => {
    let cancelled = false
    const repoId = repo.id

    setIssueCommandDraft('')
    setHasSharedIssueCommand(false)
    setIssueCommandSaveError(null)

    void readRuntimeIssueCommand(settings, repoId)
      .then((result) => {
        if (cancelled) {
          return
        }
        const localContent = result.localContent ?? ''
        setIssueCommandDraft(localContent)
        setHasSharedIssueCommand(Boolean(result.sharedContent))
        lastCommittedIssueCommandRef.current = localContent
      })
      .catch(() => {
        if (!cancelled) {
          setIssueCommandDraft('')
          setHasSharedIssueCommand(false)
          lastCommittedIssueCommandRef.current = ''
        }
      })

    return () => {
      cancelled = true
      const draft = issueCommandDraftRef.current.trim()
      if (draft !== lastCommittedIssueCommandRef.current) {
        void writeRuntimeIssueCommand(settings, repoId, draft).catch((err) => {
          console.error('[RepositoryHooksSection] Failed to save issue command on unmount:', err)
        })
      }
    }
  }, [repo.id, settings])

  const commitIssueCommand = useCallback(async (): Promise<void> => {
    const trimmed = issueCommandDraft.trim()
    setIssueCommandDraft(trimmed)
    try {
      await writeRuntimeIssueCommand(settings, repo.id, trimmed)
      lastCommittedIssueCommandRef.current = trimmed
      setIssueCommandSaveError(null)
    } catch (err) {
      console.error('[RepositoryHooksSection] Failed to write issue command:', err)
      const message = err instanceof Error ? err.message : 'Failed to save GitHub issue command.'
      setIssueCommandSaveError(message)
      toast.error(message)
    }
  }, [issueCommandDraft, repo.id, settings])

  const sharedSetupScript = yamlHooks?.scripts.setup
  const sharedArchiveScript = yamlHooks?.scripts.archive
  const hasSharedSetupScript = Boolean(sharedSetupScript?.trim())
  const hasSharedArchiveScript = Boolean(sharedArchiveScript?.trim())
  const hasSharedScript = Boolean(sharedSetupScript?.trim() || sharedArchiveScript?.trim())
  const hasLocalScript = Boolean(
    hookSettingsDraft.scripts.setup?.trim() || hookSettingsDraft.scripts.archive?.trim()
  )
  const selectedCommandSourcePolicy: HookCommandSourcePolicy = resolveHookCommandSourcePolicy(
    hookSettingsDraft.commandSourcePolicy,
    { hasLocalScript }
  )
  const localCommandSourceNotice = getLocalCommandSourcePolicyNotice({
    hooksInspectionReady,
    currentPolicy: selectedCommandSourcePolicy,
    setupScript: hookSettingsDraft.scripts.setup,
    archiveScript: hookSettingsDraft.scripts.archive,
    hasSharedScript
  })
  const advancedMatchesSearch =
    settingsSearchQuery.trim() !== '' &&
    matchesSettingsSearch(settingsSearchQuery, {
      title: 'Advanced',
      description: 'Command source and korca.yaml details.',
      keywords: [
        'advanced',
        'command source',
        'korca.yaml',
        'shared',
        'local',
        'both',
        'authoritative'
      ]
    })
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  return (
    <section ref={flushScriptDraftOnUnmount} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">작업 트리 훅</h2>
        <p className="text-xs text-muted-foreground">
          작업 트리가 생성되거나 보관될 때 실행되는 스크립트입니다. 로컬 스크립트는 이 머신에
          저장되고, `korca.yaml` 스크립트는 팀과 공유됩니다.
        </p>
      </div>

      <SearchableSetting
        title="설정 스크립트"
        description="새 작업 트리가 생성된 뒤 실행되는 로컬 및 공유 스크립트입니다."
        forceVisible={forceVisible}
        keywords={[
          'setup',
          'script',
          'command',
          'local',
          'local settings scripts',
          'korca.yaml',
          'korca.yaml hooks',
          'hook'
        ]}
      >
        <ScriptEditor
          key={`${repo.id}:setup`}
          field={LOCAL_HOOK_FIELDS[0]}
          value={hookSettingsDraft.scripts.setup ?? ''}
          hasShared={hasSharedSetupScript}
          sharedScript={sharedSetupScript}
          onChange={(next) => updateScriptDraft('setup', next)}
          onCommit={commitScriptDraft}
          sectionId={getRepositoryLocalCommandsSectionId(repo.id)}
        />
      </SearchableSetting>

      <SearchableSetting
        title="설정 스크립트 실행 시점"
        description="설정 스크립트가 있을 때의 기본 동작을 선택합니다."
        forceVisible={forceVisible}
        keywords={['setup run policy', 'ask', 'run by default', 'skip by default']}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/80 p-4 shadow-sm">
          <div className="min-w-0">
            <h5 className="text-sm font-semibold">실행 시점</h5>
            <p className="text-xs text-muted-foreground">
              새 작업 트리가 만들어질 때의 기본 동작입니다.
            </p>
          </div>
          <SegmentedPolicyToggle
            options={SETUP_RUN_POLICY_OPTIONS}
            selected={selectedSetupRunPolicy}
            onSelect={(policy) => updateHookSettingsPolicyDraft({ setupRunPolicy: policy })}
          />
        </div>
      </SearchableSetting>

      <SearchableSetting
        title="보관 스크립트"
        description="작업 트리가 보관되기 전에 실행되는 로컬 및 공유 스크립트입니다."
        forceVisible={forceVisible}
        keywords={[
          'archive',
          'script',
          'command',
          'local',
          'local settings scripts',
          'korca.yaml',
          'korca.yaml hooks',
          'hook'
        ]}
      >
        <ScriptEditor
          key={`${repo.id}:archive`}
          field={LOCAL_HOOK_FIELDS[1]}
          value={hookSettingsDraft.scripts.archive ?? ''}
          hasShared={hasSharedArchiveScript}
          sharedScript={sharedArchiveScript}
          onChange={(next) => updateScriptDraft('archive', next)}
          onCommit={commitScriptDraft}
        />
      </SearchableSetting>

      {localCommandSourceNotice ? (
        <LocalCommandSourceNotice
          notice={localCommandSourceNotice}
          onSelectPolicy={(policy) =>
            updateHookSettingsPolicyDraft({ commandSourcePolicy: policy })
          }
        />
      ) : null}

      <SearchableSetting
        title="사용자 지정 GitHub 이슈 명령"
        description="연결된 이슈 명령에 대한 사용자별 선택적 재정의입니다."
        forceVisible={forceVisible}
        keywords={['github issue command', 'issue command', 'workflow', 'agent', 'github']}
      >
        <div className="space-y-3 rounded-2xl border border-border/50 bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <h5 className="text-sm font-semibold">사용자 지정 GitHub 이슈 명령</h5>
            <p className="text-xs text-muted-foreground">
              선택적 재정의입니다.{' '}
              <code className="rounded bg-muted px-1 py-0.5">{'{{artifact_url}}'}</code> for the
              linked issue or PR URL.
            </p>
          </div>
          <textarea
            value={issueCommandDraft}
            aria-label="Custom GitHub Issue Command"
            onChange={(e) => setIssueCommandDraft(e.target.value)}
            onBlur={commitIssueCommand}
            placeholder="Complete {{artifact_url}}"
            rows={4}
            spellCheck={false}
            className="w-full min-w-0 resize-y rounded-md border border-input bg-muted/20 px-3 py-2 font-mono text-xs shadow-xs transition-[color,box-shadow] outline-none placeholder:italic placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          <p className="text-[11px] text-muted-foreground">
            비워 두면 저장소 기본값을 사용합니다.{' '}
            <code className="rounded bg-muted px-1 py-0.5">korca.yaml</code>
            {hasSharedIssueCommand ? '.' : ' 가 있으면 이를 사용합니다.'}
          </p>
          {issueCommandSaveError ? (
            <p className="text-xs text-destructive">{issueCommandSaveError}</p>
          ) : null}
        </div>
      </SearchableSetting>

      <SearchableSetting
        title="고급"
        description="명령 소스와 korca.yaml 세부정보입니다."
        forceVisible={forceVisible}
        keywords={[
          'advanced',
          'command source',
          'korca.yaml',
          'shared',
          'local',
          'both',
          'authoritative'
        ]}
      >
        <details
          className="group rounded-2xl border border-border/50 bg-background/80 shadow-sm"
          open={advancedMatchesSearch || isAdvancedOpen}
          onToggle={(event) => {
            if (advancedMatchesSearch) {
              event.currentTarget.open = true
              return
            }
            setIsAdvancedOpen(event.currentTarget.open)
          }}
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"
            onClick={(event) => {
              if (advancedMatchesSearch) {
                event.preventDefault()
              }
            }}
          >
            <div className="flex items-center gap-2">
              <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
              <h5 className="text-sm font-semibold">고급</h5>
              <span className="text-xs text-muted-foreground">명령 소스 &amp; korca.yaml</span>
            </div>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              {COMMAND_SOURCE_LABEL[selectedCommandSourcePolicy]}
            </span>
          </summary>

          <div className="space-y-5 border-t border-border/50 px-4 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">명령 소스</p>
                <p className="text-[11px] text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">korca.yaml</code>와 로컬 명령이
                  모두 있을 때 어떤 것을 실행할지 선택합니다.
                </p>
              </div>
              <PolicyOptionGrid
                options={COMMAND_SOURCE_POLICY_OPTIONS}
                selected={selectedCommandSourcePolicy}
                onSelect={(policy) =>
                  updateHookSettingsPolicyDraft({ commandSourcePolicy: policy })
                }
                columns="md:grid-cols-3"
              />
            </div>

            <div className={`space-y-3 rounded-xl border p-3 ${YAML_STATE_STYLES[yamlState].card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${YAML_STATE_STYLES[yamlState].title}`}>
                    {YAML_STATE_STYLES[yamlState].heading}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {YAML_STATE_STYLES[yamlState].description}
                  </p>
                </div>
              </div>

              {yamlState === 'loaded' ? (
                <YamlScriptBlock content={renderYamlScriptPreview(yamlHooks)} />
              ) : yamlState === 'invalid' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-background/60 p-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>
                        The file is present, but Korca could not find valid `scripts` or
                        `issueCommand` definitions.
                      </p>
                      <ol className="space-y-1.5 pl-4 text-[11.5px]">
                        {PARSE_ERROR_FIXES.map((fix) => (
                          <li key={fix} className="list-decimal leading-5">
                            {fix}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <ExampleTemplateCard
                    copiedTemplate={copiedTemplate}
                    onCopyTemplate={onCopyTemplate}
                  />
                </div>
              ) : (
                <ExampleTemplateCard
                  copiedTemplate={copiedTemplate}
                  onCopyTemplate={onCopyTemplate}
                />
              )}
            </div>
          </div>
        </details>
      </SearchableSetting>
    </section>
  )
}

const PARSE_ERROR_FIXES = [
  'Check the indentation under `scripts:`. Hook keys should use two spaces, and command lines should use four.',
  'Define only the supported keys: `scripts`, `setup`, `archive`, and `issueCommand`.',
  'Compare your file against the working template below and copy that shape if needed.'
]

function renderYamlScriptPreview(hooks: KorcaHooks | null): string {
  const fmt = (key: string, cmd?: string): string =>
    cmd ? `\n  ${key}: |\n${cmd.replace(/^/gm, '    ')}` : ''
  const issueCommand = hooks?.issueCommand
    ? `\nissueCommand: |\n${hooks.issueCommand.replace(/^/gm, '  ')}`
    : ''
  return `scripts:${fmt('setup', hooks?.scripts.setup)}${fmt('archive', hooks?.scripts.archive)}${issueCommand}`
}
