export type FeatureWallTileId =
  | 'tile-01'
  | 'tile-02'
  | 'tile-03'
  | 'tile-04'
  | 'tile-05'
  | 'tile-06'
  | 'tile-07'
  | 'tile-08'
  | 'tile-09'
  | 'tile-10'
  | 'tile-11'
  | 'tile-12'

type FeatureWallTileBase = {
  id: FeatureWallTileId
  title: string
  caption: string
  owner: string
  docsUrl: string
}

export type FeatureWallTile =
  | (FeatureWallTileBase & {
      kind: 'media'
      gifPath: string
      posterPath: string
      recordedAtPath: string
    })
  | (FeatureWallTileBase & {
      kind: 'agent-status-mockup'
    })

export const FEATURE_WALL_MEDIA_TILE_IDS = [
  'tile-01',
  'tile-02',
  'tile-03',
  'tile-04',
  'tile-05',
  'tile-06',
  'tile-07',
  'tile-08',
  'tile-09',
  'tile-10',
  'tile-11',
  'tile-12'
] as const satisfies readonly FeatureWallTileId[]

export type FeatureWallMediaTileId = (typeof FEATURE_WALL_MEDIA_TILE_IDS)[number]

export type FeatureWallMediaTile = Extract<FeatureWallTile, { kind: 'media' }>

export function isFeatureWallMediaTile(tile: FeatureWallTile): tile is FeatureWallMediaTile {
  return tile.kind === 'media'
}

