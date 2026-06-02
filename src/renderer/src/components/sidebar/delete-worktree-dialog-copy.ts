import { isFolderRepo } from '../../../../shared/repo-kind'
import type { Repo, Worktree } from '../../../../shared/types'

type WorktreeRepoRef = Pick<Worktree, 'repoId'>

export function isFolderWorkspaceDelete(
  repoMap: ReadonlyMap<string, Repo>,
  worktree: WorktreeRepoRef | null | undefined
): boolean {
  if (!worktree) {
    return false
  }
  const repo = repoMap.get(worktree.repoId)
  return repo ? isFolderRepo(repo) : false
}

export function countFolderWorkspaceDeletes(
  repoMap: ReadonlyMap<string, Repo>,
  worktrees: readonly WorktreeRepoRef[]
): number {
  return worktrees.filter((item) => isFolderWorkspaceDelete(repoMap, item)).length
}

export function getDeleteWorktreeDialogCopy(args: {
  isBatchDelete: boolean
  worktree: Pick<Worktree, 'displayName'> | null
  worktreeCount: number
  folderWorkspaceDeleteCount: number
  isFolderWorkspaceDelete: boolean
}): {
  targetLabel: string | undefined
  targetClassName: string
  descriptionSuffix: string
  mainWorktreeBlocker: string
} {
  const allFolderWorkspaceDeletes =
    args.isBatchDelete &&
    args.worktreeCount > 0 &&
    args.folderWorkspaceDeleteCount === args.worktreeCount
  const mixedFolderWorkspaceDeletes =
    args.isBatchDelete &&
    args.folderWorkspaceDeleteCount > 0 &&
    args.folderWorkspaceDeleteCount < args.worktreeCount
  return {
    targetLabel: args.isBatchDelete
      ? `작업 공간 ${args.worktreeCount}개`
      : args.worktree?.displayName,
    targetClassName: args.isBatchDelete
      ? 'font-medium text-foreground'
      : 'break-all font-medium text-foreground',
    descriptionSuffix: args.isBatchDelete
      ? allFolderWorkspaceDeletes
        ? 'Korca에서 제거됩니다. 디스크의 프로젝트 폴더는 삭제되지 않습니다.'
        : mixedFolderWorkspaceDeletes
          ? 'Korca에서 제거됩니다. Git worktree는 git과 디스크에서 함께 제거되고, 폴더 작업 공간은 Korca 작업 공간 항목만 제거됩니다.'
          : 'Git에서 제거되고 작업 공간 폴더도 삭제됩니다.'
      : args.isFolderWorkspaceDelete
        ? 'Korca에서 제거됩니다. 디스크의 프로젝트 폴더는 삭제되지 않습니다.'
        : 'Git에서 제거되고 작업 공간 폴더도 삭제됩니다.',
    mainWorktreeBlocker: args.isFolderWorkspaceDelete
      ? '이 작업 공간 대신 폴더 프로젝트를 제거하세요.'
      : 'Git은 메인 worktree를 제거할 수 없습니다.'
  }
}

export function getDeleteWorktreeLineageDialogCopy(args: {
  childWorkspaceCount: number
  deleteTargetCount: number
  folderWorkspaceDeleteCount: number
}): {
  childTargetLabel: string
  descriptionSuffix: string
} {
  const allFolderWorkspaceDeletes =
    args.deleteTargetCount > 0 && args.folderWorkspaceDeleteCount === args.deleteTargetCount
  const mixedFolderWorkspaceDeletes =
    args.folderWorkspaceDeleteCount > 0 && args.folderWorkspaceDeleteCount < args.deleteTargetCount

  return {
    childTargetLabel:
      args.childWorkspaceCount === 1
        ? '하위 작업 공간 1개'
        : `하위 작업 공간 ${args.childWorkspaceCount}개`,
    descriptionSuffix: allFolderWorkspaceDeletes
      ? 'Korca에서 제거됩니다. 디스크의 프로젝트 폴더는 삭제되지 않습니다.'
      : mixedFolderWorkspaceDeletes
        ? 'Korca에서 제거됩니다. Git worktree는 git과 디스크에서 함께 제거되고, 폴더 작업 공간은 Korca 작업 공간 항목만 제거됩니다.'
        : 'Git에서 제거되고 작업 공간 폴더도 삭제됩니다.'
  }
}
