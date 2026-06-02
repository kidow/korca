export const AGENT_AWAKE_TITLE = '에이전트 작업 중 컴퓨터 절전 방지'

export function getAgentAwakeDescription(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
): string {
  if (userAgent.includes('Windows')) {
    return '에이전트가 작업하는 동안 이 컴퓨터와 디스플레이가 잠들지 않게 유지합니다. 덮개를 닫았을 때의 동작은 이 장치의 전원 설정을 따릅니다.'
  }

  return '에이전트가 작업하는 동안 이 컴퓨터와 디스플레이가 잠들지 않게 유지합니다. Korca는 전원 정책에 따라 덮개를 닫아도 이 장치가 깨어 있도록 요청합니다.'
}

export function getAgentAwakeSearchKeywords(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
): string[] {
  const keywords = ['awake', 'sleep', 'power', 'agent', 'running', 'working', 'lid', 'display']
  return userAgent.includes('Linux') ? [...keywords, 'linux'] : keywords
}
