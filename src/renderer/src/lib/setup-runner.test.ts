import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildSetupRunnerCommand } from './setup-runner'

describe('buildSetupRunnerCommand', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses bash with a Linux path for WSL UNC runner scripts on Windows', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    })

    expect(
      buildSetupRunnerCommand(
        '\\\\wsl.localhost\\Ubuntu\\home\\jin\\repo\\.git\\worktrees\\feature\\korca\\setup-runner.sh'
      )
    ).toBe('bash /home/jin/repo/.git/worktrees/feature/korca/setup-runner.sh')
  })

  it('uses cmd.exe for native Windows runner scripts', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    })

    expect(buildSetupRunnerCommand('C:\\repo\\.git\\korca\\setup-runner.cmd')).toBe(
      'cmd.exe /c "C:\\repo\\.git\\korca\\setup-runner.cmd"'
    )
  })

  it('uses bash for POSIX runner paths on Windows clients', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    })

    expect(buildSetupRunnerCommand('/home/dev/repo/.git/korca/setup-runner.sh')).toBe(
      'bash /home/dev/repo/.git/korca/setup-runner.sh'
    )
  })
})
