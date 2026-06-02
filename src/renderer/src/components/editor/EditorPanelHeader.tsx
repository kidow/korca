import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Columns2,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  ListTree,
  MoreHorizontal,
  Pencil,
  Rows2
} from 'lucide-react'
import { useAppStore } from '@/store'
import type { MarkdownViewMode, OpenFile } from '@/store/slices/editor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CLOSE_ALL_CONTEXT_MENUS_EVENT } from '../tab-bar/SortableTab'
import { useShortcutLabel } from '@/hooks/useShortcutLabel'
import EditorViewToggle, {
  CSV_VIEW_MODE_METADATA,
  NOTEBOOK_VIEW_MODE_METADATA
} from './EditorViewToggle'
import type { EditorToggleValue } from './EditorViewToggle'
import type { EditorHeaderOpenFileState } from './editor-header'
import { getEditorHeaderCopyState } from './editor-header'
import { DiffNotesSendMenu } from './DiffNotesSendMenu'
import { useEditorHeaderFileRename } from './editor-header-file-rename'

const isMac = navigator.userAgent.includes('Mac')
const isLinux = navigator.userAgent.includes('Linux')

/** Platform-appropriate label: macOS -> Finder, Windows -> File Explorer, Linux -> Files */
const revealLabel = isMac ? 'Finder에서 보기' : isLinux ? '폴더 열기' : '파일 탐색기에서 보기'

type EditorPanelHeaderProps = {
  activeFile: OpenFile
  copiedPathVisible: boolean
  isSingleDiff: boolean
  isDiffSurface: boolean
  isMarkdown: boolean
  isCsv: boolean
  isNotebook: boolean
  hasEditorToggle: boolean
  availableEditorToggleModes: readonly EditorToggleValue[]
  effectiveToggleValue: EditorToggleValue
  mdViewMode: MarkdownViewMode
  hasViewModeToggle: boolean
  canOpenPreviewToSide: boolean
  canShowMarkdownPreview: boolean
  canShowMarkdownTableOfContents: boolean
  isMarkdownTableOfContentsDisabled: boolean
  showMarkdownTableOfContents: boolean
  sideBySide: boolean
  openFileState: EditorHeaderOpenFileState
  onCopyPath: () => void
  onOpenDiffTargetFile: (preferredMarkdownViewMode?: 'rich') => void
  onOpenPreviewToSide: () => void
  onOpenMarkdownPreview: () => void
  onOpenContainingFolder: () => void
  onToggleSideBySide: () => void
  onEditorToggleChange: (next: EditorToggleValue) => void
  onToggleMarkdownTableOfContents: () => void
  onExportMarkdownToPdf: () => void
}

