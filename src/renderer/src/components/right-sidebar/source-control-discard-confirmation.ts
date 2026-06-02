import { basename } from '@/lib/path'
import type { GitStatusEntry } from '../../../../shared/types'
import type { DiscardAllArea } from './discard-all-sequence'

export type DiscardConfirmationCopy = {
  title: string
  description: string
  confirmLabel: string
}

export function getDiscardEntryConfirmationCopy(
  entry: Pick<GitStatusEntry, 'area' | 'path' | 'status'>
): DiscardConfirmationCopy {
  const name = basename(entry.path)

  // Why: untracked and newly-added paths have no HEAD version to restore.
  // Korca's discard path removes the working-tree file in those cases.
  if (entry.area === 'untracked' || entry.status === 'untracked' || entry.status === 'added') {
    return {
      title: `"${name}"을 삭제하시겠습니까?`,
      description: '이 파일은 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제'
    }
  }

  if (entry.status === 'deleted') {
    return {
      title: `"${name}"을 복원하시겠습니까?`,
      description: '이 파일을 HEAD에서 복원하고 삭제를 버립니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '복원'
    }
  }

  return {
    title: `"${name}"의 변경 사항을 버리시겠습니까?`,
    description: '이 파일의 모든 변경 사항이 되돌려집니다. 이 작업은 되돌릴 수 없습니다.',
    confirmLabel: '버리기'
  }
}

export function getDiscardAreaConfirmationCopy(
  area: DiscardAllArea,
  count: number
): DiscardConfirmationCopy {
  switch (area) {
    case 'untracked':
      return {
        title: count === 1 ? '미추적 파일 1개를 삭제하시겠습니까?' : `미추적 파일 ${count}개를 삭제하시겠습니까?`,
        description:
          count === 1
            ? '이 미추적 파일은 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.'
            : `이 미추적 파일 ${count}개는 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
        confirmLabel: count === 1 ? '삭제' : `삭제 ${count}개`
      }
    case 'staged':
      return {
        title: '스테이징된 변경 사항을 모두 버리시겠습니까?',
        description:
          '모든 스테이징된 변경 사항이 스테이징 해제되고 되돌려집니다. 새로 추가된 파일은 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
        confirmLabel: '모두 버리기'
      }
    case 'unstaged':
      return {
        title: '스테이징되지 않은 변경 사항을 모두 버리시겠습니까?',
        description:
          count === 1
            ? '1개 파일의 스테이징되지 않은 변경 사항이 되돌려집니다. 이 작업은 되돌릴 수 없습니다.'
            : `총 ${count}개 파일의 스테이징되지 않은 변경 사항이 되돌려집니다. 이 작업은 되돌릴 수 없습니다.`,
        confirmLabel: '모두 버리기'
      }
  }
}
