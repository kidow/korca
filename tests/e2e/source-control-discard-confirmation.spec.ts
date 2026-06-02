import { test, expect } from './helpers/korca-app'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'
import type { Page } from '@playwright/test'

type SeededUntrackedFile = {
  relativePath: string
  fileName: string
}

async function openSourceControl(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window.__store?.getState()
    state?.setRightSidebarOpen(true)
  })
  await page.getByRole('button', { name: /소스 컨트롤/ }).click()
  await expect(page.getByPlaceholder(/파일 필터/)).toBeVisible()
}

async function seedUntrackedFile(page: Page): Promise<SeededUntrackedFile> {
  return page.evaluate(async () => {
    const store = window.__store
    if (!store) {
      throw new Error('window.__store is not available')
    }

    const state = store.getState()
    const worktreeId = state.activeWorktreeId
    const worktree = Object.values(state.worktreesByRepo)
      .flat()
      .find((entry) => entry.id === worktreeId)
    if (!worktree) {
      throw new Error('active worktree not found')
    }

    const separator = worktree.path.includes('\\') ? '\\' : '/'
    const fileName = `korca-discard-confirm-${Date.now()}.txt`
    const relativePath = fileName
    await window.api.fs.writeFile({
      filePath: `${worktree.path}${separator}${relativePath}`,
      content: 'delete me\n'
    })

    const status = await window.api.git.status({ worktreePath: worktree.path })
    state.setGitStatus(worktree.id, status)
    const statusEntry = status.entries.find((entry) => entry.path.endsWith(fileName))
    if (!statusEntry) {
      throw new Error(`git status did not include ${fileName}`)
    }

    return {
      relativePath: statusEntry.path,
      fileName
    }
  })
}

async function refreshGitStatus(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const store = window.__store
    if (!store) {
      return
    }
    const state = store.getState()
    const worktreeId = state.activeWorktreeId
    const worktree = Object.values(state.worktreesByRepo)
      .flat()
      .find((entry) => entry.id === worktreeId)
    if (!worktree) {
      return
    }
    state.setGitStatus(worktree.id, await window.api.git.status({ worktreePath: worktree.path }))
  })
}

test.describe('Source Control discard confirmation', () => {
  test.beforeEach(async ({ korcaPage }) => {
    await waitForSessionReady(korcaPage)
    await waitForActiveWorktree(korcaPage)
  })

  test('cancel keeps an untracked file and confirm deletes it', async ({ korcaPage }) => {
    const seededFile = await seedUntrackedFile(korcaPage)
    await openSourceControl(korcaPage)

    const row = korcaPage
      .locator('[data-testid="source-control-entry"]')
      .filter({ hasText: seededFile.fileName })
    await expect(row).toBeVisible()

    await row.hover()
    await row.getByRole('button', { name: '미추적 파일 삭제' }).click()

    const dialog = korcaPage.getByRole('dialog', {
      name: `"${seededFile.fileName}"을 삭제하시겠습니까?`
    })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(seededFile.relativePath)

    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(dialog).toBeHidden()
    await expect(row).toBeVisible()

    await row.hover()
    await row.getByRole('button', { name: '미추적 파일 삭제' }).click()
    await korcaPage
      .getByRole('dialog', { name: `"${seededFile.fileName}"을 삭제하시겠습니까?` })
      .getByRole('button', { name: '삭제' })
      .click()

    await expect(row).toHaveCount(0, { timeout: 10_000 })

    await refreshGitStatus(korcaPage)
    await expect(
      korcaPage.locator('[data-testid="source-control-entry"]').filter({
        hasText: seededFile.fileName
      })
    ).toHaveCount(0)
  })
})
