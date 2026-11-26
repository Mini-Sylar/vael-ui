// Page code loads before the click, so navigating doesn't wait on the network: the pages behind
// the links on screen once the browser is idle, and any page as its link is hovered, focused or
// pressed. Data saver keeps only the last.
import type { Router } from 'vue-router'

type Loader = () => Promise<unknown>

/**
 * Call once the app has mounted: the links it looks at are the app's, not the prerendered page's.
 * Returns the scan to run again as each new page has entered.
 */
export function prefetchPages(router: Router) {
  const loaded = new Set<Loader>()
  // A page's lazy component: the route's loader, called once (many links share one page).
  const load = (href: string | null) => {
    if (!href?.startsWith('/') || href.startsWith('//')) return
    for (const record of router.resolve(href).matched)
      for (const view of Object.values(record.components ?? {}))
        if (typeof view === 'function' && !loaded.has(view as Loader)) {
          loaded.add(view as Loader)
          ;(view as Loader)().catch(() => loaded.delete(view as Loader))
        }
  }
  const linkOf = (target: EventTarget | null) =>
    target instanceof Element ? (target.closest('a[href]')?.getAttribute('href') ?? null) : null
  for (const type of ['pointerover', 'focusin', 'pointerdown'] as const)
    document.addEventListener(type, (event) => load(linkOf(event.target)), { passive: true })

  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData
  if (saveData || typeof IntersectionObserver === 'undefined') return () => {}
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      seen.unobserve(entry.target)
      load(entry.target.getAttribute('href'))
    }
  })
  const idle = (work: () => void) =>
    'requestIdleCallback' in window
      ? requestIdleCallback(work, { timeout: 2000 })
      : setTimeout(work, 300)
  // Once a page has shown, its links are looked at when the browser has nothing else to do.
  const scan = () =>
    idle(() => {
      seen.disconnect()
      for (const link of document.querySelectorAll('a[href^="/"]')) seen.observe(link)
    })
  scan()
  return scan
}
