import {
  FEATURE_WALL_TILES,
  isFeatureWallMediaTile,
  type FeatureWallMediaTile,
  type FeatureWallMediaTileId
} from './feature-wall-tiles'

export type FeatureWallWorkflowId =
  | 'tasks'
  | 'workspaces'
  | 'agents-orchestration'
  | 'workbench'
  | 'review'

export type FeatureWallWorkflow = {
  id: FeatureWallWorkflowId
  title: string
  meta: string
  lede: string
  primaryTileId: FeatureWallMediaTileId
  relatedTileIds: readonly FeatureWallMediaTileId[]
  docsUrl: string
}

export const FEATURE_WALL_WORKFLOWS: readonly FeatureWallWorkflow[] = [
  {
    id: 'workspaces',
    title: '작업공간',
    meta: '분리된 작업 · 문맥 유지',
    lede: 'Korca는 각 작업을 분리된 작업공간으로 나눠 에이전트가 병렬로 실행되도록 합니다.',
    primaryTileId: 'tile-01',
    relatedTileIds: ['tile-10'],
    docsUrl: 'https://www.onkorca.dev/docs/model/worktrees'
  },
  {
    id: 'tasks',
    title: '작업',
    meta: 'GitHub · Linear',
    lede: 'GitHub 또는 Linear에서 바로 작업을 시작합니다.',
    primaryTileId: 'tile-03',
    relatedTileIds: [],
    docsUrl: 'https://www.onkorca.dev/docs/review/linear'
  },
  {
    id: 'agents-orchestration',
    title: '에이전트',
    meta: '에이전트 · 사용량 · Korca CLI',
    lede: '여러 에이전트를 동시에 실행하고 진행 상황을 추적하며, 필요할 때는 자동화가 Korca를 대신 움직입니다.',
    primaryTileId: 'tile-04',
    relatedTileIds: ['tile-11', 'tile-09'],
    docsUrl: 'https://www.onkorca.dev/docs/agents/supported'
  },
  {
    id: 'workbench',
    title: '워크벤치',
    meta: '터미널 · 에디터 · 브라우저 · 파일',
    lede: '터미널 구성을 Korca로 가져온 뒤, 패널을 나눠 서버, 테스트, 로그, 에이전트를 나란히 유지합니다.',
    primaryTileId: 'tile-02',
    relatedTileIds: ['tile-07', 'tile-05', 'tile-12'],
    docsUrl: 'https://www.onkorca.dev/docs/terminal'
  },
  {
    id: 'review',
    title: '코드 리뷰',
    meta: 'diff · 코멘트 · PR',
    lede: '변경 내용을 검토하고, 집중된 피드백을 남긴 뒤, 에이전트에게 다시 전달합니다.',
    primaryTileId: 'tile-08',
    relatedTileIds: [],
    docsUrl: 'https://www.onkorca.dev/docs/review/annotate-ai-diff'
  }
] as const

export const FEATURE_WALL_WORKFLOW_IDS = FEATURE_WALL_WORKFLOWS.map(
  (w) => w.id
) as readonly FeatureWallWorkflowId[]

const TILE_BY_ID = new Map(
  FEATURE_WALL_TILES.filter(isFeatureWallMediaTile).map((tile) => [tile.id, tile])
)

export function getFeatureWallMediaTile(id: FeatureWallMediaTileId): FeatureWallMediaTile | null {
  return TILE_BY_ID.get(id) ?? null
}

export const DEFAULT_FEATURE_WALL_WORKFLOW_ID: FeatureWallWorkflowId = 'workspaces'
