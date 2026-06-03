import type { SettingsSearchEntry } from './settings-search'

export const EXPERIMENTAL_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '펫',
    description: '오른쪽 아래에 떠 있는 애니메이션 펫입니다.',
    keywords: [
      'experimental',
      'pet',
      'sidekick',
      'mascot',
      'overlay',
      'animated',
      'corner',
      'character'
    ]
  },
  {
    title: '에이전트 보기',
    description: '에이전트 완료와 대기 상태를 보여주는 왼쪽 사이드바 스레드 피드입니다.',
    keywords: [
      'experimental',
      'agents',
      'agents view',
      'activity',
      'notifications',
      'worktrees',
      'timeline',
      'unread',
      'bell',
      'sidebar'
    ]
  },
  {
    title: '터미널 주의',
    description: '터미널 벨과 에이전트 완료 이벤트에 맞춰 창을 지속적으로 하이라이트합니다.',
    keywords: [
      'experimental',
      'terminal',
      'attention',
      'highlight',
      'pane',
      'bell',
      'notification',
      'agent',
      'completion',
      'unread'
    ]
  },
  {
    title: '압축된 워크트리 카드',
    description: '자세한 메타데이터 행 대신 한 줄짜리 워크트리 카드를 사용합니다.',
    keywords: [
      'experimental',
      'worktree',
      'worktrees',
      'workspace',
      'workspaces',
      'compact',
      'sidebar',
      'cards',
      'branch',
      'metadata'
    ]
  },
  {
    title: '워크트리의 심볼릭 링크',
    description:
      '설정한 파일이나 폴더를 새로 만든 워크트리에 자동으로 심볼릭 링크해 공유 상태(env, 캐시, 설치)를 연결된 채로 유지합니다.',
    keywords: [
      'experimental',
      'worktree',
      'worktrees',
      'symlink',
      'symlinks',
      'link',
      'links',
      'shared',
      'env',
      'node_modules'
    ]
  },
  {
    title: '스마트 새 탭 메뉴',
    description:
      '새 탭 메뉴에 입력하면 터미널을 열고, 에이전트를 시작하고, URL을 방문하고, 파일을 열거나 만들 수 있습니다.',
    keywords: [
      'experimental',
      'smart',
      'new tab',
      'new tab menu',
      'launcher',
      'unified',
      'plus',
      'terminal',
      'agents',
      'claude',
      'codex',
      'url',
      'file'
    ]
  }
]

// Why: title-keyed lookup avoids a fragile numeric-index invariant — the array
// shape can change without breaking consumers, and a typo/rename throws loudly
// instead of silently matching the wrong (or empty) entry.
function findEntry(title: string): SettingsSearchEntry {
  const entry = EXPERIMENTAL_PANE_SEARCH_ENTRIES.find((e) => e.title === title)
  if (!entry) {
    throw new Error(`Missing experimental-pane search entry: "${title}"`)
  }
  return entry
}

export const EXPERIMENTAL_SEARCH_ENTRY = {
  pet: findEntry('펫'),
  activity: findEntry('에이전트 보기'),
  terminalAttention: findEntry('터미널 주의'),
  compactWorktreeCards: findEntry('압축된 워크트리 카드'),
  symlinks: findEntry('워크트리의 심볼릭 링크'),
  unifiedNewTabLauncher: findEntry('스마트 새 탭 메뉴')
} as const
