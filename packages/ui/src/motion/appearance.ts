// Appearances with no component playing them (`v-animate` on its own, a component's `initial`):
// those that mount together play in page order, up to a budget, and only where they're seen.
import { motionSpringAt } from './styleHolder'
import { staggerAt, valuesAt } from './playable'
import type { MotionTiming, MotionValues, TargetMotion, Viewport } from './types'
import { watchViewport } from './viewport'
import { appear } from './useComponentMotion'
import { armEnter, entered } from './finish'
import { loading } from './styleKey'
import { holdUnseen } from './ids'
import { leavingUnder } from './presence'

// `when: 'visible'`: settles once the element scrolls into view, by default a little past the edge
// so it starts where it's seen (useInView's margin), once.
const watching = new WeakMap<Element, () => void>()
function inView(el: Element, viewport: Viewport | undefined): Promise<void> {
  return new Promise((resolve) => {
    const stop = watchViewport(el, viewport, '0px 0px -10% 0px', (seen) => {
      if (!seen) return
      unwatchView(el)
      resolve()
    })
    watching.set(el, stop)
  })
}

/** Gone before it was seen: it's let go. */
export function unwatchView(el: Element) {
  watching.get(el)?.()
  watching.delete(el)
}

// The most that appear together; past it, chaos, not choreography (18c).
const BUDGET = 24
export const seen = (box: DOMRect) =>
  box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth
const onScreen = (el: Element) => seen(el.getBoundingClientRect())
// Scrolling: rows a virtualized list recycles come and go; only real adds and removes animate.
// Only in what scrolled: a scroll in one box leaves entrances elsewhere on the page alone.
let scrolledAt = -1e9
let scrolledIn: EventTarget | null = null
if (typeof window !== 'undefined')
  addEventListener(
    'scroll',
    (event) => {
      scrolledAt = performance.now()
      scrolledIn = event.target
    },
    { capture: true, passive: true },
  )
export const scrolling = (el: Element) =>
  performance.now() - scrolledAt < 150 &&
  (!(scrolledIn instanceof Node) || scrolledIn.nodeType === 9 || scrolledIn.contains(el))

// No component around it: it plays its own appearance. Those that mount together under one name
// stagger in page order (`stagger`, `delay`).
const batch = new Map<string, { el: HTMLElement; value: TargetMotion; again: boolean }[]>()
const byPage = (a: { el: Element }, b: { el: Element }) =>
  a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

// Created before it's placed (a page coming in through an out-in Transition, after the old one
// leaves): unseen meanwhile, then requeued in the frame it's placed in, together with the rest of its
// page, so it staggers with them and `after` finds the names it waits on. Two seconds at most.
const unplaced: {
  el: HTMLElement
  name: string
  value: TargetMotion
  again: boolean
  held: Animation
  frames: number
}[] = []
function watchPlaced() {
  requestAnimationFrame(() => {
    for (const item of unplaced.splice(0)) {
      if (item.el.isConnected) {
        item.held.cancel()
        queueAppearance(item.el, item.name || undefined, item.value, item.again)
      } else if (++item.frames > 120) {
        item.held.cancel()
        entered(item.el)
      } else unplaced.push(item)
    }
    if (unplaced.length) watchPlaced()
  })
}

function flush() {
  // Not in the page yet: it waits to be placed (above).
  for (const [name, items] of batch) {
    if (items.every(({ el }) => el.isConnected)) continue
    batch.set(
      name,
      items.filter(({ el }) => el.isConnected),
    )
    if (!unplaced.length) watchPlaced()
    for (const item of items.filter(({ el }) => !el.isConnected))
      unplaced.push({ ...item, name, held: holdUnseen(item.el), frames: 0 })
  }
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
  for (const [name, items] of batch) {
    items.sort(byPage)
    const els = items.map((item) => item.el)
    let i = -1
    items.forEach(({ el, value, again }) => {
      const later = value.when === 'visible'
      // Timed by you (a wave across a grid): yours, however many; otherwise a budget.
      const timed = value.delay !== undefined || value.stagger !== undefined
      // Many at once (a route of cards): those in view play, up to a budget; the rest just show.
      // Scrolling recycles rows; a replay is yours, on screen, and always plays.
      if (!later && ((!timed && played >= BUDGET) || (!again && scrolling(el)) || !onScreen(el)))
        return entered(el)
      const initial = valuesAt(value.initial, { direction: 0, index: i + 1, count: items.length })
      // Nothing to come in from: it neither plays nor counts.
      if (!initial || !Object.keys(initial).length) return entered(el)
      played++
      i++
      const delay = ((value.delay ?? 0) + staggerAt(value.stagger, i, items.length, el, els)) * 1000
      const until = later ? inView(el, value.viewport) : undefined
      // Played, or nothing to play: its `onFinish` runs either way.
      const play = () =>
        appear(el, initial, value, motionSpringAt(el), delay, again, until).finally(() =>
          entered(el),
        )
      // `swap: 'wait'`: what it replaces under its name leaves first; unseen meanwhile.
      const before =
        name && (value as { swap?: string }).swap === 'wait' ? leavingUnder(name) : undefined
      if (!before) return void play()
      const held = holdUnseen(el)
      void before.then(() => {
        held.cancel()
        return play()
      })
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
// How long after a component's entrance its newly mounted parts still join it (ms).
const JOIN_WINDOW = 600

/** A component's entrance; parts that mount in its root just after (rows a tree opens once its
 * saved state loads) join it instead of showing as they are. */
export function appearJoining(
  key: string,
  keyStyle: Record<string, unknown> | undefined,
  own: unknown,
  els: (part: string) => Element[],
  timing: MotionTiming,
  done: () => void,
  root?: Element | null,
) {
  const played = new WeakSet<Element>()
  const fresh = (part: string) => {
    const found = els(part).filter((el) => !played.has(el))
    for (const el of found) played.add(el)
    return found
  }
  appearParts(key, keyStyle, own, fresh, timing, false, done)
  if (!root) return
  const late = new MutationObserver(() => appearParts(key, keyStyle, own, fresh, timing))
  late.observe(root, { childList: true, subtree: true })
  setTimeout(() => late.disconnect(), JOIN_WINDOW)
}

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
