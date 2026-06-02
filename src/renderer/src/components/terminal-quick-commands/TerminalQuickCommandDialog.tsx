import { useRef, useState } from 'react'
import type {
  Repo,
  TerminalQuickCommand,
  TerminalQuickCommandScope
} from '../../../../shared/types'
import {
  getTerminalQuickCommandAction,
  getTerminalQuickCommandScope,
  isTerminalAgentQuickCommand,
  supportsTerminalAgentQuickCommand
} from '../../../../shared/terminal-quick-commands'
import { createBrowserUuid } from '@/lib/browser-uuid'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import { getScreenSubmitShortcutLabel, isScreenSubmitShortcut } from '@/lib/screen-submit-shortcut'
import type { TuiAgent } from '../../../../shared/types'
import { TerminalQuickCommandActionToggle } from './TerminalQuickCommandActionToggle'
import { TerminalQuickCommandAppendEnterSwitch } from './TerminalQuickCommandAppendEnterSwitch'
import { TerminalQuickCommandDialogFooter } from './TerminalQuickCommandDialogFooter'
import { TerminalQuickCommandLabelField } from './TerminalQuickCommandLabelField'
import { TerminalQuickCommandScopeField } from './TerminalQuickCommandScopeField'
import {
  createTerminalQuickCommandDialogDraftMemory,
  switchTerminalQuickCommandDialogAction
} from './terminal-quick-command-dialog-draft'

type TerminalQuickCommandDialogMode = 'add' | 'edit'

type TerminalQuickCommandDialogProps = {
  open: boolean
  mode: TerminalQuickCommandDialogMode
  command: TerminalQuickCommand
  repos?: Pick<Repo, 'id' | 'displayName' | 'path' | 'badgeColor'>[]
  onOpenChange: (open: boolean) => void
  onSave: (command: TerminalQuickCommand) => void
}

export function createTerminalQuickCommandDraft(
  scope: TerminalQuickCommandScope = { type: 'global' }
): TerminalQuickCommand {
  return {
    id: `quick-command-${createBrowserUuid()}`,
    label: '',
    command: '',
    appendEnter: true,
    scope
  }
}

