// Layout motion, a transform from where an element was to where it is now (FLIP: the compositor's).
// `layoutId`: elements sharing one are one element moving between places; the newcomer starts at
// the box of the one that just left. `layout`: the element slides to wherever layout puts it.
import { pageHidden, prefersReducedMotion } from '../composables/dom'
import { resolveTiming, track } from './timing'
import type { MotionTiming, MotionValues } from './types'
import { isTimed } from './playable'
import { reducePresence, toKeyframe } from './values'

// Just now: one flush, give or take a frame.
const FRESH = 100
const boxes = new Map<string, { box: DOMRect; at: number }>()

/** Leaving: where it was, for whoever arrives next under the same id. */
export function rememberLayout(el: Element, id: string): void {
  const box = el.getBoundingClientRect()
  if (box.width || box.height) boxes.set(id, { box, at: performance.now() })
}

/**
 * Arriving: slides from where the last one under `id` was, if it left just now. Read after the
 * flush, so it works whichever of the two comes first in the page. Calls `otherwise` if nothing
 * left (a first arrival appears as usual).
 */
export function arriveLayout(
  el: Element,
  id: string,
  timing: MotionTiming,
  otherwise: () => void,
): void {
  queueMicrotask(() => {
    const before = boxes.get(id)
    boxes.delete(id)
    if (!before || performance.now() - before.at > FRESH) return otherwise()
    if (prefersReducedMotion() || pageHidden()) return
    const now = el.getBoundingClientRect()
    slide(el, before.box, now, timing)
  })
}

const LAYOUT_ID = 'ui-layout'

/** From `from` to where it is (`to`), as a transform that ends at none. */
function slide(el: Element, from: DOMRect, to: DOMRect, timing: MotionTiming) {
  const dx = from.left - to.left
  const dy = from.top - to.top
  const sx = to.width ? from.width / to.width : 1
  const sy = to.height ? from.height / to.height : 1
  if (
    Math.abs(dx) < 0.5 &&
    Math.abs(dy) < 0.5 &&
    Math.abs(sx - 1) < 0.01 &&
    Math.abs(sy - 1) < 0.01
  )
    return
  const { duration, easing } = resolveTiming(el, timing)
  const run = el.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { id: LAYOUT_ID, duration, easing },
  )
  void track(run.finished.catch(() => {}))
}

// `layout`: each element's last place in its parent, and per parent, the elements watched under it.
type Point = { x: number; y: number }
const placeOf = new WeakMap<Element, Point>()
const timingOf = new WeakMap<Element, () => MotionTiming>()
const groups = new WeakMap<Element, { observer: MutationObserver; members: Set<Element> }>()
// A running slide's starting offset, so an interruption carries on from where it shows.
const offsets = new WeakMap<Animation, Point>()

/**
 * Where layout puts it in its parent, its own transforms left out (a card's own scale or offset
 * isn't a move), and scrolling or the parent moving as a whole neither.
 */
function placeIn(el: Element, parent: Element): Point {
  if (el instanceof HTMLElement && parent instanceof HTMLElement) {
    if (el.offsetParent === parent) return { x: el.offsetLeft, y: el.offsetTop }
    if (el.offsetParent === parent.offsetParent)
      return { x: el.offsetLeft - parent.offsetLeft, y: el.offsetTop - parent.offsetTop }
  }
  const box = el.getBoundingClientRect()
  const at = parent.getBoundingClientRect()
  return { x: box.left - at.left, y: box.top - at.top }
}

/** Where a slide shows it now, relative to its layout place: its start offset, eased away. */
function shownOffset(run: Animation): Point {
  const start = offsets.get(run)
  const progress = run.effect?.getComputedTiming().progress ?? 1
  return start ? { x: start.x * (1 - progress), y: start.y * (1 - progress) } : { x: 0, y: 0 }
}

/** By `offset`, back to its place: added onto its own translate, so its own styles still apply. */
function slideBy(el: Element, offset: Point, timing: MotionTiming) {
  if (pageHidden()) return
  if (Math.abs(offset.x) < 0.5 && Math.abs(offset.y) < 0.5) return
  const { duration, easing } = resolveTiming(el, timing)
  const run = el.animate([{ translate: `${offset.x}px ${offset.y}px` }, { translate: '0px 0px' }], {
    id: LAYOUT_ID,
    duration,
    easing,
    composite: 'add',
  })
  offsets.set(run, offset)
  void track(run.finished.catch(() => {}))
}

/** Something under the parent changed: each element that moved slides from where it showed. */
function relayout(parent: Element, members: Set<Element>) {
  for (const el of members) if (!el.isConnected) members.delete(el)
  const list = [...members]
  const reduced = prefersReducedMotion()
  // Offsets read first, the cancels, then one layout read for all.
  const shown = list.map((el) => {
    const runs = el.getAnimations().filter((run) => run.id === LAYOUT_ID)
    const offset = runs.reduce(
      (sum, run) => {
        const o = shownOffset(run)
        return { x: sum.x + o.x, y: sum.y + o.y }
      },
      { x: 0, y: 0 },
    )
    for (const run of runs) run.cancel()
    return offset
  })
  const now = list.map((el) => placeIn(el, parent))
  list.forEach((el, i) => {
    const last = placeOf.get(el)
    placeOf.set(el, now[i]!)
    if (!last || reduced) return
    const offset = {
      x: last.x + shown[i]!.x - now[i]!.x,
      y: last.y + shown[i]!.y - now[i]!.y,
    }
    slideBy(el, offset, timingOf.get(el)?.() ?? {})
  })
}

