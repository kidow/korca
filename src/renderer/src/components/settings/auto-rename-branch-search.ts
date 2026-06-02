import type { SettingsSearchEntry } from './settings-search'

export const AUTO_RENAME_BRANCH_PARENT_SEARCH_ENTRY: SettingsSearchEntry = {
  title: '브랜치 자동 이름 변경',
  description: '에이전트가 시작되면 작업 내용을 바탕으로 자동 생성된 브랜치 이름을 바꿉니다.',
  keywords: [
    'branch',
    'rename',
    'auto',
    'creature name',
    'agent',
    'prompt',
    'worktree',
    'model',
    'slug'
  ]
}

export const AUTO_RENAME_BRANCH_ADVANCED_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '브랜치 이름 프롬프트',
    description: '브랜치 이름을 생성할 때만 덧붙는 추가 프롬프트 텍스트입니다.',
    keywords: ['prompt', 'instructions', 'built-in prompt', 'slug', 'kebab-case']
  },
  {
    title: '브랜치 이름 모델',
    description: '브랜치 이름 생성에 다른 모델을 사용합니다.',
    keywords: ['model', 'override', 'thinking']
  }
]

export const AUTO_RENAME_BRANCH_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  AUTO_RENAME_BRANCH_PARENT_SEARCH_ENTRY,
  ...AUTO_RENAME_BRANCH_ADVANCED_SEARCH_ENTRIES
]
