import type { StatusBarItem } from '../../../../shared/types'
import type { SettingsSearchEntry } from './settings-search'
import { TERMINAL_APPEARANCE_SEARCH_ENTRIES } from './terminal-search'

export const STATUS_BAR_TOGGLES: readonly {
  id: StatusBarItem
  title: string
  description: string
  keywords: string[]
  toggleDescription: string
}[] = [
  {
    id: 'claude',
    title: 'Claude 사용량',
    description: '상태 표시줄에 Claude 토큰과 비용 사용량을 표시합니다.',
    keywords: ['status bar', 'claude', 'usage', 'tokens', 'cost', 'anthropic'],
    toggleDescription: '활성 작업 공간의 Claude 토큰과 비용 사용량을 표시합니다.'
  },
  {
    id: 'codex',
    title: 'Codex 사용량',
    description: '상태 표시줄에 Codex 토큰과 비용 사용량을 표시합니다.',
    keywords: ['status bar', 'codex', 'usage', 'tokens', 'cost', 'openai'],
    toggleDescription: '활성 작업 공간의 Codex 토큰과 비용 사용량을 표시합니다.'
  },
  {
    id: 'gemini',
    title: 'Gemini 사용량',
    description: '상태 표시줄에 Gemini 토큰과 비용 사용량을 표시합니다.',
    keywords: ['status bar', 'gemini', 'usage', 'tokens', 'cost', 'google'],
    toggleDescription: '활성 작업 공간의 Gemini 토큰과 비용 사용량을 표시합니다.'
  },
  {
    id: 'opencode-go',
    title: 'OpenCode Go 사용량',
    description: '상태 표시줄에 OpenCode Go 토큰과 비용 사용량을 표시합니다.',
    keywords: ['status bar', 'opencode', 'opencode-go', 'usage', 'tokens', 'cost'],
    toggleDescription: '활성 작업 공간의 OpenCode Go 토큰과 비용 사용량을 표시합니다.'
  },
  {
    id: 'ssh',
    title: 'SSH 상태',
    description: '상태 표시줄에 활성 SSH 연결 상태를 표시합니다.',
    keywords: ['status bar', 'ssh', 'remote', 'connection', 'host'],
    toggleDescription: '활성 SSH 연결을 표시합니다. SSH 대상이 설정되어야만 보입니다.'
  },
  {
    id: 'resource-usage',
    title: '리소스 관리자',
    description: '상태 표시줄에 CPU, 메모리, 터미널 세션, 작업 공간 디스크 사용량을 표시합니다.',
    keywords: ['status bar', 'resource', 'manager', 'memory', 'cpu', 'terminal', 'disk', 'space'],
    toggleDescription:
      '리소스 관리자를 표시합니다. 클릭하면 CPU, 메모리, 세션, 데몬 제어, 작업 공간 디스크 검사를 볼 수 있습니다.'
  },
  {
    id: 'ports',
    title: '포트',
    description: '상태 표시줄에 실시간 작업 공간 포트를 표시합니다.',
    keywords: ['status bar', 'ports', 'localhost', 'server', 'workspace'],
    toggleDescription:
      '실시간 작업 공간 포트를 표시합니다. 클릭하면 작업 공간 범위 포트와 외부 리스너를 볼 수 있습니다.'
  }
]

export const THEME_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '테마',
    description: '앱 창에서 Korca의 모습을 선택합니다.',
    keywords: ['dark', 'light', 'system']
  }
]

export const ZOOM_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'UI 확대',
    description: '애플리케이션 인터페이스 전체를 확대합니다.',
    keywords: ['zoom', 'scale', 'shortcut']
  }
]

export const TYPOGRAPHY_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'IDE 글꼴',
    description: 'Korca 인터페이스에 사용할 글꼴을 선택합니다.',
    keywords: ['font', 'typeface', 'typography', 'ide', 'korca', 'interface', 'app', 'ui']
  }
]

export const LAYOUT_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Git 무시 파일 표시',
    description: '파일 탐색기에서 .gitignore와 일치하는 파일을 흐리게 표시합니다.',
    keywords: ['git', 'gitignore', 'ignored', 'file explorer', 'sidebar', 'hide']
  }
]

export const TITLEBAR_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '타이틀바 앱 이름',
    description: '타이틀바에 Korca를 표시합니다.',
    keywords: ['titlebar', 'korca', 'app', 'name', 'brand']
  }
]

export const STATUS_BAR_ENTRIES: SettingsSearchEntry[] = STATUS_BAR_TOGGLES.map(
  ({ title, description, keywords }) => ({ title, description, keywords })
)

export const SIDEBAR_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '작업 버튼 표시',
    description: '왼쪽 사이드바 상단에 작업 버튼을 표시합니다.',
    keywords: ['tasks', 'sidebar', 'button', 'hide', 'show', 'github', 'linear']
  },
  {
    title: 'Korca 모바일 버튼 표시',
    description: '왼쪽 사이드바 상단에 Korca 모바일 버튼을 표시합니다.',
    keywords: ['mobile', 'phone', 'sidebar', 'button', 'hide', 'show', 'toolbox']
  }
]

export const APPEARANCE_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  ...THEME_ENTRIES,
  ...TYPOGRAPHY_ENTRIES,
  ...ZOOM_ENTRIES,
  ...TERMINAL_APPEARANCE_SEARCH_ENTRIES,
  ...LAYOUT_ENTRIES,
  ...TITLEBAR_ENTRIES,
  ...STATUS_BAR_ENTRIES,
  ...SIDEBAR_ENTRIES
]
