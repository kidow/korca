import { test, expect } from './helpers/korca-app'
import {
  execInTerminal,
  getTerminalContent,
  waitForActivePanePtyId,
  waitForActiveTerminalManager
} from './helpers/terminal'
import { ensureTerminalVisible, waitForActiveWorktree, waitForSessionReady } from './helpers/store'

type CodexHomeProbe = {
  codexHome: string | null
  korcaCodexHome: string | null
}

function readCodexHomeProbe(pageContent: string, marker: string): CodexHomeProbe | null {
  const match = new RegExp(`${marker}:(\\{[^\\r\\n]+\\})`).exec(pageContent)
  if (!match) {
    return null
  }
  return JSON.parse(match[1] ?? 'null') as CodexHomeProbe | null
}

test.describe('Terminal Codex runtime home', () => {
  test.beforeEach(async ({ korcaPage }) => {
    await waitForSessionReady(korcaPage)
    await waitForActiveWorktree(korcaPage)
    await ensureTerminalVisible(korcaPage)
  })

  test('terminal process receives the Korca-managed Codex home', async ({ korcaPage }) => {
    await waitForActiveTerminalManager(korcaPage)
    const ptyId = await waitForActivePanePtyId(korcaPage)
    const marker = `__KORCA_CODEX_HOME_E2E_${Date.now()}__`
    const command = [
      'node -e',
      `"console.log('${marker}:' + JSON.stringify({codexHome: process.env.CODEX_HOME || null, korcaCodexHome: process.env.KORCA_CODEX_HOME || null}))"`
    ].join(' ')

    await execInTerminal(korcaPage, ptyId, command)

    let probe: CodexHomeProbe | null = null
    await expect
      .poll(
        async () => {
          probe = readCodexHomeProbe(await getTerminalContent(korcaPage), marker)
          return Boolean(
            probe?.codexHome &&
            probe.korcaCodexHome &&
            probe.codexHome === probe.korcaCodexHome &&
            /[\\/]codex-runtime-home[\\/]home$/.test(probe.codexHome)
          )
        },
        { timeout: 15_000, message: 'Terminal did not expose Korca-managed Codex home env' }
      )
      .toBe(true)

    expect(probe?.codexHome).toBe(probe?.korcaCodexHome)
  })
})
