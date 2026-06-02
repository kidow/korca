import type { SettingsSearchEntry } from './settings-search'

type BrowserShortcutPlatform = {
  isMac: boolean
}

function getDefaultBrowserShortcutPlatform(): BrowserShortcutPlatform {
  return {
    isMac: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
  }
}

export function getBrowserLinkRoutingShortcutLabel(platform: BrowserShortcutPlatform): string {
  return platform.isMac ? '⇧⌘-click' : 'Shift+Ctrl+click'
}

export function getBrowserLinkRoutingDescription(platform: BrowserShortcutPlatform): string {
  return `Open http(s) links in Korca's built-in browser — from the terminal, markdown, and the editor. ${getBrowserLinkRoutingShortcutLabel(platform)} always uses your system browser.`
}

export function getBrowserPaneSearchEntries(
  platform: BrowserShortcutPlatform = getDefaultBrowserShortcutPlatform()
): SettingsSearchEntry[] {
  return [
    {
      title: '기본 홈 페이지',
      description: '새 브라우저 탭을 만들 때 열 URL입니다. 비워 두면 빈 탭이 열립니다.',
      keywords: ['browser', 'home', 'homepage', 'default', 'url', 'new tab', 'blank', 'landing']
    },
    {
      title: '기본 검색 엔진',
      description: '주소창에 URL이 아닌 텍스트를 입력할 때 사용할 검색 엔진입니다.',
      keywords: [
        'browser',
        'search',
        'engine',
        'google',
        'duckduckgo',
        'bing',
        'kagi',
        'session',
        'private',
        'token',
        'omnibox',
        'query'
      ]
    },
    {
      title: '링크 라우팅',
      description: getBrowserLinkRoutingDescription(platform),
      keywords: [
        'browser',
        'preview',
        'links',
        'localhost',
        'webview',
        'shift',
        platform.isMac ? 'cmd' : 'ctrl',
        'markdown',
        'file',
        'editor'
      ]
    },
    {
      title: '세션 및 쿠키',
      description:
        'Chrome, Edge 또는 다른 브라우저의 쿠키를 가져와 Korca 안에서 기존 로그인 정보를 사용합니다.',
      keywords: [
        'browser',
        'cookies',
        'session',
        'import',
        'auth',
        'login',
        'chrome',
        'edge',
        'arc',
        'profile'
      ]
    }
  ]
}

export const BROWSER_PANE_SEARCH_ENTRIES: SettingsSearchEntry[] = getBrowserPaneSearchEntries()
