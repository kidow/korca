import { useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import type { GlobalSettings, TerminalColorOverrides } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { ColorField, NumberField } from './SettingsFormControls'
import { SearchableSetting } from './SearchableSetting'
import { clampNumber } from '@/lib/terminal-theme'
import { useMountedRef } from '@/hooks/useMountedRef'

type TerminalWindowSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

const COLOR_OVERRIDE_GROUPS: {
  label: string
  keys: { key: keyof TerminalColorOverrides; label: string; description: string }[]
}[] = [
  {
    label: '기본',
    keys: [
      { key: 'foreground', label: '전경색', description: '기본 텍스트 색상' },
      { key: 'background', label: '배경색', description: '터미널 배경색' },
      { key: 'cursor', label: '커서', description: '커서 색상' },
      {
        key: 'cursorAccent',
        label: '커서 텍스트',
        description: '블록 커서 아래 텍스트 색상'
      },
      {
        key: 'selectionBackground',
        label: '선택 배경',
        description: '선택한 텍스트의 배경색'
      },
      {
        key: 'selectionForeground',
        label: '선택 텍스트',
        description: '선택한 텍스트의 글자색'
      },
      {
        key: 'bold',
        label: '굵은 글씨',
        description: '굵은 글씨 색상입니다. 설정하지 않으면 일반 색상을 사용합니다.'
      }
    ]
  },
  {
    label: 'ANSI 기본',
    keys: [
      { key: 'black', label: '검정', description: 'ANSI 검정 색상' },
      { key: 'red', label: '빨강', description: 'ANSI 빨강 색상' },
      { key: 'green', label: '초록', description: 'ANSI 초록 색상' },
      { key: 'yellow', label: '노랑', description: 'ANSI 노랑 색상' },
      { key: 'blue', label: '파랑', description: 'ANSI 파랑 색상' },
      { key: 'magenta', label: '마젠타', description: 'ANSI 마젠타 색상' },
      { key: 'cyan', label: '시안', description: 'ANSI 시안 색상' },
      { key: 'white', label: '흰색', description: 'ANSI 흰색 색상' }
    ]
  },
  {
    label: 'ANSI 밝은 색',
    keys: [
      { key: 'brightBlack', label: '밝은 검정', description: 'ANSI 밝은 검정 색상' },
      { key: 'brightRed', label: '밝은 빨강', description: 'ANSI 밝은 빨강 색상' },
      { key: 'brightGreen', label: '밝은 초록', description: 'ANSI 밝은 초록 색상' },
      { key: 'brightYellow', label: '밝은 노랑', description: 'ANSI 밝은 노랑 색상' },
      { key: 'brightBlue', label: '밝은 파랑', description: 'ANSI 밝은 파랑 색상' },
      { key: 'brightMagenta', label: '밝은 마젠타', description: 'ANSI 밝은 마젠타 색상' },
      { key: 'brightCyan', label: '밝은 시안', description: 'ANSI 밝은 시안 색상' },
      { key: 'brightWhite', label: '밝은 흰색', description: 'ANSI 밝은 흰색 색상' }
    ]
  }
]

export function TerminalWindowSection({
  settings,
  updateSettings
}: TerminalWindowSectionProps): React.JSX.Element {
  const [colorOverridesExpanded, setColorOverridesExpanded] = useState(false)
  // Why: windowBackgroundBlur is only read by createMainWindow() at startup
  // (macOS vibrancy / Windows acrylic both require window creation options),
  // so the UI has to ask the user to restart for the change to take effect.
  // Snapshot the value on first render and compare to the live setting to
  // show a "Restart required" banner only when they differ.
  const blurAtMountRef = useRef<boolean>(settings.windowBackgroundBlur ?? false)
  const blurPendingRestart = (settings.windowBackgroundBlur ?? false) !== blurAtMountRef.current
  const [relaunchingBlur, setRelaunchingBlur] = useState(false)
  const mountedRef = useMountedRef()

  const handleRelaunch = async (): Promise<void> => {
    if (relaunchingBlur) {
      return
    }
    setRelaunchingBlur(true)
    try {
      await window.api.app.relaunch()
    } catch {
      if (mountedRef.current) {
        setRelaunchingBlur(false)
      }
    }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">창</h3>
        <p className="text-xs text-muted-foreground">창 모양과 배경 설정입니다.</p>
      </div>

      <SearchableSetting
        title="배경 불투명도"
        description="터미널 배경의 투명도를 조절합니다."
        keywords={['opacity', 'transparency', 'background', 'alpha']}
      >
        <NumberField
          label="배경 불투명도"
          description="터미널 배경의 투명도를 조절합니다. 1은 완전 불투명, 0은 완전 투명입니다."
          value={settings.terminalBackgroundOpacity ?? 1}
          defaultValue={1}
          min={0}
          max={1}
          step={0.05}
          suffix="0 to 1"
          onChange={(value) =>
            updateSettings({ terminalBackgroundOpacity: clampNumber(value, 0, 1) })
          }
        />
      </SearchableSetting>

      <SearchableSetting
        title="창 블러"
        description="터미널 창에 배경 블러를 적용합니다. 다시 시작해야 합니다."
        keywords={['window', 'blur', 'background', 'transparency', 'vibrancy']}
        className="space-y-3 py-2"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label>창 블러</Label>
            <p className="text-xs text-muted-foreground">
              Apply background blur to the terminal window. Requires restart.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.windowBackgroundBlur ?? false}
            onClick={() => updateSettings({ windowBackgroundBlur: !settings.windowBackgroundBlur })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
              (settings.windowBackgroundBlur ?? false) ? 'bg-foreground' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
                (settings.windowBackgroundBlur ?? false) ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {blurPendingRestart ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2.5">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                다시 시작 필요
              </p>
              <p className="text-xs text-muted-foreground">
                창 블러 변경을 적용하려면 Korca를 다시 시작하세요.
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              className="shrink-0 gap-1.5"
              disabled={relaunchingBlur}
              onClick={() => void handleRelaunch()}
            >
              <RotateCw className={`size-3 ${relaunchingBlur ? 'animate-spin' : ''}`} />
              {relaunchingBlur ? '다시 시작 중…' : '지금 다시 시작'}
            </Button>
          </div>
        ) : null}
      </SearchableSetting>

      <SearchableSetting
        title="가로 여백"
        description="터미널 그리드 주변의 가로 여백(픽셀)입니다."
        keywords={['padding', 'horizontal', 'spacing', 'margin']}
      >
        <NumberField
          label="가로 여백"
          description="터미널 그리드 주변의 가로 여백(픽셀)입니다."
          value={settings.terminalPaddingX ?? 4}
          defaultValue={4}
          min={0}
          max={512}
          step={1}
          suffix="px"
          onChange={(value) => updateSettings({ terminalPaddingX: Math.max(0, value) })}
        />
      </SearchableSetting>

      <SearchableSetting
        title="세로 여백"
        description="터미널 그리드 주변의 세로 여백(픽셀)입니다."
        keywords={['padding', 'vertical', 'spacing', 'margin']}
      >
        <NumberField
          label="세로 여백"
          description="터미널 그리드 주변의 세로 여백(픽셀)입니다."
          value={settings.terminalPaddingY ?? 4}
          defaultValue={4}
          min={0}
          max={512}
          step={1}
          suffix="px"
          onChange={(value) => updateSettings({ terminalPaddingY: Math.max(0, value) })}
        />
      </SearchableSetting>

      <SearchableSetting
        title="입력 중 마우스 숨기기"
        description="터미널에 입력할 때 마우스 커서를 숨깁니다."
        keywords={['mouse', 'hide', 'typing', 'cursor']}
        className="flex items-center justify-between gap-4 py-2"
      >
        <div className="space-y-0.5">
          <Label>입력 중 마우스 숨기기</Label>
          <p className="text-xs text-muted-foreground">
            Hide the mouse cursor when typing in the terminal.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.terminalMouseHideWhileTyping ?? false}
          onClick={() =>
            updateSettings({
              terminalMouseHideWhileTyping: !settings.terminalMouseHideWhileTyping
            })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            (settings.terminalMouseHideWhileTyping ?? false)
              ? 'bg-foreground'
              : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              (settings.terminalMouseHideWhileTyping ?? false) ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </SearchableSetting>

      <SearchableSetting
        title="색상 재정의"
        description="터미널의 개별 색상을 덮어씁니다."
        keywords={['color', 'override', 'ansi', 'palette', 'theme']}
        className="space-y-3"
      >
        <div className="space-y-2">
          <button
            onClick={() => setColorOverridesExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <span className={`transition-transform ${colorOverridesExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            색상 재정의
          </button>
          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              colorOverridesExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 space-y-4">
              {COLOR_OVERRIDE_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.keys.map((item) => (
                      <ColorField
                        key={item.key}
                        label={item.label}
                        description={item.description}
                        value={settings.terminalColorOverrides?.[item.key] ?? ''}
                        fallback=""
                        onChange={(value) =>
                          updateSettings({
                            terminalColorOverrides: {
                              ...settings.terminalColorOverrides,
                              [item.key]: value || undefined
                            }
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ terminalColorOverrides: undefined })}
              >
                Reset all color overrides
              </Button>
            </div>
          </div>
        </div>
      </SearchableSetting>
    </section>
  )
}
