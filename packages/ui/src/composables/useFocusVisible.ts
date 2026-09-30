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

// For controls that focus themselves on pointerdown: Chrome matches native
// :focus-visible there, so they style [data-focus-visible] instead.

/** Focus handler: ring only for keyboard focus. */
export function markFocusVisible(event: FocusEvent): void {
  ;(event.currentTarget as HTMLElement | null)?.toggleAttribute(
    'data-focus-visible',
    focusIsFromKeyboard(),
  )
}

/** Blur handler. */
export function clearFocusVisible(event: FocusEvent): void {
  ;(event.currentTarget as HTMLElement | null)?.removeAttribute('data-focus-visible')
}

/** Keydown handler: keyboard use after a click shows the ring. */
export function showFocusVisible(event: KeyboardEvent): void {
  ;(event.currentTarget as HTMLElement | null)?.setAttribute('data-focus-visible', '')
}
