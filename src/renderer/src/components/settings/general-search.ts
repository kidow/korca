import type { SettingsSearchEntry } from './settings-search'

export const GENERAL_WORKSPACE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '작업 공간 디렉터리',
    description: '작업 공간 폴더가 만들어질 루트 디렉터리입니다.',
    keywords: ['workspace', 'folder', 'path', 'worktree']
  },
  {
    title: '작업 공간 중첩',
    description: '저장소 이름의 하위 폴더 안에 작업 공간을 만듭니다.',
    keywords: ['nested', 'subfolder', 'directory']
  },
  {
    title: '작업 공간 삭제 전 확인',
    description: '작업 공간을 삭제하기 전에 확인 대화상자를 보여줍니다.',
    keywords: ['delete', 'worktree', 'confirm', 'dialog', 'skip', 'prompt']
  },
  {
    title: '자동화 삭제 전 확인',
    description: '자동화와 실행 기록을 삭제하기 전에 확인 대화상자를 보여줍니다.',
    keywords: ['delete', 'automation', 'confirm', 'dialog', 'skip', 'prompt']
  },
  {
    title: '열기 메뉴',
    description: '작업 공간의 열기 메뉴에 사용자 지정 실행 항목을 추가합니다.',
    keywords: ['open in', 'editor', 'launcher', 'cursor', 'zed', 'command', 'vscode']
  }
]

export const GENERAL_NETWORK_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'HTTP 프록시',
    description: 'Korca의 네트워크 요청과 로컬 터미널 자식 프로세스에 사용할 프록시 URL입니다.',
    keywords: ['proxy', 'http_proxy', 'https_proxy', 'network', 'dock', 'launchpad']
  },
  {
    title: '프록시 우회 규칙',
    description: '설정된 HTTP 프록시를 우회할 호스트입니다.',
    keywords: ['proxy', 'bypass', 'no_proxy', 'localhost', 'network']
  }
]

export const GENERAL_EDITOR_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '파일 자동 저장',
    description: '잠시 멈춘 뒤 편집기와 수정 가능한 diff 변경 사항을 자동으로 저장합니다.',
    keywords: ['autosave', 'save']
  },
  {
    title: '자동 저장 지연',
    description: '마지막 편집 후 자동 저장하기까지 Korca가 기다리는 시간입니다.',
    keywords: ['autosave', 'delay', 'milliseconds']
  },
  {
    title: '기본 diff 보기',
    description: 'git diff를 기본으로 표시할 선호 형식입니다.',
    keywords: ['diff', 'view', 'inline', 'side-by-side', 'split']
  },
  {
    title: '기본 diff 파일 트리',
    description: '통합 diff 보기를 열 때 파일 트리를 표시하거나 숨깁니다.',
    keywords: ['diff', 'tree', 'file tree', 'combined diff', 'sidebar']
  },
  {
    title: '미니맵',
    description: '파일을 편집할 때 미니맵 개요를 표시합니다.',
    keywords: ['minimap', 'overview', 'code', 'scroll']
  },
  {
    title: '마크다운 리뷰 메모',
    description: '리치 편집기 모드에서 로컬 마크다운 리뷰 메모 컨트롤을 표시합니다.',
    keywords: ['markdown', 'review', 'notes', 'annotations', 'agents']
  }
]

export const GENERAL_NAVIGATION_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '탭 순서',
    description: '최근 탭 또는 탭 스트립입니다.',
    keywords: [
      'recent tab order',
      'tab',
      'ctrl',
      'control',
      'recent',
      'mru',
      'sequential',
      'switch'
    ]
  }
]

export const GENERAL_CLI_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'Korca CLI',
    description: 'Korca CLI 명령을 등록하거나 제거합니다.',
    keywords: ['cli', 'path', 'terminal', 'command', 'shell command'],
    cmdJKeywords: ['cli', 'path', 'command', 'shell command'],
    targetSectionId: 'cli'
  },
  {
    title: '에이전트 스킬',
    description: '에이전트가 Korca CLI를 사용하도록 Korca 스킬을 설치합니다.',
    keywords: ['skill', 'agents', 'npx']
  }
]

export const GENERAL_UPDATE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '업데이트 확인',
    description: '앱 업데이트를 확인하고 더 최신의 Korca 버전을 설치합니다.',
    keywords: ['update', 'version', 'release notes', 'download']
  }
]

export const GENERAL_CACHE_TIMER_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '프롬프트 캐시 타이머',
    description:
      '프롬프트 캐시 만료까지 남은 시간을 보여주는 카운트다운 타이머입니다(Claude 에이전트).',
    keywords: ['cache', 'timer', 'prompt', 'ttl', 'claude', 'cost', 'tokens']
  }
]

export const GENERAL_AGENT_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '기본 에이전트',
    description: '새 작업 공간 작성기에서 AI 코딩 에이전트를 미리 선택합니다.',
    keywords: [
      'agent',
      'default',
      'claude',
      'openclaude',
      'open claude',
      'codex',
      'opencode',
      'pi',
      'omp',
      'gemini',
      'aider',
      'copilot',
      'grok'
    ]
  }
]

export const GENERAL_SUPPORT_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: 'GitHub에서 Korca에 별점 주기',
    description: 'gh CLI로 GitHub 별점을 남겨 프로젝트를 응원합니다.',
    keywords: ['star', 'github', 'support', 'feedback', 'like']
  }
]

export const GENERAL_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  ...GENERAL_WORKSPACE_SEARCH_ENTRIES,
  ...GENERAL_NETWORK_SEARCH_ENTRIES,
  ...GENERAL_NAVIGATION_SEARCH_ENTRIES,
  ...GENERAL_EDITOR_SEARCH_ENTRIES,
  ...GENERAL_CLI_SEARCH_ENTRIES,
  ...GENERAL_CACHE_TIMER_SEARCH_ENTRIES,
  ...GENERAL_UPDATE_SEARCH_ENTRIES,
  ...GENERAL_SUPPORT_SEARCH_ENTRIES
]
