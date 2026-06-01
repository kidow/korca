import type { SettingsSearchEntry } from './settings-search'

export const COMMIT_MESSAGE_AI_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  {
    title: '소스 컨트롤 AI 사용',
    description: '소스 컨트롤의 커밋, 풀 리퀘스트, 브랜치 이름 흐름에 AI 생성을 추가합니다.',
    keywords: [
      'ai',
      'commit',
      'message',
      'generate',
      'agent',
      'claude',
      'codex',
      'source control',
      'enabled'
    ]
  },
  {
    title: '에이전트',
    description: '소스 컨트롤 텍스트 생성을 위해 호출할 에이전트입니다.',
    keywords: ['agent', 'claude', 'codex', 'source control']
  },
  {
    title: '기본 모델',
    description: '작업별 재정의가 없을 때 소스 컨트롤 AI가 사용하는 모델입니다.',
    keywords: ['model', 'haiku', 'sonnet', 'opus', 'gpt']
  },
  {
    title: '추론 강도',
    description: '선택한 모델의 추론 강도입니다. 값이 높을수록 느립니다.',
    keywords: ['thinking', 'effort', 'reasoning']
  },
  {
    title: '고급 모델 재정의',
    description: '커밋 메시지와 PR 세부 정보에 대한 작업별 모델 선택입니다.',
    keywords: ['model', 'override', 'commit', 'pull request', 'pr', 'thinking']
  },
  {
    title: '커밋 메시지 프롬프트',
    description: '커밋 메시지를 생성할 때만 추가되는 프롬프트입니다.',
    keywords: ['prompt', 'conventional commits', 'gitmoji', 'style']
  },
  {
    title: '풀 리퀘스트 프롬프트',
    description: '풀 리퀘스트 세부 정보를 생성할 때만 추가되는 프롬프트입니다.',
    keywords: ['prompt', 'pull request', 'pr', 'description', 'template']
  },
  {
    title: 'PR 생성 기본값',
    description: 'PR 생성 화면을 열 때 사용하는 기본값입니다.',
    keywords: ['pull request', 'pr', 'draft', 'template', 'generate', 'open']
  },
  {
    title: '사용자 지정 명령',
    description: '커밋 메시지 생성을 위해 Orca가 실행하는 명령행입니다.',
    keywords: ['custom', 'command', 'cli', 'binary', 'prompt', 'placeholder', 'ollama']
  }
]
