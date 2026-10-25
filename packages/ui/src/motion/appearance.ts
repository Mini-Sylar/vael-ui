// Appearances with no component playing them (`v-animate` on its own, a component's `initial`):
// those that mount together play in page order, up to a budget, and only where they're seen.
import { motionSpringAt } from './styleHolder'
import { staggerAt, valuesAt } from './playable'
import type { MotionTiming, MotionValues, TargetMotion } from './types'
import { appear } from './useComponentMotion'
import { armEnter, entered } from './finish'
import { loading } from './styleKey'

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
const batch = new Map<string, { el: HTMLElement; value: TargetMotion; again: boolean }[]>()
const byPage = (a: { el: Element }, b: { el: Element }) =>
  a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

function flush() {
  // `after`, `steps` or your own `enter` in this batch: it plays as one timeline, names waiting
  // on names, from the runtime that runs hooks.
  const timeline = [...batch.values()].some((items) =>
    items.some(
      ({ value, again }) => (!again && (value.after !== undefined || value.steps)) || value.enter,
    ),
  )
  if (timeline) {
    const groups = [...batch.entries()]
    batch.clear()
    void playTimeline(groups)
    return
  }
  let played = 0
  for (const items of batch.values()) {
    items.sort(byPage)
    let i = -1
    items.forEach(({ el, value, again }) => {
      const later = value.when === 'visible'
      // Timed by you (a wave across a grid): yours, however many; otherwise a budget.
      const timed = value.delay !== undefined || value.stagger !== undefined
      // Many at once (a route of cards): those in view play, up to a budget; the rest just show.
      // Scrolling recycles rows; a replay is yours, on screen, and always plays.
      if (!later && ((!timed && played >= BUDGET) || (!again && scrolling()) || !onScreen(el)))
        return entered(el)
      const initial = valuesAt(value.initial, { direction: 0, index: i + 1, count: items.length })
      // Nothing to come in from: it neither plays nor counts.
      if (!initial || !Object.keys(initial).length) return entered(el)
      played++
      i++
      const delay = ((value.delay ?? 0) + staggerAt(value.stagger, i, items.length, el)) * 1000
      const until = later ? inView(el) : undefined
      // Played, or nothing to play: its `onFinish` runs either way.
      void appear(el, initial, value, motionSpringAt(el), delay, again, until).finally(() =>
        entered(el),
      )
    })
  }
  batch.clear()
}

/**
 * The elements that mounted together, as one timeline: each name a target, an unnamed element its
 * own, `after` and `steps` honoured. Hidden at their start until the runtime that plays it arrives.
 */
async function playTimeline(groups: [string, { el: HTMLElement; value: TargetMotion }[]][]) {
  const all = groups.flatMap(([, items]) => items)
  const hidden = all.map(({ el }) =>
    el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' }),
  )
  const { runTargets } = await loading(import('./schedule'))
  let alone = 0
  const targets = groups.flatMap(([name, items]) => {
    items.sort(byPage)
    return name
      ? [
          {
            name,
            els: items.map((i) => i.el),
            motion: items[0]!.value,
            each: items.map((i) => i.value),
          },
        ]
      : items.map((i) => ({ name: `#${alone++}`, els: [i.el], motion: i.value }))
  })
  const playing = runTargets(targets, new Map(), {
    spring: motionSpringAt(all[0]!.el),
    signal: new AbortController().signal,
  })
  // Held at their start by now: the stand-in comes off.
  for (const run of hidden) run.cancel()
  await playing
}

/**
 * Plays `value.initial` on `el` with the others that mount in the same tick under `name`; `again`
 * for a replay, which starts over even though it's been brought in.
 */
export function queueAppearance(
  el: HTMLElement,
  name: string | undefined,
  value: TargetMotion,
  again = false,
) {
  if (!batch.size) queueMicrotask(flush)
  batch.set(name ?? '', [...(batch.get(name ?? '') ?? []), { el, value, again }])
}

/** A component's `initial` by part, its own over its style's; a repeated part element by element. */
export function appearParts(
  key: string,
  keyStyle: Record<string, unknown> | undefined,
  own: unknown,
  els: (part: string) => Element[],
  timing: MotionTiming,
  /** A `replay`: it plays again, though it's been brought in. */
  again = false,
  /** Once every part's appearance has played (or at once, when none plays). */
  done?: () => void,
) {
  let pending = 0
  const one = () => {
    if (--pending === 0) done?.()
  }
  const mine = (own ?? {}) as { initial?: object; stagger?: TargetMotion['stagger']; when?: string }
  const initial = { ...(keyStyle?.initial as object), ...mine.initial } as Record<
    string,
    MotionValues
  >
  for (const [part, values] of Object.entries(initial))
    for (const el of els(part))
      if (values && (el instanceof HTMLElement || el instanceof SVGElement)) {
        if (done) {
          pending++
          armEnter(el, one)
        }
        queueAppearance(
          el as HTMLElement,
          `${key}:${part}`,
          {
            ...timing,
            stagger: mine.stagger,
            // `when: 'visible'`: it waits until it scrolls into view.
            when: mine.when === 'visible' ? 'visible' : undefined,
            initial: values,
          },
          again,
        )
      }
  if (!pending) done?.()
}
