import { describe, expect, it } from 'vitest'
import { addKorcaWslInteropEnv } from './wsl-korca-env'

describe('addKorcaWslInteropEnv', () => {
  it('marks the Korca terminal handle for Windows to WSL env import', () => {
    const env: Record<string, string> = { KORCA_TERMINAL_HANDLE: 'term_wsl' }

    addKorcaWslInteropEnv(env)

    expect(env.WSLENV).toBe('KORCA_TERMINAL_HANDLE/u')
  })

  it('preserves existing WSLENV entries and does not duplicate the handle entry', () => {
    const env: Record<string, string> = {
      WSLENV: 'FOO/u:KORCA_TERMINAL_HANDLE/u:BAR/p'
    }

    addKorcaWslInteropEnv(env)

    expect(env.WSLENV).toBe('FOO/u:KORCA_TERMINAL_HANDLE/u:BAR/p')
  })
})
