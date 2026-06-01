/* eslint-disable max-lines -- Why: this state-machine table intentionally keeps every primary-action priority case together so merge regressions are visible in one file. */
import { describe, expect, it } from 'vitest'
import { resolvePrimaryAction, type PrimaryActionInputs } from './source-control-primary-action'

// Why: a shared defaults object keeps each case row terse while making the
// "this is the one knob that differs from the baseline" intent obvious.
function inputs(overrides: Partial<PrimaryActionInputs> = {}): PrimaryActionInputs {
  return {
    stagedCount: 0,
    hasUnstagedChanges: false,
    hasPartiallyStagedChanges: false,
    hasMessage: false,
    hasUnresolvedConflicts: false,
    isCommitting: false,
    isRemoteOperationActive: false,
    upstreamStatus: undefined,
    ...overrides
  }
}

const upstreamInSync = {
  hasUpstream: true,
  upstreamName: 'origin/main',
  ahead: 0,
  behind: 0
}

describe('resolvePrimaryAction', () => {
  it('returns a disabled Commit while a commit is in flight', () => {
    const result = resolvePrimaryAction(
      inputs({ isCommitting: true, stagedCount: 1, hasMessage: true })
    )
    expect(result).toEqual({
      kind: 'commit',
      label: '커밋',
      title: '커밋 진행 중…',
      disabled: true
    })
  })

  it('keeps the contextual label but disables it while a remote op is in flight', () => {
    const result = resolvePrimaryAction(
      inputs({
        isRemoteOperationActive: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 3 }
      })
    )
    expect(result).toEqual({
      kind: 'pull',
      label: '가져오기',
      title: '원격 작업 진행 중…',
      disabled: true
    })
  })

  // Why: when the user picks an action from the dropdown that doesn't match
  // the primary's natural label, the primary must mirror the user-triggered
  // action (label + kind) so the spinner narrates the right thing. Without
  // this, picking "Sync" from the dropdown while the primary reads "Push"
  // would spin a "Push" button that is not actually pushing.
  it('mirrors the in-flight remote op kind on the primary while a remote op runs', () => {
    const result = resolvePrimaryAction(
      inputs({
        isRemoteOperationActive: true,
        // Pre-click natural state would resolve to Push (ahead-only).
        upstreamStatus: { hasUpstream: true, ahead: 3, behind: 0 },
        inFlightRemoteOpKind: 'sync'
      })
    )
    expect(result).toEqual({
      kind: 'sync',
      label: '동기화',
      title: '동기화 진행 중…',
      disabled: true
    })
  })

  it('mirrors an in-flight Pull on the primary even when natural label is Push', () => {
    const result = resolvePrimaryAction(
      inputs({
        isRemoteOperationActive: true,
        upstreamStatus: { hasUpstream: true, ahead: 3, behind: 0 },
        inFlightRemoteOpKind: 'pull'
      })
    )
    expect(result.kind).toBe('pull')
    expect(result.label).toBe('가져오기')
    expect(result.title).toBe('가져오기 진행 중…')
    expect(result.disabled).toBe(true)
  })

  it('keeps the natural Publish label and tooltip when an in-flight Publish matches', () => {
    // Why: when the in-flight kind matches the natural primary kind we
    // preserve the candidate's full label (the natural state-machine row
    // owns the wording) rather than overriding to a stripped-down version.
    const result = resolvePrimaryAction(
      inputs({
        isRemoteOperationActive: true,
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 },
        inFlightRemoteOpKind: 'publish'
      })
    )
    expect(result.kind).toBe('publish')
    expect(result.label).toBe('브랜치 게시')
    expect(result.title).toBe('원격 작업 진행 중…')
    expect(result.disabled).toBe(true)
  })

  // Why: Fetch is dropdown-only and never appears as the primary's label.
  // When fetch is in flight, the primary must keep its natural label and
  // tooltip so the button doesn't claim "Fetch" is a primary action — and
  // the CommitArea spinner suppression hangs off the kind mismatch.
  it('keeps the natural primary label when an in-flight Fetch is dropdown-only', () => {
    const result = resolvePrimaryAction(
      inputs({
        isRemoteOperationActive: true,
        upstreamStatus: { hasUpstream: true, ahead: 3, behind: 0 },
        inFlightRemoteOpKind: 'fetch'
      })
    )
    expect(result).toEqual({
      kind: 'push',
      label: '푸시',
      title: '원격 작업 진행 중…',
      disabled: true
    })
  })

  it('blocks commits while unresolved conflicts exist', () => {
    const result = resolvePrimaryAction(
      inputs({ hasUnresolvedConflicts: true, stagedCount: 2, hasMessage: true })
    )
    expect(result).toEqual({
      kind: 'commit',
      label: '커밋',
      title: '커밋하기 전에 충돌을 해결하세요',
      disabled: true
    })
  })

  // Why: the primary button never compounds ("Commit & Push" etc.) — it
  // always reads "Commit" whenever there are staged files with a message,
  // regardless of remote state. Compound flows remain available from the
  // dropdown; after the commit lands, the primary naturally rotates to
  // Push / Sync / Publish Branch.
  it('returns plain Commit for staged+message regardless of upstream state', () => {
    const upstreams = [
      undefined,
      { hasUpstream: false as const, ahead: 0, behind: 0 },
      { hasUpstream: true as const, ahead: 0, behind: 0 },
      { hasUpstream: true as const, ahead: 3, behind: 0 },
      { hasUpstream: true as const, ahead: 2, behind: 1 },
      { hasUpstream: true as const, ahead: 0, behind: 4 }
    ]
    for (const upstreamStatus of upstreams) {
      const result = resolvePrimaryAction(
        inputs({ stagedCount: 1, hasMessage: true, upstreamStatus })
      )
      expect(result.kind).toBe('commit')
      expect(result.label).toBe('커밋')
      expect(result.disabled).toBe(false)
    }
  })

  it('disables Commit with a message-needed hint when staged but no message', () => {
    const result = resolvePrimaryAction(inputs({ stagedCount: 1, hasMessage: false }))
    expect(result).toEqual({
      kind: 'commit',
      label: '커밋',
      title: '커밋하려면 커밋 메시지를 입력하세요',
      disabled: true
    })
  })

  it('returns Publish Branch on a clean tree when no upstream exists', () => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 }, branchCommitsAhead: 1 })
    )
    expect(result).toEqual({
      kind: 'publish',
      label: '브랜치 게시',
      title: '이 브랜치를 origin에 게시',
      disabled: false
    })
  })

  it('does not offer Publish Branch when an unpublished branch has no commits ahead', () => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 }, branchCommitsAhead: 0 })
    )
    expect(result).toEqual({
      kind: 'commit',
      label: '커밋',
      title: '커밋할 내용이 없습니다. 브랜치에 게시할 변경 사항이 없습니다.',
      disabled: true
    })
  })

  it.each([
    [{ prState: 'merged' as const }, '커밋할 내용이 없습니다. PR이 이미 병합되었습니다.'],
    [{ isPRStateLoading: true }, 'PR 상태 확인 중…']
  ])('does not offer Publish Branch when linked PR state blocks it', (overrides, title) => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 }, ...overrides })
    )
    expect(result).toEqual({ kind: 'commit', label: '커밋', title, disabled: true })
  })

  it('returns Sync when clean + tracked + diverged both ways', () => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 2, behind: 3 } })
    )
    expect(result).toEqual({
      kind: 'sync',
      label: '동기화',
      title: '가져오기 3, 푸시 2',
      disabled: false
    })
  })

  it('returns Force Push when remote-only commits are patch-equivalent after a rebase', () => {
    const result = resolvePrimaryAction(
      inputs({
        branchCommitsAhead: 4,
        upstreamStatus: {
          hasUpstream: true,
          upstreamName: 'origin/feature',
          ahead: 14,
          behind: 3,
          behindCommitsArePatchEquivalent: true
        }
      })
    )
    expect(result).toEqual({
      kind: 'push',
      label: '강제 푸시',
      title:
        '원격에는 로컬 커밋의 더 오래된 복사본만 있습니다. 4개의 브랜치 커밋을 lease와 함께 강제 푸시하여 origin/feature를 업데이트하세요.',
      disabled: false
    })
  })

  it('returns Pull when clean + behind-only', () => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 0, behind: 4 } })
    )
    expect(result.kind).toBe('pull')
    expect(result.label).toBe('가져오기')
    expect(result.title).toBe('가져오기 4개 커밋')
  })

  it('uses singular copy for a single-commit pull', () => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 0, behind: 1 } })
    )
    expect(result.title).toBe('가져오기 1개 커밋')
  })

  it('returns Push when clean + ahead-only', () => {
    const result = resolvePrimaryAction(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 3, behind: 0 } })
    )
    expect(result).toEqual({
      kind: 'push',
      label: '푸시',
      title: '푸시 3개 커밋',
      disabled: false
    })
  })

  it('returns a disabled up-to-date Commit when tracked branch is clean and in sync', () => {
    const result = resolvePrimaryAction(inputs({ upstreamStatus: upstreamInSync }))
    expect(result).toEqual({
      kind: 'commit',
      label: '커밋',
      title: '커밋할 내용이 없습니다. 브랜치가 최신입니다.',
      disabled: true
    })
  })

  // Why: dirty trees (no staged, has unstaged/untracked) must surface a
  // 'Stage All' primary regardless of upstream state. Pulling/syncing on
  // a dirty tree fails ("Please commit or stash them"), and pushing skips
  // the immediate user need (prepare a commit), so the staging rung
  // intercepts before any remote rung fires.
  it('returns Stage All on a dirty tree that is behind upstream', () => {
    const result = resolvePrimaryAction(
      inputs({
        hasUnstagedChanges: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 3 }
      })
    )
    expect(result).toEqual({
      kind: 'stage',
      label: '모두 스테이징',
      title: '모든 변경 사항을 스테이징',
      disabled: false
    })
  })

  it('returns Stage All on a dirty tree that is ahead of upstream', () => {
    const result = resolvePrimaryAction(
      inputs({
        hasUnstagedChanges: true,
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 0 }
      })
    )
    expect(result.kind).toBe('stage')
    expect(result.label).toBe('모두 스테이징')
    expect(result.disabled).toBe(false)
  })

  it('returns Stage All on a dirty tree with no upstream branch', () => {
    const result = resolvePrimaryAction(
      inputs({
        hasUnstagedChanges: true,
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 }
      })
    )
    expect(result.kind).toBe('stage')
  })

  it('returns Stage All on a dirty tree while upstream status is still loading', () => {
    const result = resolvePrimaryAction(
      inputs({ hasUnstagedChanges: true, upstreamStatus: undefined })
    )
    expect(result.kind).toBe('stage')
    expect(result.disabled).toBe(false)
  })

  it('returns Stage All when a staged file also has unstaged changes', () => {
    const result = resolvePrimaryAction(
      inputs({
        stagedCount: 1,
        hasUnstagedChanges: true,
        hasPartiallyStagedChanges: true,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    expect(result.kind).toBe('stage')
    expect(result.label).toBe('모두 스테이징')
    expect(result.disabled).toBe(false)
  })

  it('still resolves to Commit when staged and unrelated unstaged files exist', () => {
    const result = resolvePrimaryAction(
      inputs({
        stagedCount: 1,
        hasUnstagedChanges: true,
        hasPartiallyStagedChanges: false,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    expect(result.kind).toBe('commit')
    expect(result.disabled).toBe(false)
  })

  it('still disables Commit (needs message) when staged+dirty without a message', () => {
    const result = resolvePrimaryAction(
      inputs({ stagedCount: 1, hasUnstagedChanges: true, hasMessage: false })
    )
    expect(result.kind).toBe('commit')
    expect(result.disabled).toBe(true)
    expect(result.title).toBe('커밋하려면 커밋 메시지를 입력하세요')
  })

  it('returns Stage All when unstaged changes exist on an in-sync branch', () => {
    const result = resolvePrimaryAction(
      inputs({ hasUnstagedChanges: true, upstreamStatus: upstreamInSync })
    )
    expect(result).toEqual({
      kind: 'stage',
      label: '모두 스테이징',
      title: '모든 변경 사항을 스테이징',
      disabled: false
    })
  })

  it('returns a disabled Commit when clean and upstream status not yet resolved', () => {
    const result = resolvePrimaryAction(inputs())
    expect(result).toEqual({
      kind: 'commit',
      label: '커밋',
      title: '커밋하려면 파일 하나 이상을 스테이징하세요',
      disabled: true
    })
  })

  it('returns Create PR when a clean tracked branch is eligible for review creation', () => {
    const result = resolvePrimaryAction(
      inputs({
        upstreamStatus: upstreamInSync,
        hostedReviewCreation: {
          provider: 'github',
          review: null,
          canCreate: true,
          blockedReason: null,
          nextAction: null
        }
      })
    )
    expect(result).toEqual({
      kind: 'create_pr',
      label: 'PR 생성',
      title: '이 브랜치에 대한 풀 리퀘스트를 생성',
      disabled: false
    })
  })

  it('returns Create MR when a clean tracked GitLab branch is eligible for review creation', () => {
    const result = resolvePrimaryAction(
      inputs({
        upstreamStatus: upstreamInSync,
        hostedReviewCreation: {
          provider: 'gitlab',
          review: null,
          canCreate: true,
          blockedReason: null,
          nextAction: null
        }
      })
    )
    expect(result).toEqual({
      kind: 'create_pr',
      label: 'MR 생성',
      title: '이 브랜치에 대한 병합 요청을 생성',
      disabled: false
    })
  })
})
