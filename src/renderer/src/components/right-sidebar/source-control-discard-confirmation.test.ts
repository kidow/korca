import { describe, expect, it } from 'vitest'
import {
  getDiscardAreaConfirmationCopy,
  getDiscardEntryConfirmationCopy
} from './source-control-discard-confirmation'
import type { GitStatusEntry } from '../../../../shared/types'

function entry(partial: Partial<GitStatusEntry> & { path: string }): GitStatusEntry {
  return {
    area: 'unstaged',
    status: 'modified',
    ...partial
  }
}

describe('getDiscardEntryConfirmationCopy', () => {
  it('uses delete copy for untracked files', () => {
    expect(
      getDiscardEntryConfirmationCopy(
        entry({ area: 'untracked', path: 'src/new-file.ts', status: 'untracked' })
      )
    ).toEqual({
      title: '"new-file.ts"을 삭제하시겠습니까?',
      description: '이 파일은 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제'
    })
  })

  it('uses delete copy for files added to the index', () => {
    expect(
      getDiscardEntryConfirmationCopy(
        entry({ area: 'staged', path: 'src/added.ts', status: 'added' })
      )
    ).toEqual({
      title: '"added.ts"을 삭제하시겠습니까?',
      description: '이 파일은 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제'
    })
  })

  it('uses restore copy for deleted tracked files', () => {
    expect(
      getDiscardEntryConfirmationCopy(
        entry({ area: 'unstaged', path: 'src/removed.ts', status: 'deleted' })
      )
    ).toEqual({
      title: '"removed.ts"을 복원하시겠습니까?',
      description: '이 파일을 HEAD에서 복원하고 삭제를 버립니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '복원'
    })
  })

  it('uses discard copy for modified tracked files', () => {
    expect(
      getDiscardEntryConfirmationCopy(entry({ path: 'src/changed.ts', status: 'modified' }))
    ).toEqual({
      title: '"changed.ts"의 변경 사항을 버리시겠습니까?',
      description: '이 파일의 모든 변경 사항이 되돌려집니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '버리기'
    })
  })

  it('handles Windows-style paths', () => {
    expect(
      getDiscardEntryConfirmationCopy(
        entry({ area: 'untracked', path: 'src\\windows-file.ts', status: 'untracked' })
      ).title
    ).toBe('"windows-file.ts"을 삭제하시겠습니까?')
  })
})

describe('getDiscardAreaConfirmationCopy', () => {
  it('uses singular delete copy for one untracked file', () => {
    expect(getDiscardAreaConfirmationCopy('untracked', 1)).toEqual({
      title: '미추적 파일 1개를 삭제하시겠습니까?',
      description: '이 미추적 파일은 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제'
    })
  })

  it('uses plural delete copy for multiple untracked files', () => {
    expect(getDiscardAreaConfirmationCopy('untracked', 3)).toEqual({
      title: '미추적 파일 3개를 삭제하시겠습니까?',
      description: '이 미추적 파일 3개는 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '삭제 3개'
    })
  })

  it('warns that staged new files will be deleted', () => {
    expect(getDiscardAreaConfirmationCopy('staged', 4)).toEqual({
      title: '스테이징된 변경 사항을 모두 버리시겠습니까?',
      description:
        '모든 스테이징된 변경 사항이 스테이징 해제되고 되돌려집니다. 새로 추가된 파일은 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '모두 버리기'
    })
  })

  it('uses singular unstaged copy', () => {
    expect(getDiscardAreaConfirmationCopy('unstaged', 1)).toEqual({
      title: '스테이징되지 않은 변경 사항을 모두 버리시겠습니까?',
      description:
        '1개 파일의 스테이징되지 않은 변경 사항이 되돌려집니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '모두 버리기'
    })
  })

  it('uses plural unstaged copy', () => {
    expect(getDiscardAreaConfirmationCopy('unstaged', 2)).toEqual({
      title: '스테이징되지 않은 변경 사항을 모두 버리시겠습니까?',
      description:
        '총 2개 파일의 스테이징되지 않은 변경 사항이 되돌려집니다. 이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '모두 버리기'
    })
  })
})
