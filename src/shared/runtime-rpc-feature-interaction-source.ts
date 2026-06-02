export const KORCA_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY = '__korcaFeatureInteractionSource'

export const KORCA_RUNTIME_RPC_BROWSER_UI_SOURCE = 'browser-pane-ui'

export function withBrowserPaneUiRuntimeRpcSource(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      [KORCA_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY]: KORCA_RUNTIME_RPC_BROWSER_UI_SOURCE
    }
  }
  return {
    ...value,
    [KORCA_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY]: KORCA_RUNTIME_RPC_BROWSER_UI_SOURCE
  }
}

export function isBrowserPaneUiRuntimeRpcParams(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>)[KORCA_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY] ===
      KORCA_RUNTIME_RPC_BROWSER_UI_SOURCE
  )
}
