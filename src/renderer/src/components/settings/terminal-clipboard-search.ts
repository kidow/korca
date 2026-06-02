import type { SettingsSearchEntry } from './settings-search'

export const TERMINAL_CLIPBOARD_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '선택 시 자동 복사',
    description: '선택하자마자 터미널 선택 영역을 클립보드로 자동 복사합니다.',
    keywords: [
      'clipboard',
      'copy',
      'select',
      'selection',
      'auto',
      'automatic',
      'x11',
      'linux',
      'gnome',
      'paste'
    ]
  },
  {
    title: 'TUI 클립보드 쓰기 허용(OSC 52)',
    description:
      'SSH를 포함해 터미널 안의 프로그램이 OSC 52로 시스템 클립보드에 복사하도록 허용합니다.',
    keywords: [
      'osc 52',
      'osc52',
      'clipboard',
      'tmux',
      'neovim',
      'nvim',
      'fzf',
      'ssh',
      'remote',
      'copy',
      'paste'
    ]
  }
]
