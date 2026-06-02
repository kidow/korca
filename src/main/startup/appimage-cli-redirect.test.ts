import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { getAppImageCliArgs, maybeRedirectAppImageCliLaunch } from './appimage-cli-redirect'

const commandNames = ['status', 'terminal']

describe('AppImage CLI redirect', () => {
  it('detects direct AppImage CLI commands', () => {
    expect(
      getAppImageCliArgs(
        ['korca-linux.AppImage', 'status', '--json'],
        { APPIMAGE: '/opt/korca' },
        {
          platform: 'linux',
          isPackaged: true,
          commandNames
        }
      )
    ).toEqual(['status', '--json'])
  })

  it('allows CLI global flags before the command', () => {
    expect(
      getAppImageCliArgs(
        ['korca-linux.AppImage', '--pairing-code', 'abc123', '--json', 'terminal', 'list'],
        {
          APPIMAGE: '/opt/korca'
        },
        {
          platform: 'linux',
          isPackaged: true,
          commandNames
        }
      )
    ).toEqual(['--pairing-code', 'abc123', '--json', 'terminal', 'list'])
  })

  it('does not redirect normal desktop AppImage launches', () => {
    expect(
      getAppImageCliArgs(
        ['AppRun', '--no-sandbox', 'file:///tmp/example.txt'],
        {
          APPIMAGE: '/opt/korca'
        },
        {
          platform: 'linux',
          isPackaged: true,
          commandNames
        }
      )
    ).toBeNull()
  })

  it('spawns the unpacked CLI entrypoint with Electron node mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'korca-appimage-cli-redirect-'))
    const cliEntryPath = join(root, 'app.asar.unpacked', 'out', 'cli', 'index.js')
    await mkdir(join(root, 'app.asar.unpacked', 'out', 'cli'), { recursive: true })
    await writeFile(cliEntryPath, '', 'utf8')
    const spawn = vi.fn((..._args: unknown[]) => ({ status: 0 }))

    const result = maybeRedirectAppImageCliLaunch({
      argv: ['korca-linux.AppImage', 'status', '--json'],
      env: {
        APPIMAGE: '/opt/korca/korca-linux.AppImage',
        NODE_OPTIONS: '--inspect',
        NODE_REPL_EXTERNAL_MODULE: '/tmp/repl.js'
      },
      platform: 'linux',
      isPackaged: true,
      resourcesPath: root,
      execPath: '/opt/korca/korca-ide',
      commandNames,
      spawn: spawn as never
    })

    expect(result).toEqual({ redirected: true, status: 0 })
    expect(spawn).toHaveBeenCalledWith('/opt/korca/korca-ide', [cliEntryPath, 'status', '--json'], {
      env: expect.objectContaining({
        APPIMAGE: '/opt/korca/korca-linux.AppImage',
        ELECTRON_RUN_AS_NODE: '1',
        KORCA_NODE_OPTIONS: '--inspect',
        KORCA_NODE_REPL_EXTERNAL_MODULE: '/tmp/repl.js'
      }),
      stdio: 'inherit'
    })
    const spawnOptions = spawn.mock.calls[0]?.[2] as { env: NodeJS.ProcessEnv } | undefined
    expect(spawnOptions?.env).not.toHaveProperty('NODE_OPTIONS')
    expect(spawnOptions?.env).not.toHaveProperty('NODE_REPL_EXTERNAL_MODULE')
  })
})
