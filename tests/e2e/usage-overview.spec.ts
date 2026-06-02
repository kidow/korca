import { test, expect } from './helpers/korca-app'
import { getStoreState, waitForSessionReady } from './helpers/store'

test.describe('usage overview', () => {
  test.beforeEach(async ({ korcaPage }) => {
    await waitForSessionReady(korcaPage)
  })

  test('Stats & Usage opens on the combined overview with provider controls', async ({
    korcaPage
  }) => {
    await korcaPage.evaluate(() => {
      const state = window.__store!.getState()
      state.openSettingsPage()
    })

    await expect
      .poll(async () => getStoreState<string>(korcaPage, 'activeView'), { timeout: 5_000 })
      .toBe('settings')
    await korcaPage.getByRole('button', { name: 'Stats & Usage' }).click()
    await expect(korcaPage.getByRole('heading', { name: 'Usage Analytics' })).toBeVisible()
    const providerDropdown = korcaPage.getByTestId('usage-provider-select')
    await expect(providerDropdown).toHaveAttribute(
      'aria-label',
      'Usage analytics provider: Overview'
    )
    await expect(korcaPage.getByTestId('usage-overview-pane')).toBeVisible()
    await expect(korcaPage.getByRole('heading', { name: 'Usage Overview' })).toBeVisible()
    await expect(korcaPage.getByRole('heading', { name: 'Providers' })).toBeVisible()
    await expect(korcaPage.getByRole('button', { name: 'Enable Claude' })).toBeVisible()
    await expect(korcaPage.getByRole('button', { name: 'Enable Codex' })).toBeVisible()
    await expect(korcaPage.getByRole('button', { name: 'Enable OpenCode' })).toBeVisible()

    await providerDropdown.click()
    await korcaPage.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    await expect(korcaPage.getByRole('heading', { name: 'Codex Usage Tracking' })).toBeVisible()
    await expect(providerDropdown).toHaveAttribute('aria-label', 'Usage analytics provider: Codex')

    await providerDropdown.click()
    await korcaPage.getByRole('menuitem', { name: 'OpenCode', exact: true }).click()
    await expect(korcaPage.getByRole('heading', { name: 'OpenCode Usage Tracking' })).toBeVisible()
    await expect(providerDropdown).toHaveAttribute(
      'aria-label',
      'Usage analytics provider: OpenCode'
    )
  })
})
