import type { TestInfo } from '@stablyai/playwright-test'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { test, expect } from './helpers/korca-app'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'
import {
  createBranchCommit,
  createStagedCommitMessageChange,
  openSourceControl,
  seedCleanBranchEmptyState,
  seedCommitMessageComposer,
  seedCreatePrComposer
} from './helpers/source-control-ai-generation'
import {
  installDelayedCommitMessageGenerator,
  installDelayedPrGenerator
} from './helpers/source-control-ai-generators'

function readLog(pathname: string): string {
  try {
    return readFileSync(pathname, 'utf8')
  } catch {
    return ''
  }
}

async function writeEvidence(
  testInfo: TestInfo,
  screenshotDir: string,
  filename: string,
  evidence: unknown
): Promise<void> {
  const evidencePath = path.join(screenshotDir, filename)
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  await testInfo.attach(filename, {
    path: evidencePath,
    contentType: 'application/json'
  })
}

test.describe('Source Control AI PR generation worktree switching', () => {
  test.describe.configure({ mode: 'serial' })

  test('keeps pending PR generation attached to its original worktree', async ({
    korcaPage
  }, testInfo) => {
    await waitForSessionReady(korcaPage)
    await waitForActiveWorktree(korcaPage)
    const { primaryWorktreeId, prWorktreeId, prWorktreePath, primaryBranch } =
      await seedCreatePrComposer(korcaPage)
    createBranchCommit(prWorktreePath)

    const screenshotDir = path.join(
      process.cwd(),
      'validation-screenshots',
      `pr-generation-switch-${Date.now()}`
    )
    mkdirSync(screenshotDir, { recursive: true })
    await testInfo.attach('validation-screenshot-dir', {
      body: screenshotDir,
      contentType: 'text/plain'
    })
    const generatorScriptPath = path.join(screenshotDir, 'delayed-pr-generator.cjs')
    const callLogPath = path.join(screenshotDir, 'delayed-pr-generator.log')
    await installDelayedPrGenerator(korcaPage, generatorScriptPath, callLogPath, primaryBranch)

    await openSourceControl(korcaPage, prWorktreeId)
    const generate = korcaPage.getByRole('button', {
      name: 'AI로 풀 리퀘스트 세부 정보 생성'
    })
    await expect(generate).toBeVisible({ timeout: 10_000 })
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(
      korcaPage.getByRole('button', { name: '풀 리퀘스트 세부 정보 생성 중지' })
    ).toBeVisible()
    await expect
      .poll(() => {
        return readLog(callLogPath)
      })
      .toContain('start')
    const pendingEvidence = await korcaPage.evaluate(() => {
      const state = window.__store?.getState()
      return {
        activeWorktreeId: state?.activeWorktreeId,
        rightSidebarTab: state?.rightSidebarTab
      }
    })
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '01-pr-generation-pending-on-a.png')
    })

    await openSourceControl(korcaPage, primaryWorktreeId)
    await expect(korcaPage.getByText('스위치 후 생성된 PR 제목')).toHaveCount(0)
    const switchedEvidence = await korcaPage.evaluate(() => {
      const state = window.__store?.getState()
      return {
        activeWorktreeId: state?.activeWorktreeId,
        visibleGeneratedTitle: document.body.textContent?.includes(
          '스위치 후 생성된 PR 제목'
        )
      }
    })
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '02-switched-to-b-no-generated-fields.png')
    })

    await expect
      .poll(() => readFileSync(callLogPath, 'utf8'), { timeout: 10_000 })
      .toContain('finish')
    await openSourceControl(korcaPage, prWorktreeId)
    await expect(korcaPage.getByRole('textbox', { name: '풀 리퀘스트 제목' })).toHaveValue(
      '스위치 후 생성된 PR 제목',
      { timeout: 10_000 }
    )
    await expect(korcaPage.getByRole('textbox', { name: '풀 리퀘스트 설명' })).toHaveValue(
      '스위치 후 생성된 PR 본문'
    )
    const finalEvidence = await korcaPage.evaluate(() => {
      const state = window.__store?.getState()
      return {
        activeWorktreeId: state?.activeWorktreeId,
        title: (document.querySelector('[aria-label="풀 리퀘스트 제목"]') as HTMLInputElement)
          ?.value,
        body: (
          document.querySelector('[aria-label="풀 리퀘스트 설명"]') as HTMLTextAreaElement
        )?.value
      }
    })
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '03-returned-to-a-generated-fields.png')
    })
    await writeEvidence(testInfo, screenshotDir, 'pr-generation-evidence.json', {
      expectedOriginalWorktreeId: prWorktreeId,
      expectedOtherWorktreeId: primaryWorktreeId,
      generatorLog: readLog(callLogPath),
      pending: pendingEvidence,
      switchedAway: switchedEvidence,
      returned: finalEvidence
    })
  })

  test('keeps pending commit message generation attached to its original worktree', async ({
    korcaPage
  }, testInfo) => {
    await waitForSessionReady(korcaPage)
    await waitForActiveWorktree(korcaPage)
    const { primaryWorktreeId, commitWorktreeId, commitWorktreePath } =
      await seedCommitMessageComposer(korcaPage)
    createStagedCommitMessageChange(commitWorktreePath)

    const screenshotDir = path.join(
      process.cwd(),
      'validation-screenshots',
      `commit-message-generation-switch-${Date.now()}`
    )
    mkdirSync(screenshotDir, { recursive: true })
    await testInfo.attach('validation-screenshot-dir', {
      body: screenshotDir,
      contentType: 'text/plain'
    })
    const generatorScriptPath = path.join(screenshotDir, 'delayed-commit-generator.cjs')
    const callLogPath = path.join(screenshotDir, 'delayed-commit-generator.log')
    await installDelayedCommitMessageGenerator(korcaPage, generatorScriptPath, callLogPath)

    await openSourceControl(korcaPage, commitWorktreeId)
    await expect(korcaPage.getByText('e2e-commit-message-generation.txt')).toBeVisible({
      timeout: 10_000
    })
    const generate = korcaPage.getByRole('button', {
      name: 'AI로 커밋 메시지 생성'
    })
    await expect(generate).toBeVisible({ timeout: 10_000 })
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(
      korcaPage.getByRole('button', { name: '커밋 메시지 생성 중지' })
    ).toBeVisible()
    await expect
      .poll(() => {
        return readLog(callLogPath)
      })
      .toContain('start')
    const pendingEvidence = await korcaPage.evaluate(() => {
      const state = window.__store?.getState()
      return {
        activeWorktreeId: state?.activeWorktreeId,
        commitMessage: (
          document.querySelector('[aria-label="커밋 메시지"]') as HTMLTextAreaElement
        )?.value
      }
    })
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '01-commit-message-generation-pending-on-a.png')
    })

    await openSourceControl(korcaPage, primaryWorktreeId)
    await expect(korcaPage.getByText('스위치 후 생성된 커밋 메시지')).toHaveCount(0)
    await expect(korcaPage.getByRole('button', { name: '커밋 메시지 생성 중지' })).toHaveCount(0)
    const switchedEvidence = await korcaPage.evaluate(() => {
      const state = window.__store?.getState()
      return {
        activeWorktreeId: state?.activeWorktreeId,
        visibleGeneratedMessage: document.body.textContent?.includes(
          '스위치 후 생성된 커밋 메시지'
        )
      }
    })
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '02-switched-to-b-no-generated-commit-message.png')
    })

    await expect
      .poll(() => readFileSync(callLogPath, 'utf8'), { timeout: 10_000 })
      .toContain('finish')
    await openSourceControl(korcaPage, commitWorktreeId)
    await expect(korcaPage.getByRole('textbox', { name: '커밋 메시지' })).toHaveValue(
      '스위치 후 생성된 커밋 메시지\n\n작업 공간을 전환한 뒤 staged e2e-commit-message-generation.txt에서 생성됨',
      { timeout: 10_000 }
    )
    const finalEvidence = await korcaPage.evaluate(() => {
      const state = window.__store?.getState()
      return {
        activeWorktreeId: state?.activeWorktreeId,
        commitMessage: (
          document.querySelector('[aria-label="커밋 메시지"]') as HTMLTextAreaElement
        )?.value
      }
    })
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '03-returned-to-a-generated-commit-message.png')
    })
    await writeEvidence(testInfo, screenshotDir, 'commit-message-generation-evidence.json', {
      expectedOriginalWorktreeId: commitWorktreeId,
      expectedOtherWorktreeId: primaryWorktreeId,
      generatorLog: readLog(callLogPath),
      pending: pendingEvidence,
      switchedAway: switchedEvidence,
      returned: finalEvidence
    })
  })

  test('hides the commit AI composer on a clean branch empty state', async ({
    korcaPage
  }, testInfo) => {
    await waitForSessionReady(korcaPage)
    await waitForActiveWorktree(korcaPage)
    const primaryWorktreeId = await seedCleanBranchEmptyState(korcaPage)

    const screenshotDir = path.join(
      process.cwd(),
      'validation-screenshots',
      `clean-empty-state-${Date.now()}`
    )
    mkdirSync(screenshotDir, { recursive: true })
    await testInfo.attach('validation-screenshot-dir', {
      body: screenshotDir,
      contentType: 'text/plain'
    })

    await openSourceControl(korcaPage, primaryWorktreeId)
    await expect
      .poll(
        async () => {
          // Why: this full-suite spec shares the physical E2E repo with other
          // workers. Keep this assertion scoped to the seeded Source Control
          // state instead of racing unrelated real git-status refreshes.
          await seedCleanBranchEmptyState(korcaPage, primaryWorktreeId)
          return korcaPage.evaluate(() => {
            const emptyStateVisible =
              document.body.textContent?.includes('이 브랜치에 변경 사항이 없습니다') === true
            const commitMessageInput = document.querySelector('[aria-label="커밋 메시지"]')
            const commitAiButton = document.querySelector(
              '[aria-label="AI로 커밋 메시지 생성"]'
            )
            return {
              emptyStateVisible,
              hasCommitMessageInput: commitMessageInput !== null,
              hasCommitAiButton: commitAiButton !== null
            }
          })
        },
        {
          timeout: 10_000,
          message: 'Clean branch empty state did not render without the commit AI composer'
        }
      )
      .toEqual({
        emptyStateVisible: true,
        hasCommitMessageInput: false,
        hasCommitAiButton: false
      })
    await expect(korcaPage.getByRole('textbox', { name: '커밋 메시지' })).toHaveCount(0)
    await expect(korcaPage.getByRole('button', { name: 'AI로 커밋 메시지 생성' })).toHaveCount(0)
    await expect(
      korcaPage.getByRole('button', { name: /커밋|푸시|가져오기|동기화|브랜치 게시/ }).first()
    ).toBeVisible()
    await korcaPage.screenshot({
      path: path.join(screenshotDir, '01-clean-branch-no-commit-ai-composer.png')
    })
  })
})
