import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const grandchildPath = path.join(__dirname, 'electron-vite-dev-grandchild.mjs')
const pidFile = process.env.KORCA_DEV_WRAPPER_TEST_PID_FILE
const envFile = process.env.KORCA_DEV_WRAPPER_TEST_ENV_FILE

const grandchild = spawn(process.execPath, [grandchildPath], {
  stdio: 'ignore'
})

if (!pidFile) {
  throw new Error('KORCA_DEV_WRAPPER_TEST_PID_FILE is required')
}

writeFileSync(pidFile, `${grandchild.pid ?? ''}\n`, 'utf8')
if (envFile) {
  writeFileSync(
    envFile,
    JSON.stringify(
      {
        args: process.argv.slice(2),
        label: process.env.KORCA_DEV_INSTANCE_LABEL ?? null,
        branch: process.env.KORCA_DEV_BRANCH ?? null,
        worktreeName: process.env.KORCA_DEV_WORKTREE_NAME ?? null,
        repoRoot: process.env.KORCA_DEV_REPO_ROOT ?? null,
        badgeLabel: process.env.KORCA_DEV_DOCK_BADGE_LABEL ?? null,
        dockTitle: process.env.KORCA_DEV_DOCK_TITLE ?? null,
        stableName: process.env.KORCA_DEV_STABLE_NAME ?? null,
        electronExecPath: process.env.ELECTRON_EXEC_PATH ?? null
      },
      null,
      2
    ),
    'utf8'
  )
}
setInterval(() => {}, 1000)
