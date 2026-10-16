/**
 * Stops iOS zooming the page when a form field under 16px gets focus, so fields can stay the
 * same size as the rest of your text. It adds `maximum-scale=1` to the viewport, on iOS only:
 * pinch-to-zoom still works there, and other platforms (which never focus-zoom) are untouched.
 * Call it once on the client, e.g. in `main.ts`. Returns `false` where there's nothing to do.
 */
export function preventFocusZoom(): boolean {
  if (typeof document === 'undefined') return false
  if (!isIOS()) return false

  let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!viewport) {
    viewport = document.createElement('meta')
    viewport.name = 'viewport'
    viewport.content = 'width=device-width, initial-scale=1'
    document.head.append(viewport)
  }
  const parts = viewport.content
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith('maximum-scale'))
  viewport.content = [...parts, 'maximum-scale=1'].join(', ')
  return true
}

// iOS and iPadOS, every browser there included (they're all WebKit). iPadOS reports itself as a
// Mac, so a touch screen on "MacIntel" is an iPad.
function isIOS(): boolean {
  if (typeof CSS !== 'undefined' && CSS.supports('-webkit-touch-callout', 'none')) return true
  if (typeof navigator === 'undefined') return false
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
