import type { Repo } from '../../../../shared/types'
import { isFolderRepo } from '../../../../shared/repo-kind'
import type { SettingsSearchEntry } from './settings-search'

export function getRepositoryPaneSearchEntries(repo: Repo): SettingsSearchEntry[] {
  const isFolder = isFolderRepo(repo)
  return [
    {
      title: '표시 이름',
      description: '사이드바와 탭에 표시할 이 프로젝트의 표시 정보입니다.',
      keywords: [repo.displayName, repo.path, 'project name', 'repository name']
    },
    {
      title: '프로젝트 아이콘',
      description: '사이드바와 탭에 사용할 프로젝트 아이콘과 색상입니다.',
      keywords: [
        repo.displayName,
        'project icon',
        'repository icon',
        'color',
        'hex',
        'badge',
        'emoji',
        'favicon'
      ]
    },
    ...(isFolder
      ? []
      : [
          {
            title: '기본 워크트리 기준',
            description: '워크트리를 만들 때 사용할 기본 브랜치 또는 ref입니다.',
            keywords: [repo.displayName, 'base ref', 'branch']
          },
          {
            title: '워크트리 위치',
            description: '새 워크트리를 위한 이 프로젝트 전용 디렉터리입니다.',
            keywords: [
              repo.displayName,
              'worktree path',
              'workspace path',
              'directory',
              'relative',
              '../worktrees'
            ]
          },
          {
            title: 'Sparse Checkout 프리셋',
            description: 'sparse 워크트리 생성에 쓰는 저장된 디렉터리 세트입니다.',
            keywords: [
              repo.displayName,
              'sparse',
              'checkout',
              'preset',
              'presets',
              'directory',
              'directories',
              'monorepo'
            ]
          }
        ]),
    {
      title: '프로젝트 제거',
      description: '이 프로젝트를 Korca에서 제거합니다.',
      keywords: [repo.displayName, 'delete', 'project', 'repository']
    },
    ...(isFolder
      ? []
      : [
          {
            title: '소스 컨트롤 AI',
            description: '이 프로젝트에 대한 소스 컨트롤 생성 재정의입니다.',
            keywords: [
              repo.displayName,
              'source control',
              'ai',
              'commit message',
              'pull request',
              'pr',
              'branch name',
              'rename',
              'model',
              'prompt'
            ]
          },
          {
            title: '워크트리 심볼릭 링크',
            description: '기본 체크아웃에서 새로 만든 워크트리로 연결할 심볼릭 링크 경로입니다.',
            keywords: [
              repo.displayName,
              'symlink',
              'symlinks',
              'worktree',
              'link',
              'shared',
              'env',
              'node_modules'
            ]
          },
          {
            title: 'MCP 구성',
            description: '프로젝트 수준의 MCP 서버 구성 파일을 확인합니다.',
            keywords: [
              repo.displayName,
              'mcp',
              'model context protocol',
              '.mcp.json',
              '.cursor/mcp.json',
              '.claude.json',
              '.claude/mcp.json'
            ]
          },
          {
            title: '설정 스크립트',
            description: '새 워크트리가 만들어진 뒤 실행되는 로컬/공유 스크립트입니다.',
            keywords: [
              repo.displayName,
              'hooks',
              'setup',
              'setup script',
              'setup command',
              'local settings scripts',
              'korca.yaml hooks',
              'yaml'
            ]
          },
          {
            title: '보관 스크립트',
            description: '워크트리를 보관하기 전에 실행되는 로컬/공유 스크립트입니다.',
            keywords: [
              repo.displayName,
              'hooks',
              'archive',
              'archive script',
              'archive command',
              'local settings scripts',
              'korca.yaml hooks',
              'yaml'
            ]
          },
          {
            title: '고급',
            description: '명령 원본과 korca.yaml 세부 정보입니다.',
            keywords: [
              repo.displayName,
              'advanced',
              'command source',
              'local',
              'korca.yaml',
              'shared',
              'both',
              'source',
              'authoritative'
            ]
          },
          {
            title: '설정 스크립트 실행 시점',
            description: '설정 스크립트가 있을 때 기본 동작을 선택합니다.',
            keywords: [
              repo.displayName,
              'setup run policy',
              'ask',
              'run by default',
              'skip by default'
            ]
          },
          {
            title: '사용자 지정 GitHub 이슈 명령',
            description:
              'korca.yaml와 선택적 로컬 오버라이드로 설정하는 파일 기반 연결 이슈 명령입니다.',
            keywords: [
              repo.displayName,
              'github issue command',
              'issue command',
              'workflow',
              'github',
              'korca.yaml',
              '.korca/issue-command'
            ]
          }
        ])
  ]
}
