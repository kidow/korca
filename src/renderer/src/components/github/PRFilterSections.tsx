import React from 'react'
import { ChevronRight } from 'lucide-react'
import {
  MultiSelectList,
  SingleSelectList,
  type PickerOption
} from '@/components/github/PRFilterPickers'
import { cn } from '@/lib/utils'
import type { ParsedTaskQuery } from '../../../../shared/task-query'

export type PRFilterChange = {
  author?: string | null
  assignee?: string | null
  reviewer?: { kind: 'requested' | 'reviewed-by'; login: string } | null
  labels?: string[]
  state?: 'open' | 'closed' | 'merged' | 'all'
  draft?: boolean
}

export type SectionKey = 'status' | 'author' | 'label' | 'reviewer' | 'assignee'

function statusLabel(parsed: ParsedTaskQuery): string {
  const parts: string[] = []
  if (parsed.state === 'open') {
    parts.push('열림')
  } else if (parsed.state === 'closed') {
    parts.push('닫힘')
  } else if (parsed.state === 'merged') {
    parts.push('병합됨')
  } else if (parsed.state === 'all') {
    parts.push('전체')
  }
  if (parsed.draft) {
    parts.push('초안')
  }
  return parts.join(' · ')
}

function StatusSection({
  parsed,
  kind,
  onSelect
}: {
  parsed: ParsedTaskQuery
  kind: 'prs' | 'issues'
  onSelect: (change: PRFilterChange) => void
}): React.JSX.Element {
  const states: { key: 'open' | 'closed' | 'merged' | 'all'; label: string }[] =
    kind === 'prs'
      ? [
          { key: 'open', label: '열림' },
          { key: 'closed', label: '닫힘' },
          { key: 'merged', label: '병합됨' },
          { key: 'all', label: '전체 상태' }
        ]
      : [
          { key: 'open', label: '열림' },
          { key: 'closed', label: '닫힘' },
          { key: 'all', label: '전체 상태' }
        ]
  return (
    <div className="py-1 text-xs">
      {states.map((s) => {
        const active = parsed.state === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect({ state: s.key })}
            className={cn(
              'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-muted/50',
              active && 'bg-muted/40 font-medium'
            )}
          >
            <span>{s.label}</span>
            {active ? <span className="text-[10px] text-muted-foreground">선택됨</span> : null}
          </button>
        )
      })}
      {kind !== 'prs' ? null : <DraftToggle parsed={parsed} onSelect={onSelect} />}
    </div>
  )
}

function DraftToggle({
  parsed,
  onSelect
}: {
  parsed: ParsedTaskQuery
  onSelect: (change: PRFilterChange) => void
}): React.JSX.Element {
  return (
    <>
      <div className="my-1 h-px bg-border" />
      <button
        type="button"
        onClick={() => onSelect({ draft: !parsed.draft })}
        className={cn(
          'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-muted/50',
          parsed.draft && 'bg-muted/40 font-medium'
        )}
      >
        <span>초안만</span>
        {parsed.draft ? (
          <span className="text-[10px] text-muted-foreground">켜짐</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">꺼짐</span>
        )}
      </button>
    </>
  )
}

function UserOptionRow({ option }: { option: PickerOption }): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate">{option.primary}</span>
      {option.secondary ? (
        <span className="truncate text-[10px] text-muted-foreground">{option.secondary}</span>
      ) : null}
    </div>
  )
}

export function SectionMenu({
  parsed,
  kind,
  reviewerActive,
  reviewerKind,
  onPick,
  onClearAll
}: {
  parsed: ParsedTaskQuery
  kind: 'prs' | 'issues'
  reviewerActive: string | null
  reviewerKind: 'requested' | 'reviewed-by'
  onPick: (s: SectionKey) => void
  onClearAll: (() => void) | null
}): React.JSX.Element {
  const status = statusLabel(parsed)
  const rows: { key: SectionKey; label: string; value: string | null }[] = [
    { key: 'status', label: '상태', value: status || null },
    { key: 'author', label: '작성자', value: parsed.author },
    {
      key: 'label',
      label: '레이블',
      value:
        parsed.labels.length === 0
          ? null
          : parsed.labels.length === 1
            ? parsed.labels[0]
            : `레이블 ${parsed.labels.length}개`
    },
    ...(kind === 'prs'
      ? [
          {
            key: 'reviewer' as SectionKey,
            label: reviewerKind === 'reviewed-by' ? '검토한 사람' : '검토 요청',
            value: reviewerActive
          }
        ]
      : []),
    { key: 'assignee', label: '담당자', value: parsed.assignee }
  ]
  const subject = kind === 'prs' ? '풀 리퀘스트' : '이슈'
  return (
    <div className="py-1 text-xs">
      <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {subject} 필터
      </div>
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          onClick={() => onPick(row.key)}
          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-muted/50"
        >
          <span>{row.label}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {row.value ? <span className="max-w-[140px] truncate">{row.value}</span> : null}
            <ChevronRight className="size-3.5" />
          </span>
        </button>
      ))}
      {onClearAll ? (
        <>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={onClearAll}
            className="w-full px-3 py-1.5 text-left text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
          >
            모든 필터 지우기
          </button>
        </>
      ) : null}
    </div>
  )
}

