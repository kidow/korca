const REACT_GRAB_SCRIPT_SRC = 'https://unpkg.com/react-grab/dist/index.global.js'

let reactGrabScriptLoadPromise: Promise<void> | null = null

declare global {
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions -- declaration merging requires interface
  interface Window {
    __REACT_GRAB__?: unknown
  }
}

export function loadReactGrabScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  const existing = window.__REACT_GRAB__ as unknown
  if (existing) {
    return Promise.resolve()
  }

  if (reactGrabScriptLoadPromise) {
    return reactGrabScriptLoadPromise
  }

  reactGrabScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const currentScript = document.querySelector<HTMLScriptElement>(
      `script[src="${REACT_GRAB_SCRIPT_SRC}"]`
    )

    if (currentScript) {
      currentScript.addEventListener('load', () => resolve(), { once: true })
      currentScript.addEventListener(
        'error',
        () => {
          reactGrabScriptLoadPromise = null
          reject(new Error('react-grab script 로드에 실패했습니다.'))
        },
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.src = REACT_GRAB_SCRIPT_SRC
    script.crossOrigin = 'anonymous'
    script.async = true
    script.addEventListener(
      'load',
      () => {
        resolve()
      },
      { once: true }
    )
    script.addEventListener(
      'error',
      () => {
        reactGrabScriptLoadPromise = null
        reject(new Error('react-grab script 로드에 실패했습니다.'))
      },
      { once: true }
    )
    document.head.appendChild(script)
  })

  return reactGrabScriptLoadPromise
}
