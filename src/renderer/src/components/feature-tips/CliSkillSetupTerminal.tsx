import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { OnboardingInlineCommandTerminal } from '@/components/onboarding/OnboardingInlineCommandTerminal'
import { KORCA_CLI_ORCHESTRATION_SKILL_INSTALL_COMMAND } from '@/lib/agent-feature-install-commands'

export function CliSkillSetupTerminal(): React.JSX.Element {
  const handleCopySkillCommand = async (): Promise<void> => {
    try {
      await window.api.ui.writeClipboardText(KORCA_CLI_ORCHESTRATION_SKILL_INSTALL_COMMAND)
      toast.success('스킬 설치 명령을 복사했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '스킬 명령을 복사하지 못했습니다.')
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/35 px-3 py-2">
        <code className="scrollbar-sleek min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-muted-foreground">
          {KORCA_CLI_ORCHESTRATION_SKILL_INSTALL_COMMAND}
        </code>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={() => void handleCopySkillCommand()}
              aria-label="스킬 설치 명령 복사"
            >
              <Copy className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            명령 복사
          </TooltipContent>
        </Tooltip>
      </div>
      <OnboardingInlineCommandTerminal
        command={KORCA_CLI_ORCHESTRATION_SKILL_INSTALL_COMMAND}
        title="스킬 설정"
        ariaLabel="Korca CLI 및 오케스트레이션 스킬 설치 터미널"
        description="엔터를 눌러 에이전트용 Korca CLI 오케스트레이션 스킬을 설치하세요."
        terminalHeightPx={280}
        terminalTopMarginPx={8}
        descriptionPaddingClassName="px-4 py-2"
        autoScrollIntoView={false}
        worktreeId="feature-tip-cli-skills-terminal"
      />
    </div>
  )
}