export const FEATURE_WALL_TILES: readonly FeatureWallTile[] = [
  {
    id: 'tile-01',
    kind: 'media',
    title: '작업공간 병렬 오케스트레이션',
    caption:
      '각 작업에 독립된 작업공간을 할당합니다. stash도, 브랜치 씨름도 없습니다. 에이전트에 일을 나눠 맡기고, 비교한 뒤, 가장 좋은 결과로 이어갑니다.',
    gifPath: 'tile-01.gif',
    posterPath: 'tile-01.poster.jpg',
    recordedAtPath: 'tile-01.recorded-at.json',
    owner: 'worktree-orchestration',
    docsUrl: 'https://www.onkorca.dev/docs/model/worktrees'
  },
  {
    id: 'tile-02',
    kind: 'media',
    title: 'Ghostty급 터미널',
    caption: 'WebGL 렌더링, 무제한 분할, 재시작 후 스크롤백 복원, 전체 스크롤백 검색을 지원합니다.',
    gifPath: 'tile-02.gif',
    posterPath: 'tile-02.poster.jpg',
    recordedAtPath: 'tile-02.recorded-at.json',
    owner: 'terminal',
    docsUrl: 'https://www.onkorca.dev/docs/terminal'
  },
  {
    id: 'tile-03',
    kind: 'media',
    title: 'GitHub · Linear 기본 통합',
    caption:
      'Tasks에서 연결된 GitHub 또는 Linear 작업을 찾아 문맥을 열고, 도구를 바꾸지 않고 작업공간을 시작합니다.',
    gifPath: 'tile-03.gif',
    posterPath: 'tile-03.poster.jpg',
    recordedAtPath: 'tile-03.recorded-at.json',
    owner: 'task-integrations',
    docsUrl: 'https://www.onkorca.dev/docs/review/linear'
  },
  {
    id: 'tile-04',
    kind: 'media',
    title: '지원되는 CLI 에이전트',
    caption:
      'Claude Code, Codex, Cursor CLI, Gemini, Copilot, OpenCode, Pi가 미리 구성되어 있습니다.',
    gifPath: 'tile-04.gif',
    posterPath: 'tile-04.poster.jpg',
    recordedAtPath: 'tile-04.recorded-at.json',
    owner: 'agent-integrations',
    docsUrl: 'https://www.onkorca.dev/docs/agents/supported'
  },
  {
    id: 'tile-05',
    kind: 'media',
    title: '내장 브라우저 + 디자인 모드',
    caption:
      '작업공간마다 실제 Chromium 창이 있습니다. UI 요소를 클릭하면 HTML, CSS, 잘라낸 스크린샷을 에이전트에 보낼 수 있습니다.',
    gifPath: 'tile-05.gif',
    posterPath: 'tile-05.poster.jpg',
    recordedAtPath: 'tile-05.recorded-at.json',
    owner: 'browser-experience',
    docsUrl: 'https://www.onkorca.dev/docs/browser/design-mode'
  },
  {
    id: 'tile-06',
    kind: 'media',
    title: '원격 작업공간',
    caption:
      '원격 머신에서도 Korca의 편집, git, 터미널 흐름을 그대로 유지하며 에이전트를 실행합니다.',
    gifPath: 'tile-06.gif',
    posterPath: 'tile-06.poster.jpg',
    recordedAtPath: 'tile-06.recorded-at.json',
    owner: 'ssh-workspaces',
    docsUrl: 'https://www.onkorca.dev/docs/ssh'
  },
  {
    id: 'tile-07',
    kind: 'media',
    title: 'Monaco 에디터, 드래그로 에이전트 전달',
    caption:
      'VS Code 기반 에디터, 전체 자동 저장, 숨김 파일까지 포함한 빠른 열기, 파일이나 Finder 이미지를 에이전트 프롬프트로 드래그 앤 드롭합니다.',
    gifPath: 'tile-07.gif',
    posterPath: 'tile-07.poster.jpg',
    recordedAtPath: 'tile-07.recorded-at.json',
    owner: 'editor',
    docsUrl: 'https://www.onkorca.dev/docs/editing/file-explorer'
  },
  {
    id: 'tile-08',
    kind: 'media',
    title: '인라인 리뷰, 다시 에이전트로',
    caption:
      'diff 줄마다 마크다운 코멘트를 남기고, 묶어서 에이전트로 다시 보냅니다. CI 확인, 충돌 해결, PR 열기까지 앱 안에서 처리합니다.',
    gifPath: 'tile-08.gif',
    posterPath: 'tile-08.poster.jpg',
    recordedAtPath: 'tile-08.recorded-at.json',
    owner: 'diff-review',
    docsUrl: 'https://www.onkorca.dev/docs/review/annotate-ai-diff'
  },
  {
    id: 'tile-09',
    kind: 'media',
    title: 'Korca CLI',
    caption:
      '에이전트가 Korca도 조작할 수 있습니다. 작업공간 생성, 화면 스냅샷, 클릭, 입력을 수행합니다.',
    gifPath: 'tile-09.gif',
    posterPath: 'tile-09.poster.jpg',
    recordedAtPath: 'tile-09.recorded-at.json',
    owner: 'korca-cli',
    docsUrl: 'https://www.onkorca.dev/docs/cli/overview'
  },
  {
    id: 'tile-10',
    kind: 'media',
    title: '키보드 중심',
    caption:
      '작업공간을 빠르게 이동하고, 파일을 열고, 모든 단축키를 재매핑합니다. 손가락 속도로 움직이세요.',
    gifPath: 'tile-10.gif',
    posterPath: 'tile-10.poster.jpg',
    recordedAtPath: 'tile-10.recorded-at.json',
    owner: 'keyboard-ux',
    docsUrl: 'https://www.onkorca.dev/docs/model/quick-open'
  },
  {
    id: 'tile-11',
    kind: 'media',
    title: '사용량 · rate limit 인식',
    caption:
      'Claude와 Codex 사용량, rate limit 초기화 시점, Codex 계정 교체를 다시 로그인 없이 확인합니다.',
    gifPath: 'tile-11.gif',
    posterPath: 'tile-11.poster.jpg',
    recordedAtPath: 'tile-11.recorded-at.json',
    owner: 'usage-rate-limits',
    docsUrl: 'https://www.onkorca.dev/docs/agents/usage-tracking'
  },
  {
    id: 'tile-12',
    kind: 'media',
    title: 'PDF, 이미지, CSV, Markdown',
    caption:
      '리포지토리 안의 모든 것을 미리 봅니다. PDF, 이미지 diff 모드, CSV 표, 위키 링크가 걸린 Markdown 검색까지 지원합니다.',
    gifPath: 'tile-12.gif',
    posterPath: 'tile-12.poster.jpg',
    recordedAtPath: 'tile-12.recorded-at.json',
    owner: 'file-preview',
    docsUrl: 'https://www.onkorca.dev/docs/editing/viewers'
  }
] as const