export function SectionDetail({
  section,
  parsed,
  kind,
  authorOpts,
  userOpts,
  labelOpts,
  labelsLoading,
  labelsError,
  usersLoading,
  usersError,
  reviewerMode,
  setReviewerMode,
  onBack,
  onSelect
}: {
  section: SectionKey
  parsed: ParsedTaskQuery
  kind: 'prs' | 'issues'
  authorOpts: PickerOption[]
  userOpts: PickerOption[]
  labelOpts: PickerOption[]
  labelsLoading: boolean
  labelsError: string | null
  usersLoading: boolean
  usersError: string | null
  reviewerMode: 'requested' | 'reviewed-by'
  setReviewerMode: (mode: 'requested' | 'reviewed-by') => void
  onBack: () => void
  onSelect: (change: PRFilterChange) => void
}): React.JSX.Element {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-1 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
      >
        <ChevronRight className="size-3 rotate-180" />
        뒤로
      </button>
      {section === 'status' ? (
        <StatusSection parsed={parsed} kind={kind} onSelect={onSelect} />
      ) : null}
      {section === 'author' ? (
        <SingleSelectList
          options={authorOpts}
          activeValue={parsed.author}
          loading={false}
          error={null}
          searchPlaceholder="로그인명으로 필터하거나 입력하세요..."
          emptyText="작성자 없음"
          allowCustomValue
          renderOption={(opt) => <UserOptionRow option={opt} />}
          onSelect={(value) => onSelect({ author: value })}
        />
      ) : null}
      {section === 'assignee' ? (
        <SingleSelectList
          options={userOpts}
          activeValue={parsed.assignee}
          loading={usersLoading}
          error={usersError}
          searchPlaceholder="로그인명으로 필터하거나 입력하세요..."
          emptyText="사용자 없음"
          allowCustomValue
          renderOption={(opt) => <UserOptionRow option={opt} />}
          onSelect={(value) => onSelect({ assignee: value })}
        />
      ) : null}
      {section === 'label' ? (
        <MultiSelectList
          options={labelOpts}
          selected={parsed.labels}
          loading={labelsLoading}
          error={labelsError}
          searchPlaceholder="레이블 필터..."
          emptyText="레이블 없음"
          onChange={(next) => onSelect({ labels: next })}
        />
      ) : null}
      {section === 'reviewer' ? (
        <>
          <div className="flex gap-1 border-b border-border p-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setReviewerMode('requested')}
              className={cn(
                'flex-1 rounded px-2 py-1 transition',
                reviewerMode === 'requested'
                  ? 'bg-foreground/90 text-background'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              검토 요청
            </button>
            <button
              type="button"
              onClick={() => setReviewerMode('reviewed-by')}
              className={cn(
                'flex-1 rounded px-2 py-1 transition',
                reviewerMode === 'reviewed-by'
                  ? 'bg-foreground/90 text-background'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              검토한 사람
            </button>
          </div>
          <SingleSelectList
            options={userOpts}
            activeValue={reviewerMode === 'requested' ? parsed.reviewRequested : parsed.reviewedBy}
            loading={usersLoading}
            error={usersError}
            searchPlaceholder="로그인명으로 필터하거나 입력하세요..."
            emptyText="사용자 없음"
            allowCustomValue
            renderOption={(opt) => <UserOptionRow option={opt} />}
            onSelect={(login) =>
              onSelect({ reviewer: login ? { kind: reviewerMode, login } : null })
            }
          />
        </>
      ) : null}
    </div>
  )
}
