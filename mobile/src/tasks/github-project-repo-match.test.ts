import { describe, expect, it } from 'vitest'
import {
  filterGitHubProjectRowsForRepos,
  findRepoForGitHubProjectRepository,
  normalizeGitHubRepositorySlug
} from './github-project-repo-match'

const repos = [
  { id: 'repo-1', path: '/Users/me/korca', displayName: 'korca' },
  { id: 'repo-2', path: '/Users/me/other', displayName: 'other' }
]

describe('GitHub project repo matching', () => {
  it('normalizes owner/repo slugs case-insensitively', () => {
    expect(normalizeGitHubRepositorySlug(' StablyAI/Korca ')).toBe('stablyai/korca')
    expect(normalizeGitHubRepositorySlug('korca')).toBeNull()
    expect(normalizeGitHubRepositorySlug('stablyai/korca/extra')).toBeNull()
  })

  it('matches project rows by resolved repo slug before path/display heuristics', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/korca', repos, {
        'repo-1': { path: '/Users/me/korca', slug: 'stablyai/korca' }
      })
    ).toBe(repos[0])
  })

  it('does not pick a repo when resolved slugs are ambiguous', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/korca', repos, {
        'repo-1': { path: '/Users/me/korca', slug: 'stablyai/korca' },
        'repo-2': { path: '/Users/me/other', slug: 'stablyai/korca' }
      })
    ).toBeNull()
  })

  it('falls back to exact display/path slug matching when slug resolution is unavailable', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/korca', [
        { id: 'repo-1', path: '/Users/me/stablyai/korca', displayName: 'korca' }
      ])
    ).toEqual({ id: 'repo-1', path: '/Users/me/stablyai/korca', displayName: 'korca' })
  })

  it('normalizes Windows paths before path slug fallback matching', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/korca', [
        { id: 'repo-1', path: 'C:\\Users\\me\\stablyai\\korca', displayName: 'korca' }
      ])
    ).toEqual({ id: 'repo-1', path: 'C:\\Users\\me\\stablyai\\korca', displayName: 'korca' })
  })

  it('does not path-match a repo whose resolved slug points somewhere else', () => {
    expect(
      findRepoForGitHubProjectRepository(
        'stablyai/korca',
        [{ id: 'repo-1', path: '/Users/me/stablyai/korca', displayName: 'korca' }],
        {
          'repo-1': { path: '/Users/me/stablyai/korca', slug: 'fork/korca' }
        }
      )
    ).toBeNull()
  })

  it('filters project rows to rows backed by open repositories', () => {
    const rows = [
      { id: 'row-1', content: { repository: 'stablyai/korca' } },
      { id: 'row-2', content: { repository: 'other/missing' } },
      { id: 'row-3', content: { repository: null } }
    ]

    expect(
      filterGitHubProjectRowsForRepos(rows, repos, {
        'repo-1': { path: '/Users/me/korca', slug: 'stablyai/korca' }
      }).map((row) => row.id)
    ).toEqual(['row-1'])
  })
})
