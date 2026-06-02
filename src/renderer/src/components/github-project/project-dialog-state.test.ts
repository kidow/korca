import { describe, expect, it } from 'vitest'
import {
  resolveMissingRepoProjectDialogState,
  resolveRepoBackedProjectDialogState
} from './project-dialog-state'

describe('resolveRepoBackedProjectDialogState', () => {
  it('keeps a repo-backed dialog when the repo still exists', () => {
    const dialog = { repoId: 'repo-1', label: 'Issue 1' }

    expect(resolveRepoBackedProjectDialogState(dialog, new Set(['repo-1']))).toBe(dialog)
  })

  it('clears a repo-backed dialog when its repo is removed', () => {
    expect(
      resolveRepoBackedProjectDialogState({ repoId: 'repo-1' }, new Set(['repo-2']))
    ).toBeNull()
  })
})

describe('resolveMissingRepoProjectDialogState', () => {
  it('waits for the slug index before closing missing-repo dialogs', () => {
    const slugDialog = { origin: { owner: 'stablyai', repo: 'korca' } }
    const repoNotInKorca = { owner: 'stablyai', repo: 'korca', url: null }

    expect(
      resolveMissingRepoProjectDialogState({
        slugIndexReady: false,
        slugDialog,
        repoNotInKorca,
        lookupSlug: () => ['repo-1']
      })
    ).toEqual({ slugDialog, repoNotInKorca })
  })

  it('clears slug fallback dialogs once the repo slug resolves', () => {
    const slugDialog = { origin: { owner: 'stablyai', repo: 'korca' } }
    const repoNotInKorca = { owner: 'other', repo: 'tool', url: null }
    const result = resolveMissingRepoProjectDialogState({
      slugIndexReady: true,
      slugDialog,
      repoNotInKorca,
      lookupSlug: (slug) => (slug === 'stablyai/korca' ? ['repo-1'] : [])
    })

    expect(result.slugDialog).toBeNull()
    expect(result.repoNotInKorca).toBe(repoNotInKorca)
  })

  it('clears repo-not-in-korca dialogs once the repo slug resolves', () => {
    const slugDialog = { origin: { owner: 'other', repo: 'tool' } }
    const repoNotInKorca = { owner: 'stablyai', repo: 'korca', url: null }
    const result = resolveMissingRepoProjectDialogState({
      slugIndexReady: true,
      slugDialog,
      repoNotInKorca,
      lookupSlug: (slug) => (slug === 'stablyai/korca' ? ['repo-1'] : [])
    })

    expect(result.slugDialog).toBe(slugDialog)
    expect(result.repoNotInKorca).toBeNull()
  })
})
