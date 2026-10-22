// Appearances with no component playing them (`v-animate` on its own, a component's `initial`):
// those that mount together play in page order, up to a budget, and only where they're seen.
import { staggerAt, valuesAt } from './playable'
import type { TargetMotion } from './types'
import { appear } from './useComponentMotion'

// `when: 'visible'`: settles once the element scrolls into view, a little past the edge so it
// starts where it's seen (useInView's margin), once.
let viewer: IntersectionObserver | undefined
const waiting = new WeakMap<Element, () => void>()
function inView(el: Element): Promise<void> {
  if (typeof IntersectionObserver === 'undefined') return Promise.resolve()
  viewer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          viewer!.unobserve(entry.target)
          waiting.get(entry.target)?.()
          waiting.delete(entry.target)
        }
    },
    // Its own document's viewport: inside an iframe (Storybook, a test), not the top page's.
    { root: document, rootMargin: '0px 0px -10% 0px' },
  )
  return new Promise((resolve) => {
    waiting.set(el, resolve)
    viewer!.observe(el)
  })
}

/** Gone before it was seen: it's let go. */
export function unwatchView(el: Element) {
  viewer?.unobserve(el)
  waiting.delete(el)
}

// The most that appear together; past it, chaos, not choreography (18c).
const BUDGET = 24
export const seen = (box: DOMRect) =>
  box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth
const onScreen = (el: Element) => seen(el.getBoundingClientRect())
// Scrolling: rows a virtualized list recycles come and go; only real adds and removes animate.
let scrolledAt = -1e9
if (typeof window !== 'undefined')
  addEventListener('scroll', () => (scrolledAt = performance.now()), {
    capture: true,
    passive: true,
  })
export const scrolling = () => performance.now() - scrolledAt < 150

// No component around it: it plays its own appearance. Those that mount together under one name
// stagger in page order (`stagger`, `delay`).
const batch = new Map<string, { el: HTMLElement; value: TargetMotion }[]>()
function flush() {
  let played = 0
  for (const items of batch.values()) {
    items.sort((a, b) =>
      a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    let i = -1
    items.forEach(({ el, value }) => {
      const later = value.when === 'visible'
      // Many at once (a route of cards): those in view play, up to a budget; the rest just show.
      if (!later && (played >= BUDGET || scrolling() || !onScreen(el))) return
      played++
      i++
      const delay = ((value.delay ?? 0) + staggerAt(value.stagger, i, items.length)) * 1000
      const until = later ? inView(el) : undefined
      const initial = valuesAt(value.initial, { direction: 0, index: i })!
      void appear(el, initial, value, undefined, delay, false, until)
    })
  }
  batch.clear()
}

/** Plays `value.initial` on `el` with the others that mount in the same tick under `name`. */
export function queueAppearance(el: HTMLElement, name: string | undefined, value: TargetMotion) {
  if (!batch.size) queueMicrotask(flush)
  batch.set(name ?? '', [...(batch.get(name ?? '') ?? []), { el, value }])
}
