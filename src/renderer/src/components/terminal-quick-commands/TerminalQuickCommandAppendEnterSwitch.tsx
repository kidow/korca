type TerminalQuickCommandAppendEnterSwitchProps = {
  appendEnter: boolean
  onToggle: () => void
}

export function TerminalQuickCommandAppendEnterSwitch({
  appendEnter,
  onToggle
}: TerminalQuickCommandAppendEnterSwitchProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">엔터 추가</div>
        <div className="text-xs text-muted-foreground">텍스트만 넣지 말고 바로 제출합니다.</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={appendEnter}
        aria-label="엔터 추가 전환"
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
          appendEnter ? 'bg-foreground' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
            appendEnter ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
