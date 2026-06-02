import type { SettingsSearchEntry } from './settings-search'

export const BROWSER_USE_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Korca CLI 사용',
    description: '에이전트가 브라우저를 제어할 수 있도록 Korca CLI를 등록합니다.',
    keywords: ['browser use', 'cli', 'korca', 'path', 'command', 'shell', 'enable', 'setup']
  },
  {
    title: '브라우저 사용 스킬 설치',
    description: '에이전트가 Korca의 브라우저를 조작할 수 있도록 Browser Use 스킬을 설치합니다.',
    keywords: [
      'browser use',
      'skill',
      'agent',
      'install',
      'korca-cli',
      'npx',
      'agent-browser',
      'automation'
    ]
  },
  {
    title: '브라우저 쿠키 가져오기',
    description:
      'Chrome, Edge 또는 다른 브라우저의 쿠키를 가져와 에이전트가 로그인 정보를 재사용할 수 있게 합니다.',
    keywords: [
      'browser use',
      'cookies',
      'session',
      'import',
      'login',
      'auth',
      'chrome',
      'edge',
      'arc',
      'computer use',
      'system browser',
      'existing session',
      'authenticated browser',
      'chrome profile',
      'edge profile',
      'arc profile'
    ]
  }
]