export function TerminalQuickCommandDialog({
  open,
  mode,
  command,
  repos = [],
  onOpenChange,
  onSave
}: TerminalQuickCommandDialogProps): React.JSX.Element {
  const fallbackAgent: TuiAgent =
    AGENT_CATALOG.find((entry) => supportsTerminalAgentQuickCommand(entry.id))?.id ?? 'claude'
  const [draft, setDraft] = useState<TerminalQuickCommand>(command)
  const wasOpenRef = useRef(open)
  const syncedCommandRef = useRef(command)
  const draftMemoryRef = useRef(createTerminalQuickCommandDialogDraftMemory(command, fallbackAgent))
  const selectedAction = getTerminalQuickCommandAction(draft)
  const selectedScope = getTerminalQuickCommandScope(draft)
  // Why: repo-scoped commands can outlive the current repo list; only an
  // explicit selection should replace the saved repo id.
  const selectedRepo =
    selectedScope.type === 'repo'
      ? (repos.find((repo) => repo.id === selectedScope.repoId) ?? null)
      : null
  const selectedRepoId = selectedRepo?.id ?? ''
  const selectedRepoMissing = selectedScope.type === 'repo' && selectedRepo === null

  if (!open) {
    wasOpenRef.current = false
  } else if (!wasOpenRef.current || syncedCommandRef.current !== command) {
    wasOpenRef.current = true
    syncedCommandRef.current = command
    // Why: opening or retargeting the dialog should render the new command
    // draft immediately instead of repairing it in a follow-up Effect.
    draftMemoryRef.current = createTerminalQuickCommandDialogDraftMemory(command, fallbackAgent)
    setDraft({ ...command })
  }

  const selectedAgent =
    isTerminalAgentQuickCommand(draft) && supportsTerminalAgentQuickCommand(draft.agent)
      ? draft.agent
      : fallbackAgent

  const setAction = (action: 'terminal-command' | 'agent-prompt'): void => {
    setDraft((current) => {
      const next = switchTerminalQuickCommandDialogAction(current, action, draftMemoryRef.current)
      draftMemoryRef.current = next.memory
      return next.draft
    })
  }

  const toggleAppendEnter = (): void => {
    setDraft((current) =>
      isTerminalAgentQuickCommand(current)
        ? current
        : (() => {
            const appendEnter = !current.appendEnter
            draftMemoryRef.current = {
              ...draftMemoryRef.current,
              terminalAppendEnter: appendEnter
            }
            return { ...current, appendEnter }
          })()
    )
  }

  const saveDraft = (): void => {
    const next: TerminalQuickCommand = isTerminalAgentQuickCommand(draft)
      ? {
          id: draft.id,
          label: draft.label.trim(),
          action: 'agent-prompt',
          agent: draft.agent,
          prompt: draft.prompt.trimEnd(),
          scope: selectedScope
        }
      : {
          id: draft.id,
          label: draft.label.trim(),
          action: 'terminal-command',
          command: draft.command.trimEnd(),
          appendEnter: draft.appendEnter,
          scope: selectedScope
        }
    if (
      !next.label ||
      (isTerminalAgentQuickCommand(next)
        ? !next.prompt.trim() || !supportsTerminalAgentQuickCommand(next.agent)
        : !next.command.trim())
    ) {
      return
    }
    onSave(next)
    onOpenChange(false)
  }

  const canSave =
    draft.label.trim().length > 0 &&
    (isTerminalAgentQuickCommand(draft)
      ? draft.prompt.trimEnd().length > 0 && supportsTerminalAgentQuickCommand(draft.agent)
      : draft.command.trimEnd().length > 0)
  const submitShortcutLabel = getScreenSubmitShortcutLabel()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {mode === 'edit' ? '빠른 명령 편집' : '빠른 명령 추가'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            터미널 명령이나 에이전트 프롬프트를 빠르게 불러오도록 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <div
          className="space-y-4"
          onKeyDown={(event) => {
            if (isScreenSubmitShortcut(event) && canSave) {
              event.preventDefault()
              saveDraft()
            }
          }}
        >
          <TerminalQuickCommandLabelField label={draft.label} setDraft={setDraft} />

          <div className="space-y-2">
            <Label>동작</Label>
            <TerminalQuickCommandActionToggle
              selectedAction={selectedAction}
              onActionChange={setAction}
            />
          </div>

          {isTerminalAgentQuickCommand(draft) ? (
            <>
              <div className="space-y-2">
                <Label>에이전트</Label>
                <Select
                  value={selectedAgent}
                  onValueChange={(agent) => {
                    const nextAgent = agent as TuiAgent
                    draftMemoryRef.current = {
                      ...draftMemoryRef.current,
                      agent: nextAgent
                    }
                    setDraft((current) =>
                      isTerminalAgentQuickCommand(current)
                        ? { ...current, agent: nextAgent }
                        : current
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="에이전트 선택" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    className="max-h-[min(20rem,var(--radix-select-content-available-height))] w-[--radix-select-trigger-width]"
                  >
                    {AGENT_CATALOG.map((entry) => {
                      const supported = supportsTerminalAgentQuickCommand(entry.id)
                      return (
                        <SelectItem key={entry.id} value={entry.id} disabled={!supported}>
                          <span className="flex min-w-0 items-center gap-2">
                            <AgentIcon agent={entry.id} size={16} />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate">{entry.label}</span>
                              {!supported ? (
                                <span className="truncate text-xs text-muted-foreground">
                                  프롬프트 명령을 지원하지 않습니다
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>프롬프트</Label>
                <textarea
                  value={draft.prompt}
                  onChange={(event) => {
                    const prompt = event.target.value
                    draftMemoryRef.current = {
                      ...draftMemoryRef.current,
                      agentPrompt: prompt
                    }
                    setDraft((current) =>
                      isTerminalAgentQuickCommand(current) ? { ...current, prompt } : current
                    )
                  }}
                  placeholder="이 작업 공간을 조사하도록 에이전트에 요청하세요"
                  rows={4}
                  className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <p className="text-xs text-muted-foreground">
                  스킬, 파일 경로, 그리고 다음과 같은 내장 명령을 지원합니다{' '}
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">/goal</code>.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>명령 텍스트</Label>
              <textarea
                value={draft.command}
                onChange={(event) => {
                  const command = event.target.value
                  draftMemoryRef.current = {
                    ...draftMemoryRef.current,
                    terminalCommand: command
                  }
                  setDraft((current) =>
                    isTerminalAgentQuickCommand(current) ? current : { ...current, command }
                  )
                }}
                placeholder="npm run dev"
                rows={4}
                className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          )}

          <TerminalQuickCommandScopeField
            repos={repos}
            selectedScope={selectedScope}
            selectedRepoId={selectedRepoId}
            selectedRepoMissing={selectedRepoMissing}
            setDraft={setDraft}
          />

          {!isTerminalAgentQuickCommand(draft) ? (
            <TerminalQuickCommandAppendEnterSwitch
              appendEnter={draft.appendEnter}
              onToggle={toggleAppendEnter}
            />
          ) : null}
        </div>

        <TerminalQuickCommandDialogFooter
          canSave={canSave}
          submitShortcutLabel={submitShortcutLabel}
          onCancel={() => onOpenChange(false)}
          onSave={saveDraft}
        />
      </DialogContent>
    </Dialog>
  )
}
