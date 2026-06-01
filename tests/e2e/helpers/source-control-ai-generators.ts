import type { Page } from '@stablyai/playwright-test'
import { writeFileSync } from 'fs'

async function setCustomGenerator(page: Page, scriptPath: string): Promise<void> {
  await page.evaluate(async (scriptPath) => {
    const store =
      window.__store ??
      (() => {
        throw new Error('window.__store is not available')
      })()
    const currentSettings = store.getState().settings
    if (!currentSettings) {
      throw new Error('Settings were not loaded')
    }
    await store.getState().updateSettings({
      activeRuntimeEnvironmentId: null,
      commitMessageAi: {
        ...currentSettings.commitMessageAi,
        enabled: true,
        agentId: 'custom' as const,
        selectedModelByAgent: {},
        selectedThinkingByModel: {},
        customPrompt: '',
        customAgentCommand: `node ${JSON.stringify(scriptPath)}`
      }
    })
  }, scriptPath)
}

export async function installDelayedPrGenerator(
  page: Page,
  generatorScriptPath: string,
  callLogPath: string,
  base: string
): Promise<void> {
  writeFileSync(
    generatorScriptPath,
    [
      "const fs = require('fs')",
      `fs.appendFileSync(${JSON.stringify(callLogPath)}, 'start\\n')`,
      'setTimeout(() => {',
      '  console.log(JSON.stringify({',
      `    base: ${JSON.stringify(base)},`,
      "    title: '스위치 후 생성된 PR 제목',",
      "    body: '스위치 후 생성된 PR 본문',",
      '    draft: false',
      '  }))',
      `  fs.appendFileSync(${JSON.stringify(callLogPath)}, 'finish\\n')`,
      '}, 1500)'
    ].join('\n')
  )
  await setCustomGenerator(page, generatorScriptPath)
}

export async function installDelayedCommitMessageGenerator(
  page: Page,
  generatorScriptPath: string,
  callLogPath: string
): Promise<void> {
  writeFileSync(
    generatorScriptPath,
    [
      "const fs = require('fs')",
      `fs.appendFileSync(${JSON.stringify(callLogPath)}, 'start\\n')`,
      'setTimeout(() => {',
      "  console.log('스위치 후 생성된 커밋 메시지')",
      "  console.log('')",
      "  console.log('작업 공간을 전환한 뒤 staged e2e-commit-message-generation.txt에서 생성됨')",
      `  fs.appendFileSync(${JSON.stringify(callLogPath)}, 'finish\\n')`,
      '}, 1500)'
    ].join('\n')
  )
  await setCustomGenerator(page, generatorScriptPath)
}
