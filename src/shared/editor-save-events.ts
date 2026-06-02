export const KORCA_EDITOR_SAVE_DIRTY_FILES_EVENT = 'korca:editor-save-dirty-files'

export type EditorSaveDirtyFilesDetail = {
  claim: () => void
  resolve: () => void
  reject: (message: string) => void
}
