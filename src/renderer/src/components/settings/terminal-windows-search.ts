import type { SettingsSearchEntry } from './settings-search'

export const TERMINAL_WINDOWS_SHELL_SEARCH_ENTRY: SettingsSearchEntry[] = [
  {
    title: '기본 셸',
    description: 'Windows에서 새 터미널 창에 사용할 기본 셸을 선택합니다.',
    keywords: [
      'terminal',
      'windows',
      'shell',
      'powershell',
      'cmd',
      'command prompt',
      'default',
      'git bash',
      'wsl',
      'linux',
      'bash',
      'bash.exe',
      'ubuntu'
    ]
  }
]

export const TERMINAL_WINDOWS_POWERSHELL_IMPLEMENTATION_SEARCH_ENTRY: SettingsSearchEntry[] = [
  {
    title: 'PowerShell 버전',
    description: 'PowerShell 셸 옵션이 Windows PowerShell을 열지, PowerShell 7+를 열지 선택합니다.',
    keywords: [
      'terminal',
      'windows',
      'powershell',
      'windows powershell',
      'powershell 7',
      'pwsh',
      'version',
      'advanced'
    ]
  }
]

export const TERMINAL_WINDOWS_WSL_DISTRO_SEARCH_ENTRY: SettingsSearchEntry[] = [
  {
    title: 'WSL 배포판',
    description: '새 WSL 터미널과 로컬 에이전트 검사가 사용할 WSL 배포판을 선택합니다.',
    keywords: [
      'terminal',
      'windows',
      'wsl',
      'linux',
      'distribution',
      'distro',
      'ubuntu',
      'debian',
      'default'
    ]
  }
]

export const TERMINAL_RIGHT_CLICK_TO_PASTE_SEARCH_ENTRY: SettingsSearchEntry[] = [
  {
    title: '오른쪽 클릭으로 붙여넣기',
    description:
      'Windows에서는 오른쪽 클릭으로 클립보드를 터미널에 붙여넣습니다. 컨텍스트 메뉴를 열려면 Ctrl+오른쪽 클릭을 사용합니다.',
    keywords: ['terminal', 'windows', 'right click', 'paste', 'context menu']
  }
]

export const TERMINAL_WINDOWS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  ...TERMINAL_WINDOWS_SHELL_SEARCH_ENTRY,
  ...TERMINAL_WINDOWS_WSL_DISTRO_SEARCH_ENTRY,
  ...TERMINAL_WINDOWS_POWERSHELL_IMPLEMENTATION_SEARCH_ENTRY,
  ...TERMINAL_RIGHT_CLICK_TO_PASTE_SEARCH_ENTRY
]
