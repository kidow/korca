import type { Page } from '@stablyai/playwright-test'

export async function installRendererTitleLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as {
      __korcaE2eTitleLog?: string[]
      __korcaE2eTitleUnsubscribe?: () => void
    }
    const store = window.__store
    if (!store) {
      throw new Error('window.__store is not available')
    }

    w.__korcaE2eTitleUnsubscribe?.()
    w.__korcaE2eTitleLog = []

    const recordTitles = (): void => {
      const state = store.getState()
      const paneTitles = Object.values(state.runtimePaneTitlesByTabId ?? {}).flatMap((byPane) =>
        Object.values(byPane ?? {})
      )
      const tabTitles = Object.values(state.tabsByWorktree ?? {})
        .flat()
        .map((tab) => tab.title)

      for (const title of [...paneTitles, ...tabTitles]) {
        if (typeof title === 'string') {
          w.__korcaE2eTitleLog!.push(title)
        }
      }
    }

    // Why: shell prompts can immediately overwrite OSC titles. Logging every
    // renderer title state lets tests assert transient title frames landed.
    recordTitles()
    w.__korcaE2eTitleUnsubscribe = store.subscribe(recordTitles)
  })
}

export async function getRendererTitleLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __korcaE2eTitleLog?: string[] }
    return w.__korcaE2eTitleLog ?? []
  })
}
