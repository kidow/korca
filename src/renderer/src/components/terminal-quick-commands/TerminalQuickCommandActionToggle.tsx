import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TerminalQuickCommandDialogAction } from './terminal-quick-command-dialog-draft'

type TerminalQuickCommandActionToggleProps = {
  selectedAction: TerminalQuickCommandDialogAction
  onActionChange: (action: TerminalQuickCommandDialogAction) => void
}

export function TerminalQuickCommandActionToggle({
  selectedAction,
  onActionChange
}: TerminalQuickCommandActionToggleProps): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      value={selectedAction}
      onValueChange={(value) => {
        if (value === 'terminal-command' || value === 'agent-prompt') {
          onActionChange(value)
        }
      }}
      className="justify-start"
    >
      <ToggleGroupItem value="terminal-command">터미널 명령</ToggleGroupItem>
      <ToggleGroupItem value="agent-prompt">에이전트 프롬프트</ToggleGroupItem>
    </ToggleGroup>
  )
}
