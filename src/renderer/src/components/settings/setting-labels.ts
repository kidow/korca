import type { GlobalSettings } from '../../../../shared/types'

export const SETTING_LABELS: Partial<Record<keyof GlobalSettings, string>> = {
  terminalFontSize: '글꼴 크기',
  terminalFontFamily: '글꼴 패밀리',
  terminalFontWeight: '글꼴 굵기',
  terminalBackgroundOpacity: '배경 불투명도',
  terminalCursorStyle: '커서 스타일',
  terminalCursorBlink: '커서 깜빡임',
  terminalCursorOpacity: '커서 불투명도',
  terminalMouseHideWhileTyping: '입력 중 마우스 숨기기',
  terminalWordSeparator: '단어 구분자',
  primarySelectionMiddleClickPaste: '선택 영역에서 중간 클릭 붙여넣기',
  terminalFocusFollowsMouse: '마우스 따라 포커스',
  terminalColorOverrides: '색상 재정의',
  terminalMacOptionAsAlt: 'Option 키를 Alt로 사용',
  terminalPaddingX: '가로 여백',
  terminalPaddingY: '세로 여백',
  terminalDividerColorDark: '구분선 색상(다크)',
  terminalDividerColorLight: '구분선 색상(라이트)',
  terminalInactivePaneOpacity: '비활성 창 불투명도',
  windowBackgroundBlur: '창 배경 블러'
}
