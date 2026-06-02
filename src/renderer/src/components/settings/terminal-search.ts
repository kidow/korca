import type { SettingsSearchEntry } from './settings-search'
import { TERMINAL_CLIPBOARD_SEARCH_ENTRIES } from './terminal-clipboard-search'
import { TERMINAL_WINDOWS_SEARCH_ENTRIES } from './terminal-windows-search'

export const TERMINAL_TYPOGRAPHY_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '글꼴 크기',
    description: '새 창과 실시간 업데이트에 사용할 기본 터미널 글꼴 크기입니다.',
    keywords: ['terminal', 'typography', 'text size']
  },
  {
    title: '글꼴 패밀리',
    description: '새 창과 실시간 업데이트에 사용할 기본 터미널 글꼴 패밀리입니다.',
    keywords: ['terminal', 'typography', 'font']
  },
  {
    title: '글꼴 굵기',
    description: '터미널 텍스트의 글꼴 굵기를 조절합니다.',
    keywords: ['terminal', 'typography', 'weight']
  },
  {
    title: '줄 높이',
    description: '터미널 줄 높이 배율을 조절합니다.',
    keywords: ['terminal', 'typography', 'line height', 'spacing']
  },
  {
    title: '글꼴 리거처',
    description:
      '리거처를 지원하는 글꼴에서 프로그래밍 리거처(예: => → ≠ ≥)를 표시합니다. "자동"은 Fira Code, JetBrains Mono, Cascadia Code, Iosevka 같은 알려진 리거처 글꼴에만 리거처를 켭니다.',
    keywords: [
      'terminal',
      'typography',
      'ligatures',
      'ligature',
      'fira code',
      'jetbrains mono',
      'cascadia code',
      'iosevka',
      'calt',
      'font features'
    ]
  }
]

export const TERMINAL_RENDERING_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'GPU 가속',
    description:
      '터미널이 xterm.js WebGL 렌더링을 사용할지 정합니다. 자동은 Linux에서 드라이버 글리프 손상을 피하려고 DOM을 쓰고, 그 외에는 WebGL을 시도한 뒤 DOM으로 폴백합니다.',
    keywords: [
      'terminal',
      'gpu',
      'acceleration',
      'webgl',
      'renderer',
      'rendering',
      'graphics',
      'linux',
      'vscode'
    ]
  }
]

export const TERMINAL_CURSOR_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '커서 모양',
    description: 'Korca 터미널 창의 기본 커서 모양입니다.',
    keywords: ['terminal', 'cursor', 'bar', 'block', 'underline']
  },
  {
    title: '커서 깜빡임',
    description: '선택한 커서 모양의 깜빡임 변형을 사용합니다.',
    keywords: ['terminal', 'cursor', 'blink']
  },
  {
    title: '커서 불투명도',
    description: '터미널 커서의 불투명도입니다.',
    keywords: ['terminal', 'cursor', 'opacity', 'transparency']
  }
]

export const TERMINAL_PANE_APPEARANCE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '비활성 창 불투명도',
    description: '현재 활성 상태가 아닌 창에 적용할 불투명도입니다.',
    keywords: ['pane', 'opacity', 'dimming']
  },
  {
    title: '구분선 두께',
    description: '창 구분선의 두께입니다.',
    keywords: ['pane', 'divider', 'thickness']
  }
]

export const TERMINAL_PANE_INTERACTION_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '마우스 따라 포커스',
    description:
      '터미널 창 위에 마우스를 올리면 클릭하지 않아도 활성화됩니다. Ghostty의 focus-follows-mouse 설정과 비슷합니다. 선택과 창 전환은 안전하게 유지됩니다.',
    keywords: ['focus', 'follows', 'mouse', 'hover', 'pane', 'ghostty', 'active']
  },
  ...TERMINAL_CLIPBOARD_SEARCH_ENTRIES
]

export const TERMINAL_DARK_THEME_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '다크 테마',
    description: '다크 모드에서 사용할 터미널 테마를 선택합니다.',
    keywords: ['terminal', 'theme', 'dark', 'preview']
  },
  {
    title: '다크 구분선 색상',
    description: '다크 모드에서 창 사이 구분선 색상을 조절합니다.',
    keywords: ['terminal', 'divider', 'dark', 'color']
  }
]

export const TERMINAL_LIGHT_THEME_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '라이트 모드에서 별도 테마 사용',
    description: '비활성화하면 라이트 모드에서 다크 터미널 테마를 다시 사용합니다.',
    keywords: ['terminal', 'light mode', 'theme']
  },
  {
    title: '라이트 테마',
    description: 'Korca가 라이트 모드일 때 사용할 테마를 선택합니다.',
    keywords: ['terminal', 'theme', 'light', 'preview']
  },
  {
    title: '라이트 구분선 색상',
    description: '라이트 모드에서 창 사이 구분선 색상을 조절합니다.',
    keywords: ['terminal', 'divider', 'light', 'color']
  }
]

export const TERMINAL_ADVANCED_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '스크롤백 크기',
    description: '터미널 스크롤백 버퍼의 최대 크기입니다.',
    keywords: ['terminal', 'scrollback', 'buffer', 'memory']
  },
  {
    title: '단어 구분자',
    description: '더블클릭 선택에서 단어 경계로 취급할 문자입니다.',
    keywords: ['word', 'separator', 'boundary', 'double-click', 'selection']
  }
]