export function EditorPanelHeader({
  activeFile,
  copiedPathVisible,
  isSingleDiff,
  isDiffSurface,
  isMarkdown,
  isCsv,
  isNotebook,
  hasEditorToggle,
  availableEditorToggleModes,
  effectiveToggleValue,
  mdViewMode,
  hasViewModeToggle,
  canOpenPreviewToSide,
  canShowMarkdownPreview,
  canShowMarkdownTableOfContents,
  isMarkdownTableOfContentsDisabled,
  showMarkdownTableOfContents,
  sideBySide,
  openFileState,
  onCopyPath,
  onOpenDiffTargetFile,
  onOpenPreviewToSide,
  onOpenMarkdownPreview,
  onOpenContainingFolder,
  onToggleSideBySide,
  onEditorToggleChange,
  onToggleMarkdownTableOfContents,
  onExportMarkdownToPdf
}: EditorPanelHeaderProps): React.JSX.Element {
  const [pathMenuOpen, setPathMenuOpen] = useState(false)
  const [pathMenuPoint, setPathMenuPoint] = useState({ x: 0, y: 0 })
  const skipMenuFocusRestoreRef = useRef(false)
  const headerCopyState = getEditorHeaderCopyState(activeFile)
  const {
    canRename,
    currentFileName,
    isRenaming,
    renameInputRef,
    openRenameInput,
    commitRename,
    cancelRename
  } = useEditorHeaderFileRename(activeFile)
  const diffComments = useAppStore((s) => s.getDiffComments(activeFile.worktreeId))
  const activeGroupId = useAppStore((s) => s.activeGroupIdByWorktree[activeFile.worktreeId])
  const fileDiffComments = useMemo(
    () => diffComments.filter((comment) => comment.filePath === activeFile.relativePath),
    [activeFile.relativePath, diffComments]
  )
  const markdownPreviewShortcutLabel = useShortcutLabel('editor.markdownPreview')

  useEffect(() => {
    const closeMenu = (): void => setPathMenuOpen(false)
    window.addEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, closeMenu)
    return () => window.removeEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, closeMenu)
  }, [])

  return (
    <div className="editor-header">
      <div className="editor-header-text">
        <div
          className="editor-header-path-row"
          onContextMenuCapture={(event) => {
            event.preventDefault()
            window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT))
            setPathMenuPoint({ x: event.clientX, y: event.clientY })
            setPathMenuOpen(true)
          }}
        >
          {isRenaming ? (
            <Input
              ref={renameInputRef}
              data-editor-header-rename-input="true"
              aria-label={`Rename file ${currentFileName}`}
              defaultValue={currentFileName}
              // Why: the header is narrow in floating mode; this keeps the
              // edit field aligned with the path label without growing chrome.
              className="h-6 w-[16ch] min-w-[104px] max-w-full rounded-sm bg-input/40 px-1.5 py-0 font-mono text-xs text-foreground md:text-xs focus-visible:ring-[1px]"
              spellCheck={false}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  commitRename()
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  cancelRename()
                }
              }}
              onBlur={commitRename}
            />
          ) : (
            <button
              type="button"
              className="editor-header-path"
              onClick={onCopyPath}
              title={headerCopyState.pathTitle}
            >
              {headerCopyState.pathLabel}
            </button>
          )}
          <span
            className={`editor-header-copy-toast${copiedPathVisible ? ' is-visible' : ''}`}
            aria-live="polite"
          >
            {headerCopyState.copyToastLabel}
          </span>
        </div>
        <DropdownMenu open={pathMenuOpen} onOpenChange={setPathMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              aria-hidden
              tabIndex={-1}
              className="pointer-events-none fixed size-px opacity-0"
              style={{ left: pathMenuPoint.x, top: pathMenuPoint.y }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            sideOffset={0}
            align="start"
            onCloseAutoFocus={(event) => {
              if (!skipMenuFocusRestoreRef.current) {
                return
              }
              skipMenuFocusRestoreRef.current = false
              event.preventDefault()
            }}
          >
            <DropdownMenuItem
              disabled={!canRename}
              onSelect={() => {
                skipMenuFocusRestoreRef.current = true
                openRenameInput()
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              이름 바꾸기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void window.api.ui.writeClipboardText(activeFile.filePath)
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              경로 복사
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void window.api.ui.writeClipboardText(activeFile.relativePath)
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              상대 경로 복사
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canShowMarkdownPreview && (
              <DropdownMenuItem onSelect={onOpenMarkdownPreview}>
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                마크다운 미리보기 열기
                <DropdownMenuShortcut>{markdownPreviewShortcutLabel}</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {canShowMarkdownPreview && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={onOpenContainingFolder}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {revealLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isSingleDiff && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                onClick={() => onOpenDiffTargetFile(isMarkdown ? 'rich' : undefined)}
                aria-label="파일 열기"
                disabled={!openFileState.canOpen}
              >
                <FileText size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {openFileState.canOpen
                ? isMarkdown
                  ? '리치 마크다운 편집을 사용하려면 파일 탭을 여세요'
                  : '파일 탭 열기'
                : '이 diff에는 열 수 있는 수정본 파일이 없습니다'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isSingleDiff && fileDiffComments.length > 0 && (
        <DiffNotesSendMenu
          worktreeId={activeFile.worktreeId}
          groupId={activeGroupId ?? activeFile.worktreeId}
          comments={diffComments}
          filePath={activeFile.relativePath}
          showFileScope
          triggerLabel="AI notes"
          triggerCount={fileDiffComments.length}
          triggerClassName="h-6 shrink-0 gap-1 rounded-full border border-border/70 bg-muted/40 px-2 text-[11px] font-medium leading-none text-foreground/80 hover:bg-accent hover:text-foreground"
          iconClassName="size-3"
        />
      )}
      {canOpenPreviewToSide && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                onClick={onOpenPreviewToSide}
                aria-label="미리보기를 옆에 열기"
              >
                <Eye size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              미리보기를 옆에 열기
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isDiffSurface && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                onClick={onToggleSideBySide}
              >
                {sideBySide ? <Rows2 size={14} /> : <Columns2 size={14} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {sideBySide ? 'Switch to inline diff' : 'Switch to side-by-side diff'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {hasEditorToggle && (
        <EditorViewToggle
          value={effectiveToggleValue}
          modes={availableEditorToggleModes}
          onChange={onEditorToggleChange}
          metadataOverride={
            isCsv ? CSV_VIEW_MODE_METADATA : isNotebook ? NOTEBOOK_VIEW_MODE_METADATA : undefined
          }
        />
      )}
      {canShowMarkdownTableOfContents && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`p-1 rounded hover:bg-accent hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground ${
                  showMarkdownTableOfContents && !isMarkdownTableOfContentsDisabled
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground'
                }`}
                onClick={onToggleMarkdownTableOfContents}
                disabled={isMarkdownTableOfContentsDisabled}
                aria-label="목차"
                aria-pressed={showMarkdownTableOfContents}
              >
                <ListTree size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {isMarkdownTableOfContentsDisabled
                ? '목차는 리치 모드 또는 미리보기 모드에서 사용할 수 있습니다'
                : '목차'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {hasViewModeToggle && isMarkdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="추가 작업"
              title="추가 작업"
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem
              // Why: the item is disabled (not hidden) only in source/Monaco
              // mode, which has no document DOM to export. We intentionally
              // don't poll the DOM (canExportActiveMarkdown) at render time:
              // the Radix content renders in a Portal and the lookup can
              // race with the active surface's paint, producing a stuck
              // disabled state. exportActiveMarkdownToPdf is a safe no-op
              // when no subtree is found.
              disabled={mdViewMode === 'source'}
              onSelect={onExportMarkdownToPdf}
            >
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
