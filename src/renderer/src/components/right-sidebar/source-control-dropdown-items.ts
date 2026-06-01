/* eslint-disable max-lines -- Why: this dropdown state machine keeps every action row in one table so priority and disabled-state regressions stay visible in tests. */
// Why: split from source-control-primary-action because the primary and dropdown are independent derivations with different priority ladders; together they exceed the max-lines budget and tangle unrelated concerns.

import type { PrimaryActionInputs } from './source-control-primary-action'
import type { GitConflictOperation } from '../../../../shared/types'
import { shouldForcePushWithLeaseForUpstream } from '../../../../shared/git-upstream-status'

export type DropdownActionInputs = PrimaryActionInputs & {
  conflictOperation?: GitConflictOperation
  isPullRequestOperationActive?: boolean
  rebaseBaseRef?: string | null
}

export type DropdownActionKind =
  | 'commit'
  | 'commit_push'
  | 'commit_sync'
  | 'abort_merge'
  | 'abort_rebase'
  | 'create_pr'
  | 'push_create_pr'
  | 'push'
  | 'pull'
  | 'fast_forward'
  | 'sync'
  | 'rebase_base'
  | 'fetch'
  | 'publish'

export type DropdownItem = {
  kind: DropdownActionKind
  label: string
  title: string
  disabled: boolean
  hint?: string
  variant?: 'default' | 'destructive'
}

export type DropdownSeparator = { kind: 'separator' }

export type DropdownEntry = DropdownItem | DropdownSeparator

function describePushCount(ahead: number): string {
  return `푸시 ${ahead}개 커밋`
}

function describePullCount(behind: number): string {
  return `가져오기 ${behind}개 커밋`
}

function describeFastForwardCount(behind: number): string {
  return `빠른 병합 ${behind}개 커밋`
}

function describeSyncCounts(ahead: number, behind: number): string {
  return `가져오기 ${behind}, 푸시 ${ahead}`
}

function formatCountLabel(base: string, count: number): string {
  return count > 0 ? `${base} (${count})` : base
}

function formatSyncLabel(base: string, ahead: number, behind: number): string {
  if (ahead === 0 && behind === 0) {
    return base
  }
  return `${base} (↓${behind} ↑${ahead})`
}

function formatForcePushTitle(branchCommitsAhead: number | undefined, upstreamName?: string) {
  const countText =
    branchCommitsAhead && branchCommitsAhead > 0
      ? `${branchCommitsAhead}개의 브랜치 커밋`
      : '이 브랜치'
  return `원격에는 로컬 커밋의 더 오래된 복사본만 있습니다. ${countText}을 lease와 함께 강제 푸시하여 ${upstreamName ?? '원격 브랜치'}를 업데이트하세요.`
}

