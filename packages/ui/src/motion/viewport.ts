// In view, by your `viewport`: how much of it must show, the margin around the viewport, and once.
import type { Viewport } from './types'

/** Calls `seen` with whether `el` is in view, each time that changes; returns the stop. */
export function watchViewport(
  el: Element,
  viewport: Viewport | undefined,
  margin: string,
  seen: (inView: boolean) => void,
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    seen(true)
    return () => {}
  }
  const amount = viewport?.amount
  const threshold = amount === 'all' ? 1 : typeof amount === 'number' ? amount : 0
  const observer = new IntersectionObserver(
    ([entry]) => {
      const inView = !!entry?.isIntersecting && entry.intersectionRatio >= threshold * 0.99
      seen(inView)
      if (inView && viewport?.once) observer.disconnect()
    },
    // Its own document's viewport: inside an iframe (Storybook, a test), not the top page's.
    { root: document, rootMargin: viewport?.margin ?? margin, threshold },
  )
  observer.observe(el)
  return () => observer.disconnect()
}