/**
 * `layout: true`: the element slides to wherever layout puts it (a sibling growing, a list
 * reordering), watched through its parent's changes, the way auto-animate does. Position only.
 * Returns the stop.
 */
export function followLayout(el: Element, timing: () => MotionTiming): () => void {
  const parent = el.parentElement
  if (!parent) return () => {}
  placeOf.set(el, placeIn(el, parent))
  timingOf.set(el, timing)
  let group = groups.get(parent)
  if (!group) {
    const members = new Set<Element>()
    const observer = new MutationObserver(() => relayout(parent, members))
    observer.observe(parent, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
    group = { observer, members }
    groups.set(parent, group)
  }
  group.members.add(el)
  const own = group
  return () => {
    own.members.delete(el)
    if (own.members.size) return
    own.observer.disconnect()
    groups.delete(parent)
  }
}

// ─── Leaving in place ────────────────────────────────────────────────────────

/** @internal Where a leaving element was, read while it's still on the page. */
export interface LeavingPlace {
  parent: Node
  next: Node | null
  box: DOMRect
  at: number
}

export function placeOnLeave(el: Element): LeavingPlace | undefined {
  if (!(el instanceof HTMLElement) || !el.parentNode || !el.isConnected) return undefined
  const at = performance.now()
  return { parent: el.parentNode, next: el.nextSibling, box: el.getBoundingClientRect(), at }
}

// Removed in the flush it started leaving in. Later, a Transition held it and played its own leave.
const HELD = 50

const plain = (raw: unknown): unknown => (isTimed(raw) ? raw.value : raw)
const half = (raw: unknown, rest: number) => {
  const n = Number.parseFloat(String(plain(raw)))
  return Number.isFinite(n) ? rest + (n - rest) / 2 : undefined
}

/**
 * No `exit` given: it leaves back the way it came, quieter (transitions-polish: the exit drops or
 * shrinks the distance and blur), and fades.
 */
export function exitFrom(initial: MotionValues | undefined): MotionValues {
  const out: Record<string, unknown> = { opacity: 0 }
  for (const key of ['x', 'y', 'blur'] as const) {
    const v = initial && key in initial ? half(initial[key], 0) : undefined
    if (v !== undefined) out[key] = v
  }
  const scale = initial?.scale !== undefined ? half(initial.scale, 1) : undefined
  if (scale !== undefined) out.scale = String(scale)
  return out as MotionValues
}

// Per box, how many are leaving inside it and its own styles, put back when the last is gone.
const clipping = new WeakMap<HTMLElement, { count: number; overflow: string; position: string }>()
function clipWhileLeaving(box: HTMLElement): () => void {
  const entry = clipping.get(box) ?? {
    count: 0,
    overflow: box.style.overflow,
    position: box.style.position,
  }
  if (!entry.count) {
    box.style.overflow = 'clip'
    // Overflow clips an out-of-flow child only when the box holds it: positioned.
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative'
  }
  entry.count++
  clipping.set(box, entry)
  return () => {
    if (--entry.count) return
    box.style.overflow = entry.overflow
    box.style.position = entry.position
    clipping.delete(box)
  }
}

/**
 * Vue removed it, its parent stays: it goes back where it was, out of the flow, plays its exit and
 * is gone (auto-animate's approach). Nothing holds it already (a Transition keeps its own).
 */
export function leaveInPlace(
  el: HTMLElement,
  place: LeavingPlace,
  values: MotionValues,
  timing: MotionTiming,
): void {
  queueMicrotask(() => {
    if (el.isConnected || !place.parent.isConnected || performance.now() - place.at > HELD) return
    if (pageHidden()) return
    const next = place.next?.parentNode === place.parent ? place.next : null
    Object.assign(el.style, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${place.box.width}px`,
      height: `${place.box.height}px`,
      margin: '0',
      pointerEvents: 'none',
    })
    el.setAttribute('aria-hidden', 'true')
    el.inert = true
    // In a box that follows its size, it leaves inside it: the box shrinks over it, not past it.
    const box =
      place.parent instanceof Element ? place.parent.closest<HTMLElement>('[data-ui-size]') : null
    const unclip = box ? clipWhileLeaving(box) : () => {}
    place.parent.insertBefore(el, next)
    // Placed at 0,0 of whatever holds it, then moved by what that turned out to be.
    const at = el.getBoundingClientRect()
    el.style.top = `${place.box.top - at.top}px`
    el.style.left = `${place.box.left - at.left}px`
    const look = prefersReducedMotion() ? reducePresence(values) : values
    const frame = toKeyframe(look, getComputedStyle(el).direction === 'rtl')
    const { duration, easing } = resolveTiming(el, timing)
    const run = el.animate([{ ...frame, offset: 1 }], { duration, easing, fill: 'forwards' })
    const gone = () => {
      el.remove()
      unclip()
    }
    void track(run.finished.then(gone, gone))
  })
}
