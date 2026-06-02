import type { SettingsSearchEntry } from './settings-search'

export const ACCOUNTS_LOCATION_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '계정 위치',
    description: '제공자 계정을 이 장치에서 검사하고 추가할지, WSL에서 할지 선택합니다.',
    keywords: ['account', 'location', 'windows', 'wsl', 'linux', 'provider', 'auth']
  }
]

export const ACCOUNTS_CLAUDE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Claude 계정',
    description: '공유 채팅 컨텍스트를 유지하면서 Claude 계정 전환을 선택적으로 사용합니다.',
    keywords: ['claude', 'account', 'switch', 'active', 'status bar', 'quota', 'optional']
  }
]

export const ACCOUNTS_CODEX_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Codex 계정',
    description: 'Codex 계정 전환과 실시간 속도 제한 가져오기를 선택적으로 사용합니다.',
    keywords: [
      'codex',
      'account',
      'rate limit',
      'status bar',
      'quota',
      'optional',
      'reauthenticate',
      'expired',
      'out of date'
    ]
  },
  {
    title: '활성 Codex 계정',
    description: '저장된 선택적 Codex 계정 중 실시간 한도 조회에 사용할 계정을 선택합니다.',
    keywords: ['codex', 'account', 'switch', 'active', 'status bar', 'optional', 'sign in']
  }
]

export const ACCOUNTS_GEMINI_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Gemini CLI 자격 증명 사용',
    description: '로컬 Gemini CLI 설치에서 OAuth 자격 증명을 추출해 Google 인증에 사용합니다.',
    keywords: ['gemini', 'cli', 'oauth', 'credentials', 'experimental', 'rate limit', 'status bar']
  }
]

export const ACCOUNTS_OPENCODE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'OpenCode Go 세션 쿠키',
    description: '속도 제한 조회를 위해 opencode.ai 세션 쿠키를 붙여넣습니다.',
    keywords: ['opencode', 'cookie', 'session', 'rate limit', 'status bar']
  },
  {
    title: 'OpenCode Go 작업 공간 ID',
    description: '자동 조회가 실패했을 때 사용할 선택적 작업 공간 ID입니다.',
    keywords: ['opencode', 'workspace', 'id', 'wrk', 'rate limit', 'status bar']
  }
]

export const ACCOUNTS_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  ...ACCOUNTS_LOCATION_SEARCH_ENTRIES,
  ...ACCOUNTS_CLAUDE_SEARCH_ENTRIES,
  ...ACCOUNTS_CODEX_SEARCH_ENTRIES,
  ...ACCOUNTS_GEMINI_SEARCH_ENTRIES,
  ...ACCOUNTS_OPENCODE_SEARCH_ENTRIES
]
