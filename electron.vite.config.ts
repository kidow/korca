import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Why: the telemetry transport is gated by two compile-time constants that
// only the official CI release workflow sets. Contributor / `pnpm dev` /
// third-party rebuilds must substitute literal `null` at these sites so
// `IS_OFFICIAL_BUILD` in `src/main/telemetry/client.ts` evaluates `false`
// at module load and the track() wrapper short-circuits to console-mirror.
// The substitution happens at compile time — there is no runtime env-var
// fallback — so a curious contributor cannot spoof transmission with a
// shell export.
//
// CI injects real values via GitHub Actions secrets
// (KORCA_BUILD_IDENTITY='stable' | 'rc', KORCA_POSTHOG_WRITE_KEY=phc_...);
// every other build path resolves these env vars to undefined, which the
// JSON.stringify below folds to the literal `null`. Ambient declarations
// for the two constants live in `src/types/build-constants.d.ts`.
const korcaBuildIdentity = process.env.KORCA_BUILD_IDENTITY
const KORCA_BUILD_IDENTITY_LITERAL =
  korcaBuildIdentity === 'stable' || korcaBuildIdentity === 'rc'
    ? JSON.stringify(korcaBuildIdentity)
    : 'null'
const korcaPostHogWriteKey = process.env.KORCA_POSTHOG_WRITE_KEY
const KORCA_POSTHOG_WRITE_KEY_LITERAL =
  typeof korcaPostHogWriteKey === 'string' && korcaPostHogWriteKey.length > 0
    ? JSON.stringify(korcaPostHogWriteKey)
    : 'null'
const korcaDiagnosticsTokenUrl = process.env.KORCA_DIAGNOSTICS_TOKEN_URL
const KORCA_DIAGNOSTICS_TOKEN_URL_LITERAL =
  typeof korcaDiagnosticsTokenUrl === 'string' && korcaDiagnosticsTokenUrl.length > 0
    ? JSON.stringify(korcaDiagnosticsTokenUrl)
    : 'null'

export default defineConfig({
  main: {
    build: {
      // Why: daemon-entry.js is asar-unpacked so child_process.fork() can
      // execute it from disk. Node's module resolution from the unpacked
      // directory cannot reach into app.asar, so pure-JS dependencies used
      // by the daemon must be bundled rather than externalized.
      externalizeDeps: {
        exclude: ['@xterm/headless', '@xterm/addon-serialize']
      },
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'daemon-entry': resolve('src/main/daemon/daemon-entry.ts'),
          'computer-sidecar': resolve('src/main/computer/sidecar-entry.ts'),
          'stt-worker': resolve('src/main/speech/stt-worker.ts'),
          // Why: electron-vite cleans out/main in dev. The dev CLI imports
          // this path for `korca agent hooks ...`, so it must survive rebuilds.
          'agent-hooks/managed-agent-hook-controls': resolve(
            'src/main/agent-hooks/managed-agent-hook-controls.ts'
          )
        }
      }
    },
    // Why: compile-time substitution for the telemetry gate. See the block
    // above for the full rationale.
    define: {
      KORCA_BUILD_IDENTITY: KORCA_BUILD_IDENTITY_LITERAL,
      KORCA_POSTHOG_WRITE_KEY: KORCA_POSTHOG_WRITE_KEY_LITERAL,
      KORCA_DIAGNOSTICS_TOKEN_URL: KORCA_DIAGNOSTICS_TOKEN_URL_LITERAL
    },
    // Why: @xterm/headless declares "exports": null in package.json, which
    // prevents Vite's default resolver from finding the CJS entry. Point
    // directly at the published main file so the bundler can inline it.
    resolve: {
      alias: {
        '@xterm/headless': resolve('node_modules/@xterm/headless/lib-headless/xterm-headless.js'),
        '@xterm/addon-serialize': resolve(
          'node_modules/@xterm/addon-serialize/lib/addon-serialize.js'
        )
      }
    }
  },
  preload: {
    build: {
      externalizeDeps: {
        exclude: ['@electron-toolkit/preload']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    worker: {
      format: 'es'
    }
  }
})
