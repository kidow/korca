// Why: split from the combined primary+dropdown module because the primary and dropdown are independent derivations with different priority ladders; together they exceed the max-lines budget and tangle unrelated concerns.

import type { HostedReviewCreationEligibility } from '../../../../shared/hosted-review'
import type { GitUpstreamStatus, PRState } from '../../../../shared/types'
import { shouldForcePushWithLeaseForUpstream } from '../../../../shared/git-upstream-status'

// Why: this module owns the pure state-machine logic for the Source Control
// primary action (split button). Keeping the logic outside the React component
// makes it straightforward to unit-test each row of the priority table without
// spinning up a renderer.

// Why: the primary button collapses to one-label-per-action. Compound
// kinds ('commit_push', 'commit_sync', 'commit_publish') live in
// DropdownActionKind only — never on the primary — so they are not part
// of this union. Narrowing the type here is load-bearing: it lets
// `handlePrimaryClick` switch exhaustively over only the kinds the
// primary can actually emit, and it kills the compound-commit branch in
// the isRemoteOperationActive tooltip below at compile time.
export type PrimaryActionKind =
  | 'commit'
  | 'stage'
  | 'push'
  | 'pull'
  | 'sync'
  | 'publish'
  | 'create_pr'

// Why: the in-flight remote op tracker stores which action the user actually
// triggered, so the primary button can mirror that label/spinner instead of
// claiming a stale or unrelated operation is running. 'fetch' is included
// because Fetch participates in the busy flag, but it is intentionally NOT
// in PrimaryActionKind — Fetch is dropdown-only, so when fetch is in flight
// the primary keeps its natural label and CommitArea suppresses the spinner.
export type RemoteOpKind =
  | 'push'
  | 'pull'
  | 'sync'
  | 'fetch'
  | 'fast_forward'
  | 'publish'
  | 'rebase'

export type PrimaryAction = {
  kind: PrimaryActionKind
  label: string
  title: string
  disabled: boolean
}

export type PrimaryActionInputs = {
  stagedCount: number
  hasUnstagedChanges: boolean
  hasPartiallyStagedChanges: boolean
  hasMessage: boolean
  hasUnresolvedConflicts: boolean
  isCommitting: boolean
  isRemoteOperationActive: boolean
  upstreamStatus: GitUpstreamStatus | undefined
  prState?: PRState | null
  isPRStateLoading?: boolean
  // Why: which remote op is currently running, when one is. null when no
  // remote op is in flight. Used by the in-flight branch below to mirror
  // the user-triggered action on the primary button instead of leaving a
  // stale label that no longer matches what the slice is doing.
  inFlightRemoteOpKind?: RemoteOpKind | null
  hostedReviewCreation?: HostedReviewCreationEligibility | null
  // Why: an unpublished branch is only worth publishing when it actually
  // carries commits beyond the compare base. Undefined preserves the old
  // behavior while the branch compare request is still unavailable/loading.
  branchCommitsAhead?: number
}

const PRIMARY_LABEL_BY_KIND: Record<Exclude<PrimaryActionKind, 'commit'>, string> = {
  stage: '모두 스테이징',
  push: '푸시',
  pull: '가져오기',
  sync: '동기화',
  publish: '브랜치 게시',
  create_pr: 'PR 생성'
}

function reviewCopy(provider: HostedReviewCreationEligibility['provider'] | undefined): {
  shortLabel: 'PR' | 'MR'
  reviewLabel: '풀 리퀘스트' | '병합 요청'
} {
  return provider === 'gitlab'
    ? { shortLabel: 'MR', reviewLabel: '병합 요청' }
    : { shortLabel: 'PR', reviewLabel: '풀 리퀘스트' }
}

function describePushCount(ahead: number): string {
  return `푸시 ${ahead}개 커밋`
}

function describePullCount(behind: number): string {
  return `가져오기 ${behind}개 커밋`
}

function describeSyncCounts(ahead: number, behind: number): string {
  return `가져오기 ${behind}, 푸시 ${ahead}`
}

function describeForcePushWithLease(count: number | undefined, upstreamName?: string): string {
  const countText =
    count && count > 0 ? `${count}개의 브랜치 커밋` : '이 브랜치'
  return `원격에는 로컬 커밋의 더 오래된 복사본만 있습니다. ${countText}을 lease와 함께 강제 푸시하여 ${upstreamName ?? '원격 브랜치'}를 업데이트하세요.`
}

