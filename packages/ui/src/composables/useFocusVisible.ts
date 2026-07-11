// Track input modality for :focus-visible emulation.
let modality: 'keyboard' | 'pointer' = 'keyboard'
let wired = false

function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  window.addEventListener(
    'keydown',
    () => {
      modality = 'keyboard'
    },
    { capture: true },
  )
  window.addEventListener(
    'pointerdown',
    () => {
      modality = 'pointer'
    },
    { capture: true },
  )
}

// Eager wire so first read happens after pointerdown that caused focus.
wire()

/** Call inside a focus handler: was this focus produced by keyboard travel? */
export function focusIsFromKeyboard(): boolean {
  wire()
  return modality === 'keyboard'
}
