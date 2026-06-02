import { beforeEach, describe, expect, it, vi } from 'vitest'

const { gitExecFileAsyncMock, getSshGitProviderMock } = vi.hoisted(() => ({
  gitExecFileAsyncMock: vi.fn(),
  getSshGitProviderMock: vi.fn()
}))

vi.mock('../git/runner', () => ({
  gitExecFileAsync: gitExecFileAsyncMock,
  ghExecFileAsync: vi.fn()
}))

vi.mock('../providers/ssh-git-dispatch', () => ({
  getSshGitProvider: getSshGitProviderMock
}))

import {
  _getOwnerRepoCacheSize,
  _resetOwnerRepoCache,
  classifyGhError,
  classifyListIssuesError,
  getIssueOwnerRepo,
  getOwnerRepo,
  getOwnerRepoForRemote,
  parseGitHubRemoteIdentity,
  parseGitHubOwnerRepo,
  resolvePRRepositoryCandidates,
  resolveIssueSource
} from './gh-utils'

describe('github owner/repo resolution', () => {
  beforeEach(() => {
    gitExecFileAsyncMock.mockReset()
    getSshGitProviderMock.mockReset()
    _resetOwnerRepoCache()
  })

  it('parses GitHub HTTPS and SSH remotes', () => {
    expect(parseGitHubOwnerRepo('https://github.com/acme/widgets.git')).toEqual({
      owner: 'acme',
      repo: 'widgets'
    })
    expect(parseGitHubOwnerRepo('https://alice@github.com/acme/widgets.git')).toEqual({
      owner: 'acme',
      repo: 'widgets'
    })
    expect(parseGitHubOwnerRepo('https://github.com:443/acme/widgets.git')).toEqual({
      owner: 'acme',
      repo: 'widgets'
    })
    expect(parseGitHubOwnerRepo('git@github.com:stablyai/korca.git')).toEqual({
      owner: 'stablyai',
      repo: 'korca'
    })
    expect(parseGitHubOwnerRepo('git@github.com:TheBoredTeam/boring.notch.git')).toEqual({
      owner: 'TheBoredTeam',
      repo: 'boring.notch'
    })
    expect(parseGitHubOwnerRepo('ssh://git@github.com/stablyai/korca.git')).toEqual({
      owner: 'stablyai',
      repo: 'korca'
    })
    expect(parseGitHubOwnerRepo('ssh://git@ssh.github.com:443/stablyai/korca.git')).toEqual({
      owner: 'stablyai',
      repo: 'korca'
    })
    expect(parseGitHubOwnerRepo('git@example.com:stablyai/korca.git')).toBeNull()
  })

  it('parses GitHub Enterprise host identity', () => {
    expect(parseGitHubRemoteIdentity('https://ghe.acme.internal/acme/korca.git')).toEqual({
      host: 'ghe.acme.internal',
      owner: 'acme',
      repo: 'korca'
    })
    expect(parseGitHubRemoteIdentity('git@ghe.acme.internal:acme/korca.git')).toEqual({
      host: 'ghe.acme.internal',
      owner: 'acme',
      repo: 'korca'
    })
    expect(parseGitHubOwnerRepo('https://ghe.acme.internal/acme/korca.git')).toBeNull()
  })

  it('keeps getOwnerRepo origin-based', async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:fork/korca.git\n'
    })

    await expect(getOwnerRepo('/repo')).resolves.toEqual({ owner: 'fork', repo: 'korca' })
    expect(gitExecFileAsyncMock).toHaveBeenCalledWith(['remote', 'get-url', 'origin'], {
      cwd: '/repo'
    })
  })

  it('resolves GitHub HTTPS origin remotes with user info and a default port', async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'https://alice@github.com:443/acme/widgets.git\n'
    })

    await expect(getOwnerRepo('/repo')).resolves.toEqual({ owner: 'acme', repo: 'widgets' })
    expect(gitExecFileAsyncMock).toHaveBeenCalledWith(['remote', 'get-url', 'origin'], {
      cwd: '/repo'
    })
  })

  it('prefers upstream for issue owner/repo resolution', async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:stablyai/korca.git\n'
    })

    await expect(getIssueOwnerRepo('/repo')).resolves.toEqual({ owner: 'stablyai', repo: 'korca' })
    expect(gitExecFileAsyncMock).toHaveBeenCalledWith(['remote', 'get-url', 'upstream'], {
      cwd: '/repo'
    })
  })

  it('falls back to origin when upstream is missing or non-GitHub', async () => {
    gitExecFileAsyncMock
      .mockResolvedValueOnce({ stdout: 'git@example.com:stablyai/korca.git\n' })
      .mockResolvedValueOnce({ stdout: 'git@github.com:fork/korca.git\n' })

    await expect(getIssueOwnerRepo('/repo')).resolves.toEqual({ owner: 'fork', repo: 'korca' })
    expect(gitExecFileAsyncMock).toHaveBeenNthCalledWith(1, ['remote', 'get-url', 'upstream'], {
      cwd: '/repo'
    })
    expect(gitExecFileAsyncMock).toHaveBeenNthCalledWith(2, ['remote', 'get-url', 'origin'], {
      cwd: '/repo'
    })
  })

  it('does not mix origin and upstream cache entries for the same repo path', async () => {
    gitExecFileAsyncMock
      .mockResolvedValueOnce({ stdout: 'git@github.com:fork/korca.git\n' })
      .mockResolvedValueOnce({ stdout: 'git@github.com:stablyai/korca.git\n' })

    await expect(getOwnerRepo('/repo')).resolves.toEqual({ owner: 'fork', repo: 'korca' })
    await expect(getIssueOwnerRepo('/repo')).resolves.toEqual({ owner: 'stablyai', repo: 'korca' })
  })

  it('resolves SSH repo remotes through the registered SSH git provider', async () => {
    const sshProvider = {
      exec: vi.fn().mockResolvedValue({ stdout: 'git@github.com:stablyai/korca.git\n', stderr: '' })
    }
    getSshGitProviderMock.mockReturnValue(sshProvider)

    await expect(getOwnerRepo('/home/user/korca', 'openclaw-2')).resolves.toEqual({
      owner: 'stablyai',
      repo: 'korca'
    })

    expect(gitExecFileAsyncMock).not.toHaveBeenCalled()
    expect(getSshGitProviderMock).toHaveBeenCalledWith('openclaw-2')
    expect(sshProvider.exec).toHaveBeenCalledWith(
      ['remote', 'get-url', 'origin'],
      '/home/user/korca'
    )
  })

  it('keeps local and SSH owner/repo cache entries separate for the same path', async () => {
    const sshProvider = {
      exec: vi.fn().mockResolvedValue({ stdout: 'git@github.com:remote/korca.git\n', stderr: '' })
    }
    gitExecFileAsyncMock.mockResolvedValueOnce({ stdout: 'git@github.com:local/korca.git\n' })
    getSshGitProviderMock.mockReturnValue(sshProvider)

    await expect(getOwnerRepo('/repo')).resolves.toEqual({ owner: 'local', repo: 'korca' })
    await expect(getOwnerRepo('/repo', 'ssh-1')).resolves.toEqual({ owner: 'remote', repo: 'korca' })
  })

  it('prunes expired distinct owner/repo cache entries on later lookups', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
    try {
      nowSpy.mockReturnValue(1_000)
      gitExecFileAsyncMock.mockResolvedValueOnce({
        stdout: 'git@github.com:stablyai/korca.git\n'
      })
      await expect(getOwnerRepo('/repo-a')).resolves.toEqual({ owner: 'stablyai', repo: 'korca' })
      expect(_getOwnerRepoCacheSize()).toBe(1)

      nowSpy.mockReturnValue(32_000)
      gitExecFileAsyncMock.mockResolvedValueOnce({
        stdout: 'git@github.com:acme/widgets.git\n'
      })
      await expect(getOwnerRepo('/repo-b')).resolves.toEqual({ owner: 'acme', repo: 'widgets' })

      expect(_getOwnerRepoCacheSize()).toBe(1)
      expect(gitExecFileAsyncMock).toHaveBeenCalledTimes(2)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('resolves PR candidates as upstream then origin and de-dupes matching slugs', async () => {
    gitExecFileAsyncMock
      .mockResolvedValueOnce({ stdout: 'git@github.com:Acme/Korca.git\n' })
      .mockResolvedValueOnce({ stdout: 'git@github.com:acme/korca.git\n' })

    await expect(resolvePRRepositoryCandidates('/repo')).resolves.toEqual({
      candidates: [{ owner: 'Acme', repo: 'Korca' }],
      headRepo: { owner: 'acme', repo: 'korca' }
    })
  })

  it('ignores non-GitHub upstream while keeping origin as the head repo', async () => {
    gitExecFileAsyncMock
      .mockResolvedValueOnce({ stdout: 'git@example.com:Acme/Korca.git\n' })
      .mockResolvedValueOnce({ stdout: 'git@github.com:fork/korca.git\n' })

    await expect(resolvePRRepositoryCandidates('/repo')).resolves.toEqual({
      candidates: [{ owner: 'fork', repo: 'korca' }],
      headRepo: { owner: 'fork', repo: 'korca' }
    })
  })

  it('expires cached remote owner/repo entries after the TTL', async () => {
    vi.useFakeTimers()
    try {
      gitExecFileAsyncMock
        .mockResolvedValueOnce({ stdout: 'git@github.com:old/korca.git\n' })
        .mockResolvedValueOnce({ stdout: 'git@github.com:new/korca.git\n' })

      await expect(getOwnerRepoForRemote('/repo', 'origin')).resolves.toEqual({
        owner: 'old',
        repo: 'korca'
      })
      await expect(getOwnerRepoForRemote('/repo', 'origin')).resolves.toEqual({
        owner: 'old',
        repo: 'korca'
      })
      expect(gitExecFileAsyncMock).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(30_001)

      await expect(getOwnerRepoForRemote('/repo', 'origin')).resolves.toEqual({
        owner: 'new',
        repo: 'korca'
      })
      expect(gitExecFileAsyncMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('resolveIssueSource', () => {
  beforeEach(() => {
    gitExecFileAsyncMock.mockReset()
    getSshGitProviderMock.mockReset()
    _resetOwnerRepoCache()
  })

  it("'auto' + upstream exists → upstream, fellBack=false", async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:stablyai/korca.git\n'
    })

    await expect(resolveIssueSource('/repo', 'auto')).resolves.toEqual({
      source: { owner: 'stablyai', repo: 'korca' },
      fellBack: false
    })
  })

  it("'auto' + no upstream → origin, fellBack=false", async () => {
    gitExecFileAsyncMock
      .mockResolvedValueOnce({ stdout: 'git@example.com:stablyai/korca.git\n' })
      .mockResolvedValueOnce({ stdout: 'git@github.com:solo/korca.git\n' })

    await expect(resolveIssueSource('/repo', 'auto')).resolves.toEqual({
      source: { owner: 'solo', repo: 'korca' },
      fellBack: false
    })
  })

  it("'upstream' + upstream exists → upstream, fellBack=false", async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:stablyai/korca.git\n'
    })

    await expect(resolveIssueSource('/repo', 'upstream')).resolves.toEqual({
      source: { owner: 'stablyai', repo: 'korca' },
      fellBack: false
    })
  })

  it("'upstream' + no upstream remote → origin, fellBack=true", async () => {
    // No upstream remote configured — the first call fails.
    gitExecFileAsyncMock
      .mockRejectedValueOnce(new Error('fatal: No such remote'))
      .mockResolvedValueOnce({ stdout: 'git@github.com:solo/korca.git\n' })

    await expect(resolveIssueSource('/repo', 'upstream')).resolves.toEqual({
      source: { owner: 'solo', repo: 'korca' },
      fellBack: true
    })
  })

  it("'origin' + upstream exists → origin (ignores upstream), fellBack=false", async () => {
    // Only one gh call should happen — origin. Upstream is never consulted.
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:fork/korca.git\n'
    })

    await expect(resolveIssueSource('/repo', 'origin')).resolves.toEqual({
      source: { owner: 'fork', repo: 'korca' },
      fellBack: false
    })
    expect(gitExecFileAsyncMock).toHaveBeenCalledTimes(1)
    expect(gitExecFileAsyncMock).toHaveBeenCalledWith(['remote', 'get-url', 'origin'], {
      cwd: '/repo'
    })
  })

  it("'origin' + no upstream → origin, fellBack=false", async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:solo/korca.git\n'
    })

    await expect(resolveIssueSource('/repo', 'origin')).resolves.toEqual({
      source: { owner: 'solo', repo: 'korca' },
      fellBack: false
    })
  })

  it('undefined preference is treated identically to auto', async () => {
    gitExecFileAsyncMock.mockResolvedValueOnce({
      stdout: 'git@github.com:stablyai/korca.git\n'
    })

    await expect(resolveIssueSource('/repo', undefined)).resolves.toEqual({
      source: { owner: 'stablyai', repo: 'korca' },
      fellBack: false
    })
  })
})

describe('gh error classification', () => {
  // Why: a fork with Issues turned off triggers `gh issue list` stderr
  // "the '<slug>' repository has disabled issues". Without a dedicated branch
  // the raw "Command failed: gh issue list …" line leaks into the Tasks banner
  // via the `unknown` fallback — which is what users see when they flip the
  // per-repo selector to an origin fork that has issues disabled.
  it('classifies "has disabled issues" stderr as issues_disabled', () => {
    const stderr =
      "Command failed: gh issue list --limit 36 --json number,title,state --repo brennanb2025/korca --state open\nthe 'brennanb2025/korca' repository has disabled issues"
    expect(classifyGhError(stderr)).toEqual({
      type: 'issues_disabled',
      message: 'Issues are disabled on this repository.'
    })
    expect(classifyListIssuesError(stderr)).toEqual({
      type: 'issues_disabled',
      message: 'Issues are disabled on this repository.'
    })
  })
})