/**
 * Resolve the primary split-button action.
 *
 * Priority order mirrors the design-doc state machine:
 *   1. In-flight commit locks the primary to a disabled "Commit".
 *   2. In-flight remote operation keeps the current label but disables it.
 *   3. Unresolved conflicts block the commit path entirely.
 *   4. Has partially staged files → "Stage All" to avoid hook-time partial
 *      stash conflicts.
 *   5. Has staged files + message → plain "Commit" (compound flows live in
 *      the dropdown; after the commit lands, step 7 rotates the primary to
 *      the appropriate single remote action).
 *   6. Has staged files + no message → disabled "Commit" with a reason.
 *   7. Clean tree → adaptive remote action (or disabled "Commit" no-op).
 *
 * An undefined upstream status means fetchUpstreamStatus has not resolved
 * yet for this worktree. We return a disabled Commit so the button has a
 * stable frame until the real status lands — otherwise it would flash
 * through "Publish Branch" on every worktree switch.
 */
export function resolvePrimaryAction(inputs: PrimaryActionInputs): PrimaryAction {
  const {
    stagedCount,
    hasUnstagedChanges,
    hasPartiallyStagedChanges,
    hasMessage,
    hasUnresolvedConflicts,
    isCommitting,
    isRemoteOperationActive,
    upstreamStatus,
    prState,
    isPRStateLoading,
    inFlightRemoteOpKind,
    hostedReviewCreation,
    branchCommitsAhead
  } = inputs

  // 1. Commit in flight — lock the primary no matter what else is true.
  if (isCommitting) {
    return {
      kind: 'commit',
      label: '커밋',
      title: '커밋 진행 중…',
      disabled: true
    }
  }

  // 2. Remote op in flight — disable the primary. When the in-flight op
  //    is a primary-eligible kind that doesn't match the primary's natural
  //    label, mirror the in-flight kind so the user sees the action they
  //    actually triggered (e.g. "Sync" when they picked Sync from the
  //    dropdown while the primary's natural state was "Push"). When the
  //    in-flight op matches the primary's natural kind we keep the natural
  //    label so its richer detail (counts like "Push 3 commits") survives.
  //    Fetch and unknown in-flight kinds leave the primary's natural label
  //    intact; CommitArea's spinner suppresses itself via the kind-mismatch
  //    check so a non-matching in-flight op doesn't visually claim the
  //    primary as its host.
  if (isRemoteOperationActive) {
    const candidate = resolvePrimaryAction({ ...inputs, isRemoteOperationActive: false })
    const inFlightIsPrimaryKind =
      inFlightRemoteOpKind === 'push' ||
      inFlightRemoteOpKind === 'pull' ||
      inFlightRemoteOpKind === 'sync' ||
      inFlightRemoteOpKind === 'publish'

    if (inFlightIsPrimaryKind && candidate.kind !== inFlightRemoteOpKind) {
      const label = PRIMARY_LABEL_BY_KIND[inFlightRemoteOpKind]
      return {
        kind: inFlightRemoteOpKind,
        label,
        title: `${label} 진행 중…`,
        disabled: true
      }
    }

    // Why: when the candidate label is "Commit", the generic "remote
    // operation in progress…" tooltip mismatches the visible label. Point
    // the user at the fact that the commit will wait, keeping the label and
    // the explanation consistent. Conflicts take precedence over the remote
    // tooltip because resolving them is the only action the user can start
    // while the remote op runs.
    const title = hasUnresolvedConflicts
      ? '커밋하기 전에 충돌을 해결하세요'
      : candidate.kind === 'commit'
        ? '원격 작업이 진행 중입니다. 끝난 뒤 다시 시도하세요'
        : '원격 작업 진행 중…'
    return {
      ...candidate,
      title,
      disabled: true
    }
  }

  // 3. Unresolved conflicts block any commit path.
  if (hasUnresolvedConflicts) {
    return {
      kind: 'commit',
      label: '커밋',
      title: '커밋하기 전에 충돌을 해결하세요',
      disabled: true
    }
  }

  const hasStaged = stagedCount > 0

  // 4. A path with both staged and unstaged edits can make lint-staged's
  // partial-stash restore fail after formatters rewrite the staged copy. Push
  // the user through Stage All first so the index matches the worktree.
  if (hasStaged && hasPartiallyStagedChanges) {
    return {
      kind: 'stage',
      label: '모두 스테이징',
      title: '부분적으로 스테이징된 파일을 커밋하기 전에 모든 변경 사항을 스테이징하세요',
      disabled: false
    }
  }

  // 5. Has staged files + message → plain Commit. The primary button never
  //    compounds ("Commit & Push" etc.) — after the commit lands, the primary
  //    naturally rotates to the appropriate remote action (Push / Sync /
  //    Publish Branch) via step 7 below. Users who want the one-click
  //    compound flow can still reach it from the dropdown.
  if (hasStaged && hasMessage) {
    return {
      kind: 'commit',
      label: '커밋',
      title: '스테이징된 변경 사항을 커밋',
      disabled: false
    }
  }

  // 6. Has staged files but no message — user just needs to type something.
  if (hasStaged && !hasMessage) {
    return {
      kind: 'commit',
      label: '커밋',
      title: '커밋하려면 커밋 메시지를 입력하세요',
      disabled: true
    }
  }

  // 6b. Nothing staged but local changes exist — surface staging as the
  //     primary so dirty trees don't invite a remote op (pull/sync would fail
  //     with uncommitted changes; push/publish skips the actual user need).
  //     Sits before the upstream-status checks so it works regardless of
  //     whether upstream has resolved yet.
  if (!hasStaged && hasUnstagedChanges) {
    return {
      kind: 'stage',
      label: '모두 스테이징',
      title: '모든 변경 사항을 스테이징',
      disabled: false
    }
  }

  // 7. Clean tree + no staged files → adaptive remote action.
  if (!upstreamStatus) {
    return {
      kind: 'commit',
      label: '커밋',
      title: '커밋하려면 파일 하나 이상을 스테이징하세요',
      disabled: true
    }
  }

  if (!upstreamStatus.hasUpstream) {
    if (branchCommitsAhead === 0) {
      return {
        kind: 'commit',
        label: '커밋',
        title: '커밋할 내용이 없습니다. 브랜치에 게시할 변경 사항이 없습니다.',
        disabled: true
      }
    }

    if (isPRStateLoading) {
      return {
        kind: 'commit',
        label: '커밋',
        title: 'PR 상태 확인 중…',
        disabled: true
      }
    }

    if (prState === 'merged') {
      return {
        kind: 'commit',
        label: '커밋',
        title: '커밋할 내용이 없습니다. PR이 이미 병합되었습니다.',
        disabled: true
      }
    }

    return {
      kind: 'publish',
      label: '브랜치 게시',
      title: '이 브랜치를 origin에 게시',
      disabled: false
    }
  }

  if (upstreamStatus.ahead > 0 && upstreamStatus.behind > 0) {
    if (shouldForcePushWithLeaseForUpstream(upstreamStatus)) {
      return {
        kind: 'push',
        label: '강제 푸시',
        title: describeForcePushWithLease(branchCommitsAhead, upstreamStatus.upstreamName),
        disabled: false
      }
    }
    return {
      kind: 'sync',
      label: '동기화',
      title: describeSyncCounts(upstreamStatus.ahead, upstreamStatus.behind),
      disabled: false
    }
  }
  if (upstreamStatus.behind > 0) {
    return {
      kind: 'pull',
      label: '가져오기',
      title: describePullCount(upstreamStatus.behind),
      disabled: false
    }
  }
  if (upstreamStatus.ahead > 0) {
    return {
      kind: 'push',
      label: '푸시',
      title: describePushCount(upstreamStatus.ahead),
      disabled: false
    }
  }

  if (hostedReviewCreation?.canCreate) {
    const copy = reviewCopy(hostedReviewCreation.provider)
    return {
      kind: 'create_pr',
      label: `${copy.shortLabel} 생성`,
      title: `이 브랜치에 대한 ${copy.reviewLabel}를 생성`,
      disabled: false
    }
  }

  // Clean + tracked + in sync — distinguish truly clean from work that still
  // needs staging before commit can proceed.
  return {
      kind: 'commit',
      label: '커밋',
      title: hasUnstagedChanges
      ? '커밋하려면 파일 하나 이상을 스테이징하세요'
      : '커밋할 내용이 없습니다. 브랜치가 최신입니다.',
      disabled: true
  }
}
