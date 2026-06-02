export function TerminalSlide(): React.JSX.Element {
  return (
    <div className="mp-device-screen">
      <div className="mp-session-chrome">
        <div className="mp-session-topbar">
          <button type="button" className="mp-session-back" aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
          <div className="mp-session-title-block">
            <div className="mp-session-title">feat/mobile-page</div>
            <div className="mp-session-meta-row">
              <span className="mp-status-dot is-green" />
              <span>터미널 2개 · claude 활성</span>
            </div>
          </div>
          <button type="button" className="mp-session-iconbtn" aria-label="소스 제어">
            <BranchIcon />
          </button>
          <button type="button" className="mp-session-iconbtn" aria-label="파일">
            <FolderIcon />
          </button>
        </div>

        <div className="mp-session-tabbar">
          <div className="mp-session-tab is-active">claude</div>
          <div className="mp-session-tab">
            <span>셸</span>
          </div>
          <div className="mp-session-tab">
            <FileIcon />
            <span>PLAN.md</span>
          </div>
          <div className="mp-session-tab-add">
            <PlusIcon />
          </div>
        </div>
      </div>

      <div className="mp-terminal">
        <span className="mp-term-line">
          <span className="mp-term-prompt">dev@mac</span>{' '}
          <span className="mp-term-dim">korca/feat-mobile-page</span>{' '}
          <span className="mp-term-prompt">$</span> <span className="mp-term-cmd">claude</span>
        </span>
        <span className="mp-term-line" />
        <span className="mp-term-line">
          <span className="mp-term-tool">●</span> <span className="mp-term-mid">읽기</span>{' '}
          <span className="mp-term-dim">mobile/korca-mobile-sidebar-mock-v3.html</span>
        </span>
        <span className="mp-term-line">
          {'  '}
          <span className="mp-term-comment">⎿ 2103줄 읽음</span>
        </span>
        <span className="mp-term-line" />
        <span className="mp-term-line">
          <span className="mp-term-tool">●</span> <span className="mp-term-mid">수정</span>{' '}
          <span className="mp-term-dim">mobile/korca-mobile-sidebar-mock-v3.html</span>
        </span>
        <span className="mp-term-line">
          {'  '}
          <span className="mp-term-comment">⎿ pair-scan 슬라이드를 터미널 세션으로 교체함</span>
        </span>
        <span className="mp-term-line" />
        <span className="mp-term-line">
          <span className="mp-term-tool">●</span> <span className="mp-term-mid">Bash</span>{' '}
          <span className="mp-term-dim">pnpm test --filter mobile</span>
        </span>
        <span className="mp-term-line">
          {'  '}
          <span className="mp-term-comment">⎿ </span>
          <span className="mp-term-ok">통과</span>
          <span className="mp-term-comment"> src/transport/host-store.test.ts</span>
        </span>
        <span className="mp-term-line">
          {'     '}
          <span className="mp-term-ok">통과</span>
          <span className="mp-term-comment"> src/cache/worktree-cache.test.ts</span>
        </span>
        <span className="mp-term-line">
          {'     '}
          <span className="mp-term-warn">●</span>
          <span className="mp-term-comment"> 14 passed, 1 skipped (1.8s)</span>
        </span>
        <span className="mp-term-line" />
        <span className="mp-term-line">
          <span className="mp-term-mid">pair-scan 슬라이드를 고해상도 터미널 화면으로</span>
        </span>
        <span className="mp-term-line">
          <span className="mp-term-mid">
            터미널 화면으로 바꿨습니다. Tokyonight 팔레트, Menlo, 실제 claude
          </span>
        </span>
        <span className="mp-term-line">
          <span className="mp-term-mid">tool-call 형식입니다. 다음에 diff를 추가할까요?</span>
        </span>
        <span className="mp-term-line" />
        <span className="mp-term-line">
          <span className="mp-term-prompt">›</span> <span className="mp-term-cursor" />
        </span>
      </div>

      <div className="mp-accessory-bar">
        <div className="mp-accessory-content">
          <div className="mp-accessory-key is-icon" aria-label="폰 모드로 전환">
            <PhoneIcon />
          </div>
          <div className="mp-accessory-key">붙여넣기</div>
          <div className="mp-accessory-key">Esc</div>
          <div className="mp-accessory-key">Tab</div>
          <div className="mp-accessory-key">⌫</div>
          <div className="mp-accessory-key">↑</div>
          <div className="mp-accessory-key">↓</div>
          <div className="mp-accessory-key">←</div>
          <div className="mp-accessory-key">→</div>
          <div className="mp-accessory-key">Ctrl+C</div>
        </div>
      </div>

      <div className="mp-input-bar">
        <div className="mp-text-input">명령을 입력하세요…</div>
        <div className="mp-round-button" aria-label="음성 받아쓰기">
          <MicIcon />
        </div>
        <div className="mp-round-button" aria-label="Send">
          <ArrowUpIcon />
        </div>
      </div>
    </div>
  )
}

function ChevronLeftIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function BranchIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="6" cy="3" r="2.5" />
      <circle cx="6" cy="21" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M6 5.5v13" />
      <path d="M18 9.5a6 6 0 0 0-6-6" />
    </svg>
  )
}

function FolderIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 4h6l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function FileIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function PlusIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function PhoneIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

function MicIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function ArrowUpIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}
