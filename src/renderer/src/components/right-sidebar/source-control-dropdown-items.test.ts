/* eslint-disable max-lines -- Why: the dropdown priority table is easier to audit when the row-state cases live together. */
import { describe, expect, it } from 'vitest'
import { resolveDropdownItems, type DropdownActionInputs } from './source-control-dropdown-items'

// Why: a shared defaults object keeps each case row terse while making the
// "this is the one knob that differs from the baseline" intent obvious.
function inputs(overrides: Partial<DropdownActionInputs> = {}): DropdownActionInputs {
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

describe('resolveDropdownItems', () => {
  it('renders every row — Commit through Publish — for a staged, tracked, ahead+behind branch', () => {
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 3 }
      })
    )
    const kinds = items.map((item) => item.kind)
    expect(kinds).toEqual([
      'commit',
      'commit_push',
      'commit_sync',
      'separator',
      'push',
      'create_pr',
      'push_create_pr',
      'pull',
      'fast_forward',
      'sync',
      'rebase_base',
      'fetch',
      'publish'
    ])
  })

  it('disables compound commit actions when no staged files', () => {
    const items = resolveDropdownItems(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 1, behind: 0 } })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.commit.disabled).toBe(true)
    expect(byKind.commit_push.disabled).toBe(true)
    expect(byKind.commit_sync.disabled).toBe(true)
  })

  it('disables commit actions when staged files also have unstaged changes', () => {
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        hasUnstagedChanges: true,
        hasPartiallyStagedChanges: true,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 1, behind: 0 }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.commit.disabled).toBe(true)
    expect(byKind.commit_push.disabled).toBe(true)
    expect(byKind.commit_sync.disabled).toBe(true)
    expect(byKind.commit.title).toBe('부분적으로 스테이징된 파일을 커밋하기 전에 모든 변경 사항을 스테이징하세요')
  })

  it('disables push actions but keeps Fetch enabled when branch has no upstream', () => {
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        hasMessage: true,
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.push.disabled).toBe(true)
    expect(byKind.commit_push.disabled).toBe(true)
    expect(byKind.publish.disabled).toBe(false)
    expect(byKind.fetch.disabled).toBe(false)
  })

  it('disables Publish Branch when branch already has an upstream', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.publish.disabled).toBe(true)
  })

  it('renders counts on action labels when > 0', () => {
    const items = resolveDropdownItems(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 3, behind: 2 } })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.push.label).toBe('푸시 (3)')
    expect(byKind.pull.label).toBe('가져오기 (2)')
    expect(byKind.sync.label).toBe('동기화 (↓2 ↑3)')
  })

  it('disables push-only actions on diverged branches so users sync first', () => {
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 3 }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )

    expect(byKind.push.disabled).toBe(true)
    expect(byKind.push.title).toBe('푸시 전에 동기화해 원격 변경 사항을 먼저 가져오세요')
    expect(byKind.commit_push.disabled).toBe(true)
    expect(byKind.commit_push.title).toBe('커밋 후 동기화를 사용해 원격 변경 사항을 먼저 가져오세요')
    expect(byKind.sync.disabled).toBe(false)
    expect(byKind.commit_sync.disabled).toBe(false)
  })

  it('offers force-push-with-lease when remote-only commits are patch-equivalent', () => {
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        hasMessage: true,
        branchCommitsAhead: 4,
        upstreamStatus: {
          hasUpstream: true,
          upstreamName: 'origin/feature',
          ahead: 14,
          behind: 3,
          behindCommitsArePatchEquivalent: true
        },
        hostedReviewCreation: {
          provider: 'github',
          review: null,
          canCreate: false,
          blockedReason: 'needs_sync',
          nextAction: 'sync'
        }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )

    expect(byKind.push.label).toBe('강제 푸시 (4)')
    expect(byKind.push.disabled).toBe(false)
    expect(byKind.push.title).toBe(
      '원격에는 로컬 커밋의 더 오래된 복사본만 있습니다. 4개의 브랜치 커밋을 lease와 함께 강제 푸시하여 origin/feature를 업데이트하세요.'
    )
    expect(byKind.commit_push.label).toBe('커밋 후 강제 푸시')
    expect(byKind.commit_push.disabled).toBe(false)
    expect(byKind.commit_push.title).toBe('스테이징된 변경 사항을 커밋하고 lease와 함께 강제 푸시')
    expect(byKind.pull.disabled).toBe(true)
    expect(byKind.pull.title).toBe(
      '가져올 새 내용이 없습니다. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
    )
    expect(byKind.fast_forward.disabled).toBe(true)
    expect(byKind.fast_forward.title).toBe(
      '빠른 병합할 새 내용이 없습니다. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
    )
    expect(byKind.commit_sync.label).toBe('커밋 후 동기화')
    expect(byKind.commit_sync.disabled).toBe(true)
    expect(byKind.commit_sync.title).toBe(
      '커밋 후 강제 푸시를 사용하세요. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
    )
    expect(byKind.sync.disabled).toBe(true)
    expect(byKind.sync.title).toBe('강제 푸시를 사용하세요. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.')
    expect(byKind.create_pr.hint).toBe('먼저 강제 푸시')
    expect(byKind.push_create_pr.label).toBe('PR 전 강제 푸시')
    expect(byKind.push_create_pr.disabled).toBe(false)
  })

  it('omits counts from labels when ahead/behind are 0', () => {
    const items = resolveDropdownItems(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 } })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.push.label).toBe('푸시')
    expect(byKind.pull.label).toBe('가져오기')
    expect(byKind.sync.label).toBe('동기화')
  })

  it('locks every item while a remote op is running', () => {
    const items = resolveDropdownItems(
      inputs({
        isRemoteOperationActive: true,
        stagedCount: 1,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 3 }
      })
    )
    for (const entry of items) {
      if (entry.kind !== 'separator') {
        expect(entry.disabled).toBe(true)
      }
    }
  })

  it('shows a destructive abort item only while merge or rebase is in progress', () => {
    const mergeItems = resolveDropdownItems(
      inputs({
        conflictOperation: 'merge',
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    const rebaseItems = resolveDropdownItems(
      inputs({
        conflictOperation: 'rebase',
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    const mergeByKind = Object.fromEntries(
      mergeItems.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    const rebaseByKind = Object.fromEntries(
      rebaseItems.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )

    expect(mergeByKind.abort_merge).toMatchObject({
      label: 'Abort merge',
      title: 'Abort the merge in progress',
      disabled: false,
      variant: 'destructive'
    })
    expect(rebaseByKind.abort_rebase).toMatchObject({
      label: 'Abort rebase',
      title: 'Abort the rebase in progress',
      disabled: false,
      variant: 'destructive'
    })
    expect(mergeByKind.abort_rebase).toBeUndefined()
    expect(rebaseByKind.abort_merge).toBeUndefined()

    for (const conflictOperation of ['unknown', 'cherry-pick'] as const) {
      const items = resolveDropdownItems(inputs({ conflictOperation }))
      expect(items.some((entry) => entry.kind === 'abort_merge')).toBe(false)
      expect(items.some((entry) => entry.kind === 'abort_rebase')).toBe(false)
    }
  })

  it('disables conflict abort actions while another action is busy', () => {
    const items = resolveDropdownItems(
      inputs({
        conflictOperation: 'merge',
        isRemoteOperationActive: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    const rebaseItems = resolveDropdownItems(
      inputs({
        conflictOperation: 'rebase',
        isRemoteOperationActive: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 }
      })
    )
    const abortMerge = items.find((entry) => entry.kind === 'abort_merge')
    const abortRebase = rebaseItems.find((entry) => entry.kind === 'abort_rebase')

    expect(abortMerge).toMatchObject({
      disabled: true,
      title: '작업 진행 중…'
    })
    expect(abortRebase).toMatchObject({
      disabled: true,
      title: '작업 진행 중…'
    })
  })

  it('locks every item while a hosted review operation is running', () => {
    const items = resolveDropdownItems(
      inputs({
        isPullRequestOperationActive: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 },
        hostedReviewCreation: {
          provider: 'github',
          review: null,
          canCreate: true,
          blockedReason: null,
          nextAction: null
        }
      })
    )

    for (const entry of items) {
      if (entry.kind !== 'separator') {
        expect(entry.disabled).toBe(true)
        expect(entry.title).toBe('호스티드 리뷰 작업 진행 중…')
      }
    }
  })

  it('disables remote rows with a loading tooltip when upstreamStatus is undefined', () => {
    // Why: mirrors the primary-action guard — while fetchUpstreamStatus is in
    // flight we must not let the user click Publish on an already-tracked
    // branch (which would re-run `git push -u` and clobber the upstream).
    const items = resolveDropdownItems(
      inputs({ stagedCount: 1, hasMessage: true, upstreamStatus: undefined })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    const loadingBlocked = [
      'commit_push',
      'commit_sync',
      'push',
      'pull',
      'fast_forward',
      'sync',
      'fetch',
      'publish'
    ] as const
    for (const kind of loadingBlocked) {
      expect(byKind[kind].disabled).toBe(true)
      expect(byKind[kind].title).toBe('브랜치 상태 확인 중…')
    }
    // Commit itself does not depend on upstream — it remains enabled when
    // staged + message are present and no commit is in flight.
    expect(byKind.commit.disabled).toBe(false)
  })

  it('keeps Fetch enabled and surfaces publish-first tooltips when upstream is absent', () => {
    // Why: sibling to the upstreamStatus=undefined test above. Once the fetch
    // resolves to hasUpstream=false, the dropdown should explain that the
    // user needs to publish first (rather than leaving the loading copy).
    const items = resolveDropdownItems(
      inputs({ upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 } })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.push.title).toBe('커밋을 푸시하려면 먼저 브랜치를 게시하세요')
    expect(byKind.pull.title).toBe('커밋을 가져오려면 먼저 브랜치를 게시하세요')
    expect(byKind.fast_forward.title).toBe('빠른 병합하려면 먼저 브랜치를 게시하세요')
    expect(byKind.sync.title).toBe('커밋을 동기화하려면 먼저 브랜치를 게시하세요')
    expect(byKind.fetch.title).toBe('병합하지 않고 원격에서 가져오기')
    expect(byKind.fetch.disabled).toBe(false)
    expect(byKind.publish.title).toBe('이 브랜치를 origin에 게시')
    expect(byKind.publish.disabled).toBe(false)
  })

  it('enables rebase from base only on a clean tree with a remote base ref', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 },
        rebaseBaseRef: 'origin/main'
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )

    expect(byKind.rebase_base.label).toBe('origin/main에서 리베이스')
    expect(byKind.rebase_base.title).toBe(
      'origin/main의 최신 커밋으로 현재 브랜치를 리베이스'
    )
    expect(byKind.rebase_base.disabled).toBe(false)
  })

  it('disables rebase from base while local changes are present', () => {
    const items = resolveDropdownItems(
      inputs({
        hasUnstagedChanges: true,
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 },
        rebaseBaseRef: 'origin/main'
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )

    expect(byKind.rebase_base.disabled).toBe(true)
    expect(byKind.rebase_base.title).toBe('리베이스하기 전에 로컬 변경 사항을 커밋하거나 스태시하세요')
  })

  it('does not show Publish Branch when an unpublished branch has no commits ahead', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 },
        branchCommitsAhead: 0
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.publish.label).toBe('브랜치 변경 사항 없음')
    expect(byKind.publish.title).toBe('게시할 내용이 없습니다')
    expect(byKind.publish.disabled).toBe(true)
  })

  it('points an unpublished dirty branch with no commits at committing first', () => {
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 },
        branchCommitsAhead: 0
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.publish.label).toBe('먼저 변경 사항을 커밋')
    expect(byKind.publish.title).toBe('브랜치를 게시하기 전에 변경 사항을 커밋하세요')
    expect(byKind.publish.disabled).toBe(true)
  })

  it('does not mention Publish Branch when the linked PR is already merged', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 },
        prState: 'merged'
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.push.title).toBe('PR이 이미 병합되었습니다')
    expect(byKind.pull.title).toBe('PR이 이미 병합되었습니다')
    expect(byKind.fast_forward.title).toBe('PR이 이미 병합되었습니다')
    expect(byKind.sync.title).toBe('PR이 이미 병합되었습니다')
    expect(byKind.publish.label).toBe('PR 상태')
    expect(byKind.publish.title).toBe('PR이 이미 병합되었습니다')
    expect(byKind.publish.disabled).toBe(true)
  })

  it('waits for linked PR state before showing a publish prompt', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 },
        isPRStateLoading: true
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.publish.label).toBe('PR 상태')
    expect(byKind.publish.title).toBe('PR 상태 확인 중…')
    expect(byKind.publish.disabled).toBe(true)
  })

  it('omits counts from compound commit labels even when ahead/behind are nonzero', () => {
    // Why: the commit itself changes ahead/behind, so pre-commit counts would
    // be stale the moment the action fires. Plain Push/Pull/Sync continue to
    // carry counts because no commit is interposed.
    const items = resolveDropdownItems(
      inputs({
        stagedCount: 1,
        hasMessage: true,
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 3 }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.commit_push.label).toBe('커밋 후 푸시')
    expect(byKind.commit_sync.label).toBe('커밋 후 동기화')
    // Sanity check: plain counterparts still carry counts.
    expect(byKind.push.label).toBe('푸시 (2)')
    expect(byKind.sync.label).toBe('동기화 (↓3 ↑2)')
  })

  it('enables fast-forward only when the branch is behind with no local commits', () => {
    const behindOnly = resolveDropdownItems(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 0, behind: 2 } })
    )
    const diverged = resolveDropdownItems(
      inputs({ upstreamStatus: { hasUpstream: true, ahead: 1, behind: 2 } })
    )
    const behindOnlyByKind = Object.fromEntries(
      behindOnly.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    const divergedByKind = Object.fromEntries(
      diverged.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )

    expect(behindOnlyByKind.fast_forward.label).toBe('빠른 병합 (2)')
    expect(behindOnlyByKind.fast_forward.title).toBe('빠른 병합 2개 커밋')
    expect(behindOnlyByKind.fast_forward.disabled).toBe(false)
    expect(divergedByKind.fast_forward.disabled).toBe(true)
    expect(divergedByKind.fast_forward.title).toBe('로컬 커밋이 있어 빠른 병합 가져오기를 할 수 없습니다')
  })

  it('enables the push-before-PR recovery action when review creation is only blocked by unpushed commits', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 0 },
        hostedReviewCreation: {
          provider: 'github',
          review: null,
          canCreate: false,
          blockedReason: 'needs_push',
          nextAction: 'push'
        }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.create_pr.disabled).toBe(true)
    expect(byKind.create_pr.hint).toBe('먼저 푸시하세요')
    expect(byKind.push_create_pr.label).toBe('PR 전 푸시')
    expect(byKind.push_create_pr.disabled).toBe(false)
  })

  it('uses GitLab MR copy for create and push-before-create rows', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: true, ahead: 2, behind: 0 },
        hostedReviewCreation: {
          provider: 'gitlab',
          review: null,
          canCreate: false,
          blockedReason: 'needs_push',
          nextAction: 'push'
        }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.create_pr.label).toBe('MR 생성')
    expect(byKind.create_pr.hint).toBe('먼저 푸시하세요')
    expect(byKind.push_create_pr.label).toBe('MR 전 푸시')
    expect(byKind.push_create_pr.title).toBe('병합 요청을 생성하기 전에 로컬 커밋을 푸시')
    expect(byKind.push_create_pr.disabled).toBe(false)
  })

  it('uses GitLab auth copy when MR creation needs authentication', () => {
    const items = resolveDropdownItems(
      inputs({
        upstreamStatus: { hasUpstream: true, ahead: 0, behind: 0 },
        hostedReviewCreation: {
          provider: 'gitlab',
          review: null,
          canCreate: false,
          blockedReason: 'auth_required',
          nextAction: 'authenticate'
        }
      })
    )
    const byKind = Object.fromEntries(
      items.filter((e) => e.kind !== 'separator').map((e) => [e.kind, e])
    )
    expect(byKind.create_pr.hint).toBe('이 환경에서 glab auth login을 실행하세요')
  })
})
