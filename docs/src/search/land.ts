// Brings an API row into view after the palette navigates to it, and keeps it there while the
// page settles: demos above it load after the first scroll and push it down. Lets go the moment
// the reader scrolls, touches or types, and marks the row so it flashes like a clicked anchor.
const SETTLE_MS = 2000
const HEADER_OFFSET = 88

/** `fallbackId` is used when `id` isn't on the page, such as an example shown without a title. */
export function landOn(id: string, fallbackId?: string): void {
  if (typeof window === 'undefined') return
  const start = performance.now()
  let done = false
  const stop = () => {
    done = true
    for (const type of ['wheel', 'touchstart', 'keydown'] as const) {
      window.removeEventListener(type, stop)
    }
  }
  for (const type of ['wheel', 'touchstart', 'keydown'] as const) {
    window.addEventListener(type, stop, { passive: true })
  }
  let marked = false
  const tick = () => {
    if (done) return
    if (performance.now() - start > SETTLE_MS) return stop()
    const row =
      document.getElementById(id) ??
      (fallbackId && performance.now() - start > 300 ? document.getElementById(fallbackId) : null)
    if (row) {
      const drift = row.getBoundingClientRect().top - HEADER_OFFSET
      if (Math.abs(drift) > 2) window.scrollBy(0, drift)
      if (!marked) {
        marked = true
        row.setAttribute('data-landed', '')
        setTimeout(() => row.removeAttribute('data-landed'), 1800)
      }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
