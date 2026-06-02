import type { SettingsSearchEntry } from './settings-search'
import { AUTO_RENAME_BRANCH_SEARCH_ENTRIES } from './auto-rename-branch-search'

export const GIT_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '브랜치 접두사',
    description: '워크트리를 만들 때 브랜치 이름에 붙일 접두사입니다.',
    keywords: ['branch naming', 'git username', 'custom']
  },
  {
    title: '로컬 기준 ref 새로고침',
    description:
      '로컬 main 또는 master를 안전하게 fast-forward하여 AI 도구와 diff가 최신 기준을 사용하게 합니다.',
    keywords: [
      'main',
      'master',
      'origin/main',
      'git diff',
      'base ref',
      'fresh base',
      'safely',
      'worktree'
    ]
  },
  ...AUTO_RENAME_BRANCH_SEARCH_ENTRIES,
  {
    title: 'GitHub API 한도',
    description: '현재 GitHub CLI의 REST, Search, GraphQL 속도 제한입니다.',
    keywords: ['github', 'gh', 'graphql', 'rate limit', 'api budget']
  },
  {
    title: 'GitLab API 한도',
    description: '가능한 경우 현재 GitLab CLI의 REST 속도 제한 헤더입니다.',
    keywords: ['gitlab', 'glab', 'rate limit', 'api budget']
  },
  {
    title: 'Korca 기여 표기',
    description: '커밋, PR, 이슈에 Korca 기여 표기를 추가합니다.',
    keywords: ['github', 'gh', 'pr', 'issue', 'co-author', 'coauthored', 'attribution', 'korca']
  }
]