export const TERMINAL_MAC_OPTION_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Option 키를 Alt로 사용',
    description:
      'macOS Option 키가 Alt/Esc 시퀀스를 보낼지, 문자를 조합할지 정합니다. Ghostty의 macos-option-as-alt와 같습니다.',
    keywords: [
      'terminal',
      'option',
      'alt',
      'key',
      'meta',
      'compose',
      'mac',
      'macos',
      'keyboard',
      'german',
      'international',
      'readline',
      'ghostty'
    ]
  }
]

export const TERMINAL_MAC_YEN_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'JIS 엔(¥)을 백슬래시(\\)로 변환',
    description: 'JIS 엔(¥) 키를 누를 때 백슬래시(\\)를 보내도록 할지 정합니다.',
    keywords: [
      'terminal',
      'yen',
      'backslash',
      'japanese',
      'keyboard',
      'mac',
      'macos',
      'jis',
      'intl'
    ]
  }
]

export const TERMINAL_GHOSTTY_IMPORT_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Ghostty에서 가져오기',
    description: '지원되는 Ghostty 터미널 설정을 한 번만 가져옵니다.',
    keywords: ['ghostty', 'import', 'terminal', 'config', 'settings']
  }
]

export const MANAGE_SESSIONS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '세션 관리',
    description:
      '세션을 종료하거나 저장된 스크롤백을 지우거나 데몬을 다시 시작해 멈춘 터미널을 복구합니다.',
    keywords: [
      'daemon',
      'pty',
      'sessions',
      'manage',
      'kill',
      'kill all',
      'clear',
      'history',
      'scrollback',
      'restart',
      'terminal',
      'recover',
      'frozen',
      'unfreeze'
    ]
  }
]

export const TERMINAL_WINDOW_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '배경 불투명도',
    description: '터미널 배경의 투명도를 조절합니다.',
    keywords: ['opacity', 'transparency', 'background', 'alpha']
  },
  {
    title: '창 블러',
    description: '터미널 창에 배경 블러를 적용합니다. 다시 시작해야 합니다.',
    keywords: ['window', 'blur', 'background', 'transparency', 'vibrancy']
  },
  {
    title: '가로 여백',
    description: '터미널 그리드 주변의 가로 여백(픽셀)입니다.',
    keywords: ['padding', 'horizontal', 'spacing', 'margin']
  },
  {
    title: '세로 여백',
    description: '터미널 그리드 주변의 세로 여백(픽셀)입니다.',
    keywords: ['padding', 'vertical', 'spacing', 'margin']
  },
  {
    title: '입력 중 마우스 숨기기',
    description: '터미널에 입력할 때 마우스 커서를 숨깁니다.',
    keywords: ['mouse', 'hide', 'typing', 'cursor']
  },
  {
    title: '색상 재정의',
    description: '터미널의 개별 색상을 덮어씁니다.',
    keywords: ['color', 'override', 'ansi', 'palette', 'theme']
  }
]

export const TERMINAL_SETUP_SCRIPT_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '설정 스크립트 위치',
    description:
      "새 작업 공간이 만들어질 때 저장소 설정 스크립트를 어디서 실행할지 정합니다. 세로 분할(기본), 가로 분할, 또는 '설정'이라는 배경 탭입니다.",
    keywords: [
      'setup',
      'script',
      'workspace',
      'split',
      'horizontal',
      'vertical',
      'tab',
      'new',
      'location',
      'launch'
    ]
  }
]

export const TERMINAL_APPEARANCE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  ...TERMINAL_TYPOGRAPHY_SEARCH_ENTRIES,
  ...TERMINAL_CURSOR_SEARCH_ENTRIES,
  ...TERMINAL_PANE_APPEARANCE_SEARCH_ENTRIES,
  ...TERMINAL_DARK_THEME_SEARCH_ENTRIES,
  ...TERMINAL_LIGHT_THEME_SEARCH_ENTRIES,
  ...TERMINAL_WINDOW_SEARCH_ENTRIES,
  ...TERMINAL_GHOSTTY_IMPORT_SEARCH_ENTRIES
]

export function getTerminalPaneSearchEntries(platform: {
  isWindows: boolean
  isMac: boolean
}): SettingsSearchEntry[] {
  // Why: the settings search index must mirror the visible controls. Keeping
  // platform-only controls out of other platforms' search results prevents
  // users from landing on an option the UI intentionally hides.
  return [
    ...TERMINAL_RENDERING_SEARCH_ENTRIES,
    ...TERMINAL_PANE_INTERACTION_SEARCH_ENTRIES,
    ...(platform.isWindows ? TERMINAL_WINDOWS_SEARCH_ENTRIES : []),
    ...TERMINAL_SETUP_SCRIPT_SEARCH_ENTRIES,
    ...MANAGE_SESSIONS_SEARCH_ENTRIES,
    ...TERMINAL_ADVANCED_SEARCH_ENTRIES,
    ...(platform.isMac
      ? [...TERMINAL_MAC_OPTION_SEARCH_ENTRIES, ...TERMINAL_MAC_YEN_SEARCH_ENTRIES]
      : [])
  ]
}
