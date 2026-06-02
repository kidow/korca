import { describe, expect, it } from 'vitest'
import {
  canCleanupUnregisteredKorcaWorktreeDirectory,
  isWorktreePathMissing,
  stripKorcaProvenanceMetaUpdates
} from './worktree-removal-safety'

describe('isWorktreePathMissing', () => {
  it('recognizes missing-path errors from local and remote stat providers', async () => {
    await expect(
      isWorktreePathMissing('/missing', async () => {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      })
    ).resolves.toBe(true)

    await expect(
      isWorktreePathMissing('/missing', () => Promise.reject({ code: 'ENOTDIR' }))
    ).resolves.toBe(true)
  })

  it('does not classify existing paths or unrelated stat failures as missing', async () => {
    await expect(isWorktreePathMissing('/exists', async () => ({}))).resolves.toBe(false)

    await expect(
      isWorktreePathMissing('/unknown', async () => {
        throw new Error('permission denied')
      })
    ).resolves.toBe(false)
  })
})

describe('canCleanupUnregisteredKorcaWorktreeDirectory', () => {
  it('does not treat korcaCreatedAt alone as cleanup authority', () => {
    expect(
      canCleanupUnregisteredKorcaWorktreeDirectory({
        meta: { korcaCreatedAt: Date.now() },
        worktreePath: '/outside/orphan',
        repo: { path: '/repo' },
        knownKorcaLayouts: []
      })
    ).toBe(false)
    expect(
      canCleanupUnregisteredKorcaWorktreeDirectory({
        meta: {
          korcaCreatedAt: Date.now(),
          korcaCreationSource: 'runtime'
        },
        worktreePath: '/outside/orphan',
        repo: { path: '/repo' },
        knownKorcaLayouts: []
      })
    ).toBe(true)
  })

  it('accepts legacy Korca-created metadata before explicit provenance existed', () => {
    expect(
      canCleanupUnregisteredKorcaWorktreeDirectory({
        meta: { createdAt: Date.now() },
        worktreePath: '/outside/orphan',
        repo: { path: '/repo' },
        knownKorcaLayouts: []
      })
    ).toBe(true)
  })

  it('accepts legacy repo-nested Korca workspace paths without metadata provenance', () => {
    expect(
      canCleanupUnregisteredKorcaWorktreeDirectory({
        meta: undefined,
        worktreePath: '/korca/workspaces/app/legacy-orphan',
        repo: { path: '/repos/app' },
        knownKorcaLayouts: [{ path: '/korca/workspaces', nestWorkspaces: true }]
      })
    ).toBe(true)
  })

  it('does not trust flat workspace-root paths without legacy metadata', () => {
    expect(
      canCleanupUnregisteredKorcaWorktreeDirectory({
        meta: undefined,
        worktreePath: '/korca/workspaces/legacy-orphan',
        repo: { path: '/repos/app' },
        knownKorcaLayouts: [{ path: '/korca/workspaces', nestWorkspaces: false }]
      })
    ).toBe(false)
  })
})

describe('stripKorcaProvenanceMetaUpdates', () => {
  it('removes Korca-owned provenance fields from user metadata updates', () => {
    expect(
      stripKorcaProvenanceMetaUpdates({
        comment: 'keep me',
        korcaCreatedAt: 123,
        korcaCreationSource: 'desktop',
        korcaCreationWorkspaceLayout: { path: '/workspace', nestWorkspaces: false }
      })
    ).toEqual({ comment: 'keep me' })
  })
})