function formatRebaseBaseRef(baseRef: string): string {
  return baseRef.replace(/^refs\/remotes\//, '').replace(/^remotes\//, '')
}

function reviewCopy(
  provider: NonNullable<PrimaryActionInputs['hostedReviewCreation']>['provider'] | undefined
): {
  shortLabel: 'PR' | 'MR'
  reviewLabel: '풀 리퀘스트' | '병합 요청'
  providerName: 'GitHub' | 'GitLab'
  authCommand: 'gh auth login' | 'glab auth login'
} {
  return provider === 'gitlab'
    ? {
        shortLabel: 'MR',
        reviewLabel: '병합 요청',
        providerName: 'GitLab',
        authCommand: 'glab auth login'
      }
    : {
        shortLabel: 'PR',
        reviewLabel: '풀 리퀘스트',
        providerName: 'GitHub',
        authCommand: 'gh auth login'
    }
}

function withObjectParticle(label: '풀 리퀘스트' | '병합 요청'): string {
  return label === '병합 요청' ? `${label}을` : `${label}를`
}

/**
 * Resolve the chevron dropdown items. Every item is always rendered so the
 * menu shape stays stable across states; inapplicable rows are disabled
 * with a tooltip reason rather than hidden.
 */
export function resolveDropdownItems(inputs: DropdownActionInputs): DropdownEntry[] {
  const {
    stagedCount,
    hasPartiallyStagedChanges,
    hasMessage,
    hasUnresolvedConflicts,
    isCommitting,
    isRemoteOperationActive,
    upstreamStatus,
    prState,
    isPRStateLoading,
    hostedReviewCreation,
    conflictOperation = 'unknown',
    branchCommitsAhead,
    rebaseBaseRef,
    isPullRequestOperationActive = false
  } = inputs

  const hasStaged = stagedCount > 0
  const hasDirtyLocalChanges = hasStaged || inputs.hasUnstagedChanges
  // Why: mirror the primary-action guard. When upstreamStatus is undefined,
  // fetchUpstreamStatus hasn't resolved for this worktree yet. Collapsing that
  // to hasUpstream=false would re-enable Publish Branch on an already-tracked
  // branch during the post-worktree-switch transient window, and a click there
  // would re-run `git push -u` and clobber the real upstream. Every
  // upstream-dependent row disables itself while loading so the primary
  // button's stable-frame guarantee extends to the dropdown.
  const upstreamLoading = upstreamStatus === undefined
  const hasUpstream = upstreamStatus?.hasUpstream ?? false
  const publishBlockedByMergedPR = !hasUpstream && prState === 'merged'
  const publishBlockedByPRLoading = !hasUpstream && !!isPRStateLoading
  const publishBlockedByNoBranchCommits = !hasUpstream && branchCommitsAhead === 0
  const publishBlockedByUncommittedChanges = publishBlockedByNoBranchCommits && hasDirtyLocalChanges
  const ahead = upstreamStatus?.ahead ?? 0
  const behind = upstreamStatus?.behind ?? 0
  const shouldForcePushWithLease = shouldForcePushWithLeaseForUpstream(upstreamStatus)
  const pushLabelCount =
    shouldForcePushWithLease && branchCommitsAhead !== undefined ? branchCommitsAhead : ahead
  const forcePushTitle = formatForcePushTitle(branchCommitsAhead, upstreamStatus?.upstreamName)
  const createReviewCopy = reviewCopy(hostedReviewCreation?.provider)

  // Why: any in-flight commit or remote operation should lock the whole menu.
  // A running push shouldn't let a second pull/sync click queue up behind it
  // on a stale status snapshot.
  const globalBusy = isCommitting || isRemoteOperationActive || isPullRequestOperationActive

  const commitDisabledReason = (() => {
    if (hasUnresolvedConflicts) {
      return '커밋하기 전에 충돌을 해결하세요'
    }
    if (!hasStaged) {
      return '커밋하려면 파일 하나 이상을 스테이징하세요'
    }
    if (hasPartiallyStagedChanges) {
      return '부분적으로 스테이징된 파일을 커밋하기 전에 모든 변경 사항을 스테이징하세요'
    }
    if (!hasMessage) {
      return '커밋하려면 커밋 메시지를 입력하세요'
    }
    return null
  })()
  const canCommit = !globalBusy && commitDisabledReason === null
  const commitItem: DropdownItem = {
    kind: 'commit',
    label: '커밋',
    title: commitDisabledReason ?? '스테이징된 변경 사항을 커밋',
    disabled: !canCommit
  }

  // Why: compound commit labels omit counts because the commit itself changes
  // ahead/behind — surfacing pre-commit numbers would be misleading (e.g.
  // "Commit & Push (2)" would still read "2" after the commit lands at 3).
  // On an unpublished branch, Commit & Push is unavailable: the user must
  // Publish Branch first (offered via the primary action), after which
  // Commit & Push becomes enabled. Tooltips mirror pushItem/syncItem copy
  // so the "publish first" instruction is consistent across the menu.
  const commitPushTitle = upstreamLoading
    ? '브랜치 상태 확인 중…'
    : publishBlockedByPRLoading
      ? 'PR 상태 확인 중…'
      : publishBlockedByMergedPR
        ? 'PR이 이미 병합되었습니다'
        : !hasUpstream
          ? '커밋을 푸시하려면 먼저 브랜치를 게시하세요'
          : (commitDisabledReason ??
            (shouldForcePushWithLease
              ? '스테이징된 변경 사항을 커밋하고 lease와 함께 강제 푸시'
              : behind > 0
                ? '커밋 후 동기화를 사용해 원격 변경 사항을 먼저 가져오세요'
                : '스테이징된 변경 사항을 커밋하고 푸시'))
  const commitPushItem: DropdownItem = {
    kind: 'commit_push',
    label: shouldForcePushWithLease ? '커밋 후 강제 푸시' : '커밋 후 푸시',
    title: commitPushTitle,
    disabled:
      globalBusy ||
      upstreamLoading ||
      !hasUpstream ||
      (behind > 0 && !shouldForcePushWithLease) ||
      publishBlockedByPRLoading ||
      publishBlockedByMergedPR ||
      commitDisabledReason !== null
  }

  const commitSyncTitle = (() => {
    if (upstreamLoading) {
      return '브랜치 상태 확인 중…'
    }
    if (publishBlockedByPRLoading) {
      return 'PR 상태 확인 중…'
    }
    if (publishBlockedByMergedPR) {
      return 'PR이 이미 병합되었습니다'
    }
    if (!hasUpstream) {
      // Why: mirror pushItem/syncItem — direct the user to Publish Branch
      // (the primary action on an unpublished branch) rather than naming a
      // nonexistent compound action.
      return '커밋을 동기화하려면 먼저 브랜치를 게시하세요'
    }
    if (shouldForcePushWithLease) {
      return (
        commitDisabledReason ??
        '커밋 후 강제 푸시를 사용하세요. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
      )
    }
    if (behind === 0) {
      return '가져올 내용이 없습니다. 대신 커밋 후 푸시를 사용하세요.'
    }
    return commitDisabledReason ?? '커밋 후 가져오기와 푸시'
  })()
  const commitSyncItem: DropdownItem = {
    kind: 'commit_sync',
    label: '커밋 후 동기화',
    title: commitSyncTitle,
    disabled:
      globalBusy ||
      upstreamLoading ||
      !hasUpstream ||
      shouldForcePushWithLease ||
      behind === 0 ||
      commitDisabledReason !== null
  }

  const pushItem: DropdownItem = {
    kind: 'push',
    label: formatCountLabel(shouldForcePushWithLease ? '강제 푸시' : '푸시', pushLabelCount),
    title: upstreamLoading
      ? '브랜치 상태 확인 중…'
      : publishBlockedByPRLoading
        ? 'PR 상태 확인 중…'
        : publishBlockedByMergedPR
          ? 'PR이 이미 병합되었습니다'
          : !hasUpstream
            ? '커밋을 푸시하려면 먼저 브랜치를 게시하세요'
            : shouldForcePushWithLease
              ? forcePushTitle
              : behind > 0 && ahead > 0
                ? '푸시 전에 동기화해 원격 변경 사항을 먼저 가져오세요'
                : ahead === 0
                  ? `푸시할 내용이 없습니다${upstreamStatus?.upstreamName ? `: ${upstreamStatus.upstreamName}` : ''}`
                  : describePushCount(ahead),
    disabled:
      globalBusy ||
      upstreamLoading ||
      !hasUpstream ||
      ahead === 0 ||
      (behind > 0 && !shouldForcePushWithLease)
  }

  const pullItem: DropdownItem = {
    kind: 'pull',
    label: formatCountLabel('가져오기', behind),
    title: upstreamLoading
      ? '브랜치 상태 확인 중…'
      : publishBlockedByPRLoading
        ? 'PR 상태 확인 중…'
        : publishBlockedByMergedPR
          ? 'PR이 이미 병합되었습니다'
          : !hasUpstream
            ? '커밋을 가져오려면 먼저 브랜치를 게시하세요'
            : shouldForcePushWithLease
              ? '가져올 새 내용이 없습니다. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
              : behind === 0
                ? '가져올 내용이 없습니다'
                : describePullCount(behind),
    disabled:
      globalBusy || upstreamLoading || !hasUpstream || behind === 0 || shouldForcePushWithLease
  }

  const fastForwardItem: DropdownItem = {
    kind: 'fast_forward',
    label: formatCountLabel('빠른 병합', behind),
    title: upstreamLoading
      ? '브랜치 상태 확인 중…'
      : publishBlockedByPRLoading
        ? 'PR 상태 확인 중…'
        : publishBlockedByMergedPR
          ? 'PR이 이미 병합되었습니다'
          : !hasUpstream
            ? '빠른 병합하려면 먼저 브랜치를 게시하세요'
            : shouldForcePushWithLease
              ? '빠른 병합할 새 내용이 없습니다. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
              : behind === 0
                ? '빠른 병합할 내용이 없습니다'
                : ahead > 0
                  ? '로컬 커밋이 있어 빠른 병합 가져오기를 할 수 없습니다'
                  : describeFastForwardCount(behind),
    disabled:
      globalBusy ||
      upstreamLoading ||
      !hasUpstream ||
      behind === 0 ||
      ahead > 0 ||
      shouldForcePushWithLease
  }

  const syncItem: DropdownItem = {
    kind: 'sync',
    label: formatSyncLabel('동기화', ahead, behind),
    title: upstreamLoading
      ? '브랜치 상태 확인 중…'
      : publishBlockedByPRLoading
        ? 'PR 상태 확인 중…'
        : publishBlockedByMergedPR
          ? 'PR이 이미 병합되었습니다'
          : !hasUpstream
            ? '커밋을 동기화하려면 먼저 브랜치를 게시하세요'
            : shouldForcePushWithLease
              ? '강제 푸시를 사용하세요. 원격에는 로컬 커밋의 더 오래된 복사본만 있습니다.'
              : ahead === 0 && behind === 0
                ? '브랜치가 최신입니다'
                : describeSyncCounts(ahead, behind),
    disabled:
      globalBusy ||
      upstreamLoading ||
      !hasUpstream ||
      shouldForcePushWithLease ||
      (ahead === 0 && behind === 0)
  }

  const rebaseBaseLabel = rebaseBaseRef ? formatRebaseBaseRef(rebaseBaseRef) : null
  const hasRemoteBaseRef = rebaseBaseLabel?.includes('/') === true
  const rebaseItem: DropdownItem = {
    kind: 'rebase_base',
    label: rebaseBaseLabel ? `${rebaseBaseLabel}에서 리베이스` : '기준 브랜치에서 리베이스',
    title: (() => {
      if (!rebaseBaseLabel || !hasRemoteBaseRef) {
        return '리베이스할 원격 기준 브랜치를 선택하세요'
      }
      if (hasUnresolvedConflicts) {
        return '리베이스하기 전에 충돌을 해결하세요'
      }
      if (hasDirtyLocalChanges) {
        return '리베이스하기 전에 로컬 변경 사항을 커밋하거나 스태시하세요'
      }
      return `${rebaseBaseLabel}의 최신 커밋으로 현재 브랜치를 리베이스`
    })(),
    disabled:
      globalBusy ||
      !rebaseBaseRef ||
      !hasRemoteBaseRef ||
      hasUnresolvedConflicts ||
      hasDirtyLocalChanges
  }

  const fetchItem: DropdownItem = {
    kind: 'fetch',
    label: '가져오기',
    title: upstreamLoading ? '브랜치 상태 확인 중…' : '병합하지 않고 원격에서 가져오기',
    disabled: globalBusy || upstreamLoading
  }

  const publishItem: DropdownItem = {
    kind: 'publish',
    label:
      publishBlockedByMergedPR || publishBlockedByPRLoading
      ? 'PR 상태'
      : publishBlockedByUncommittedChanges
          ? '먼저 변경 사항을 커밋'
          : publishBlockedByNoBranchCommits
            ? '브랜치 변경 사항 없음'
            : '브랜치 게시',
    title: upstreamLoading
      ? '브랜치 상태 확인 중…'
      : publishBlockedByPRLoading
        ? 'PR 상태 확인 중…'
        : publishBlockedByMergedPR
          ? 'PR이 이미 병합되었습니다'
          : publishBlockedByUncommittedChanges
            ? '브랜치를 게시하기 전에 변경 사항을 커밋하세요'
            : publishBlockedByNoBranchCommits
              ? '게시할 내용이 없습니다'
              : hasUpstream
                ? '브랜치가 이미 게시되었습니다'
                : '이 브랜치를 origin에 게시',
    disabled:
      globalBusy ||
      upstreamLoading ||
      hasUpstream ||
      publishBlockedByPRLoading ||
      publishBlockedByMergedPR ||
      publishBlockedByNoBranchCommits
  }

  const createBlockedHint = (() => {
    switch (hostedReviewCreation?.blockedReason) {
      case 'dirty':
        return '먼저 변경 사항을 커밋'
      case 'detached_head':
        return '먼저 브랜치를 체크아웃하세요'
      case 'default_branch':
        return '기능 브랜치로 전환하세요'
      case 'no_upstream':
        return '브랜치 게시'
      case 'needs_push':
        return '먼저 푸시하세요'
      case 'needs_sync':
        return shouldForcePushWithLease ? '먼저 강제 푸시' : '먼저 동기화'
      case 'auth_required':
        return `이 환경에서 ${createReviewCopy.authCommand}를 실행하세요`
      case 'unsupported_provider':
        return '지원되지 않는 제공자'
      case 'existing_review':
        return `이미 ${createReviewCopy.reviewLabel}가 있습니다`
      case 'fork_head_unsupported':
        return '포크 헤드는 지원되지 않습니다'
      case null:
      case undefined:
        return upstreamLoading ? '브랜치 상태 확인 중…' : '브랜치가 준비되지 않았습니다'
    }
  })()

  const createPRItem: DropdownItem = {
    kind: 'create_pr',
    label: `${createReviewCopy.shortLabel} 생성`,
    title: hostedReviewCreation?.canCreate
      ? `이 브랜치에 대한 ${withObjectParticle(createReviewCopy.reviewLabel)} 생성`
      : createBlockedHint,
    hint: hostedReviewCreation?.canCreate ? undefined : createBlockedHint,
    disabled: globalBusy || upstreamLoading || !hostedReviewCreation?.canCreate
  }

  const canPushAndCreate =
    !globalBusy &&
    !upstreamLoading &&
    (hostedReviewCreation?.provider === 'github' || hostedReviewCreation?.provider === 'gitlab') &&
    (hostedReviewCreation.blockedReason === 'needs_push' ||
      (hostedReviewCreation.blockedReason === 'needs_sync' && shouldForcePushWithLease))
  const pushCreatePRItem: DropdownItem = {
    kind: 'push_create_pr',
    label: shouldForcePushWithLease
      ? `${createReviewCopy.shortLabel} 전 강제 푸시`
      : `${createReviewCopy.shortLabel} 전 푸시`,
    title: canPushAndCreate
      ? shouldForcePushWithLease
        ? `${withObjectParticle(createReviewCopy.reviewLabel)} 생성하기 전에 lease와 함께 강제 푸시`
        : `${withObjectParticle(createReviewCopy.reviewLabel)} 생성하기 전에 로컬 커밋을 푸시`
      : createBlockedHint,
    hint: canPushAndCreate ? undefined : createBlockedHint,
    disabled: !canPushAndCreate
  }

  const entries: DropdownEntry[] = [
    commitItem,
    commitPushItem,
    commitSyncItem,
    { kind: 'separator' },
    pushItem,
    createPRItem,
    pushCreatePRItem,
    pullItem,
    fastForwardItem,
    syncItem,
    rebaseItem,
    fetchItem,
    publishItem
  ]
  if (conflictOperation === 'merge' || conflictOperation === 'rebase') {
    const isRebase = conflictOperation === 'rebase'
    const label = isRebase ? '리베이스 중단' : '병합 중단'
    entries.push(
      { kind: 'separator' },
      {
        kind: isRebase ? 'abort_rebase' : 'abort_merge',
        label,
        title: globalBusy ? '작업 진행 중…' : `진행 중인 ${conflictOperation}를 중단`,
        disabled: globalBusy,
        variant: 'destructive'
      }
    )
  }
  if (!isPullRequestOperationActive) {
    return entries
  }
  return entries.map((entry) =>
    entry.kind === 'separator'
      ? entry
      : {
          ...entry,
          title: '호스티드 리뷰 작업 진행 중…',
          disabled: true
        }
  )
}
