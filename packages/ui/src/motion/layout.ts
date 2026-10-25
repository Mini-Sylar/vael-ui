// Layout motion, a transform from where an element was to where it is now (FLIP: the compositor's).
// `layoutId`: elements sharing one are one element moving between places; the newcomer starts at
// the box of the one that just left. `layout`: the element slides to wherever layout puts it.
import { onBeforeUpdate } from 'vue'
import type { ComponentInternalInstance } from 'vue'
import { pageHidden, prefersReducedMotion } from '../composables/dom'
import { resolveTiming, track } from './timing'
import type { MotionTiming, MotionValues } from './types'
import { isTimed } from './playable'
import { motionOffAt } from './styleHolder'
import { groupValues, reducePresence, toKeyframe } from './values'

// Just now: the same flush or the next frame (a late tick, an async part). Later is a new arrival.
const FRESH = 34
const boxes = new Map<string, { box: DOMRect; at: number }>()

// Boxes read as the owner starts to re-render: by the time one leaves, the same flush may have
// moved it (a row inserted above). Dropped once the flush is over.
const painted = new WeakMap<Element, DOMRect>()
const watched = new WeakMap<ComponentInternalInstance, Set<Element>>()
/** Notes `el`'s box each time `owner` is about to re-render, for `rememberLayout` and leaving. */
export function watchPaintedBox(el: Element, owner: ComponentInternalInstance | null): void {
  // A component's root is removed by the parent rendering it: noted as that one updates too.
  for (let at = owner; at; at = at.parent as ComponentInternalInstance | null) {
    watchOwner(el, at)
    if (at.subTree?.el !== el) break
  }
}
function watchOwner(el: Element, owner: ComponentInternalInstance) {
  let els = watched.get(owner)
  if (!els) {
    const set = (els = new Set<Element>())
    watched.set(owner, set)
    onBeforeUpdate(() => {
      for (const each of set)
        if (each.isConnected) painted.set(each, each.getBoundingClientRect())
        else set.delete(each)
      queueMicrotask(() => set.forEach((each) => painted.delete(each)))
    }, owner)
  }
  els.add(el)
}

// Elements that can leave, by parent: a sibling patched first in the same render may move them
// before they're removed, and inside a slot their owner doesn't re-render to note them.
const leavers = new WeakMap<Element, Set<Element>>()
const noted = new Set<Element>()
/** Notes `el`'s box whenever a `v-animate` sibling is about to be patched. */
export function watchLeaving(el: Element): void {
  const parent = el.parentElement
  if (!parent) return
  let set = leavers.get(parent)
  if (!set) leavers.set(parent, (set = new Set()))
  set.add(el)
}
/** `el` is about to be patched: its siblings that can leave note where they're painted. */
export function notePaintedSiblings(el: Element): void {
  const set = el.parentElement && leavers.get(el.parentElement)
  if (!set) return
  if (!noted.size)
    queueMicrotask(() => noted.forEach((each) => noted.delete(each) && painted.delete(each)))
  for (const each of set) {
    if (!each.isConnected) set.delete(each)
    else if (!painted.has(each)) {
      painted.set(each, each.getBoundingClientRect())
      noted.add(each)
    }
  }
}

/** Leaving: where it was, for whoever arrives next under the same id. */
export function rememberLayout(el: Element, id: string): void {
  const box = painted.get(el) ?? el.getBoundingClientRect()
  const now = performance.now()
  // Ids that left and never came back: dropped, so one id per item can't grow this for good.
  for (const [key, left] of boxes) if (now - left.at > FRESH) boxes.delete(key)
  if (box.width || box.height) boxes.set(id, { box, at: now })
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
    if (prefersReducedMotion() || pageHidden() || motionOffAt(el)) return
    const now = el.getBoundingClientRect()
    slide(el, before.box, now, timing)
  })
}

const LAYOUT_ID = 'ui-layout'

/** From `from` to where it is (`to`), as a transform that ends at none. */
// Its `delay` (seconds), held where it was until then.
const delayOf = (timing: MotionTiming) => {
  const delay = (timing as { delay?: number }).delay
  return delay ? { delay: delay * 1000, fill: 'backwards' as const } : {}
}

function slide(el: Element, from: DOMRect, to: DOMRect, timing: MotionTiming) {
  // A scaled ancestor scales the translate too: the gap on screen, in its own pixels.
  // offsetWidth rounds, so only a real scale (over 2%) counts.
  const scaleOf = (shown: number, own: number) =>
    own && shown && Math.abs(shown / own - 1) > 0.02 ? shown / own : 1
  const html = el instanceof HTMLElement
  const dx = (from.left - to.left) / (html ? scaleOf(to.width, el.offsetWidth) : 1)
  const dy = (from.top - to.top) / (html ? scaleOf(to.height, el.offsetHeight) : 1)
  // `layout: 'position'`: it travels at its own size, so text in it never stretches.
  const resize = (timing as { layout?: unknown }).layout !== 'position'
  const sx = resize && to.width ? from.width / to.width : 1
  const sy = resize && to.height ? from.height / to.height : 1
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
    { id: LAYOUT_ID, duration, easing, ...delayOf(timing) },
  )
  void track(run.finished.catch(() => {}))
}

// `layout`: each element's last place in its parent, and per parent, the elements watched under it.
type Point = { x: number; y: number }
const placeOf = new WeakMap<Element, Point | undefined>()
const timingOf = new WeakMap<Element, () => MotionTiming>()
const groups = new WeakMap<
  Element,
  { observer: MutationObserver; resize: ResizeObserver; members: Set<Element> }
>()
// A running slide's starting offset, so an interruption carries on from where it shows.
const offsets = new WeakMap<Animation, Point>()

/**
 * Where layout puts it in its parent, its own transforms left out (a card's own scale or offset,
 * an entrance or a glide on its way, aren't moves), and scrolling or the parent moving as a whole
 * neither.
 */
function placeIn(el: Element, parent: Element): Point | undefined {
  // Not rendered (display: none around it): no place, so showing it isn't a move.
  if (el instanceof HTMLElement && !el.offsetParent && !el.getClientRects().length) return undefined
  if (el instanceof HTMLElement && parent instanceof HTMLElement) {
    if (el.offsetParent === parent) return { x: el.offsetLeft, y: el.offsetTop }
    if (el.offsetParent === parent.offsetParent)
      return { x: el.offsetLeft - parent.offsetLeft, y: el.offsetTop - parent.offsetTop }
  }
  const box = el.getBoundingClientRect()
  const at = parent.getBoundingClientRect()
  const style = getComputedStyle(el)
  const [tx = '0', ty = '0'] = style.translate === 'none' ? [] : style.translate.split(' ')
  const matrix = style.transform === 'none' ? undefined : new DOMMatrix(style.transform)
  // The parent scaled evenly (a panel opening from 0.97): so is the gap to its edge. A box resizing
  // on one axis (a panel easing to new content) isn't scaling what's in it.
  const sx = parent instanceof HTMLElement && parent.offsetWidth ? at.width / parent.offsetWidth : 1
  const sy =
    parent instanceof HTMLElement && parent.offsetHeight ? at.height / parent.offsetHeight : 1
  const scale = sx > 0 && Math.abs(sx - sy) < 0.005 ? sx : 1
  let x = (box.left - at.left) / scale - (Number.parseFloat(tx) || 0) - (matrix?.m41 ?? 0)
  let y = (box.top - at.top) / scale - (Number.parseFloat(ty) || 0) - (matrix?.m42 ?? 0)
  // Scrolled containers in between add back: scrolling isn't a move.
  for (let up = el.parentElement; up; up = up.parentElement) {
    x += up.scrollLeft
    y += up.scrollTop
    if (up === parent) break
  }
  return { x, y }
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
    ...delayOf(timing),
  })
  offsets.set(run, offset)
  void track(run.finished.catch(() => {}))
}

/** Something under the parent changed: each element that moved slides from where it showed. */
function relayout(parent: Element, members: Set<Element>) {
  for (const el of members) if (!el.isConnected) members.delete(el)
  const list = [...members]
  const reduced = prefersReducedMotion()
  // Its own glides only (a `layoutId` travel is left alone), and where they show it now.
  const runs = list.map((el) =>
    el.getAnimations().filter((run) => run.id === LAYOUT_ID && offsets.has(run)),
  )
  const shown = runs.map((own) =>
    own.reduce(
      (sum, run) => {
        const o = shownOffset(run)
        return { x: sum.x + o.x, y: sum.y + o.y }
      },
      { x: 0, y: 0 },
    ),
  )
  // One layout read for all.
  const now = list.map((el) => placeIn(el, parent))
  list.forEach((el, i) => {
    const last = placeOf.get(el)
    const place = now[i]
    placeOf.set(el, place)
    // Unmoved: a glide on its way carries on undisturbed.
    if (!last || !place || (Math.abs(last.x - place.x) < 0.5 && Math.abs(last.y - place.y) < 0.5))
      return
    for (const run of runs[i]!) run.cancel()
    if (reduced || motionOffAt(el)) return
    const offset = {
      x: last.x + shown[i]!.x - place.x,
      y: last.y + shown[i]!.y - place.y,
    }
    slideBy(el, offset, timingOf.get(el)?.() ?? {})
  })
}

/**
 * `layout: true`: the element slides to wherever layout puts it (a sibling growing, a list
 * reordering), watched through its parent's changes (inside a component, its panel's), the way
 * auto-animate does. Position only. Returns the stop.
 */
export function followLayout(el: Element, timing: () => MotionTiming): () => void {
  // Inside a component's panel, measured against the panel: content in a slot moves with the row
  // around it (a filtered option), not within its own parent.
  const parent = el.parentElement?.closest('[data-ui-presence]') ?? el.parentElement
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
    // Resized from outside (the window, a pane): places noted again, nothing slides.
    const resize = new ResizeObserver(() => {
      for (const each of members) if (each.isConnected) placeOf.set(each, placeIn(each, parent))
    })
    resize.observe(parent)
    group = { observer, resize, members }
    groups.set(parent, group)
  }
  group.members.add(el)
  const own = group
  return () => {
    own.members.delete(el)
    if (own.members.size) return
    own.observer.disconnect()
    own.resize.disconnect()
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
  /** Its look as it started leaving: where its exit starts from. */
  look?: Record<string, string>
}

// An element that can be lifted out and placed: HTML, or an icon's outermost <svg>.
export const placeable = (el: Element): el is HTMLElement | SVGSVGElement =>
  el instanceof HTMLElement || (el instanceof SVGSVGElement && !el.ownerSVGElement)

export function placeOnLeave(el: Element): LeavingPlace | undefined {
  if (!placeable(el) || !el.parentNode || !el.isConnected) return undefined
  const at = performance.now()
  // How it looks now, an entrance mid-way included: its animations end when Vue removes it.
  const style = getComputedStyle(el)
  const look: Record<string, string> = {}
  for (const prop of HELD_LOOK) look[prop] = style.getPropertyValue(prop)
  // Where it was painted: the render removing it may have moved it already (a sibling grew).
  let box = untransformed(el)
  const was = painted.get(el)
  if (was) {
    const now = el.getBoundingClientRect()
    box = new DOMRect(box.x + was.x - now.x, box.y + was.y - now.y, box.width, box.height)
  }
  return { parent: el.parentNode, next: el.nextSibling, box, at, look }
}
const HELD_LOOK = ['translate', 'scale', 'rotate', 'transform', 'opacity', 'filter', 'clip-path']

/**
 * Its box as layout has it, without its own translate and scale: caught mid-animation (a strike
 * half drawn), it keeps that look as it leaves, so the look mustn't be in its size too.
 */
function untransformed(el: Element): DOMRect {
  const box = el.getBoundingClientRect()
  if (!(el instanceof HTMLElement)) return box
  const style = getComputedStyle(el)
  const [tx = '0', ty = '0'] = style.translate === 'none' ? [] : style.translate.split(' ')
  const [sx = '1', sy = sx] = style.scale === 'none' ? [] : style.scale.split(' ')
  const m = style.transform === 'none' ? undefined : new DOMMatrix(style.transform)
  const scaleX = Number(sx) * (m?.a ?? 1)
  const scaleY = Number(sy) * (m?.d ?? 1)
  const [ox = '0', oy = '0'] = style.transformOrigin.split(' ')
  const left =
    box.left -
    (Number.parseFloat(tx) || 0) -
    (m?.e ?? 0) -
    (Number.parseFloat(ox) || 0) * (1 - scaleX)
  const top =
    box.top -
    (Number.parseFloat(ty) || 0) -
    (m?.f ?? 0) -
    (Number.parseFloat(oy) || 0) * (1 - scaleY)
  // Untransformed, the box is exact; offsetWidth rounds to whole pixels.
  const flat = scaleX === 1 && scaleY === 1 && style.rotate === 'none' && (!m || (!m.b && !m.c))
  const width = flat ? box.width : el.offsetWidth || box.width
  const height = flat ? box.height : el.offsetHeight || box.height
  return new DOMRect(left, top, width, height)
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
 * A scroller between it and what holds it, unpositioned, doesn't clip it once it's out of the
 * flow: clipped to what that scroller shows instead.
 */
function clipToScrollers(el: HTMLElement | SVGSVGElement, place: LeavingPlace) {
  const holder = el instanceof HTMLElement ? el.offsetParent : null
  if (!holder || (place.look?.['clip-path'] ?? 'none') !== 'none') return
  let view: { top: number; right: number; bottom: number; left: number } | undefined
  for (let up = el.parentElement; up && up !== holder; up = up.parentElement) {
    if (getComputedStyle(up).overflow === 'visible') continue
    const r = up.getBoundingClientRect()
    view = view
      ? {
          top: Math.max(view.top, r.top),
          right: Math.min(view.right, r.right),
          bottom: Math.min(view.bottom, r.bottom),
          left: Math.max(view.left, r.left),
        }
      : { top: r.top, right: r.right, bottom: r.bottom, left: r.left }
  }
  if (!view) return
  const { top, right, bottom, left } = place.box
  const inset = [view.top - top, right - view.right, bottom - view.bottom, view.left - left]
  if (inset.some((side) => side > 0))
    el.style.clipPath = `inset(${inset.map((side) => `${Math.max(0, side)}px`).join(' ')})`
}

/**
 * Vue removed it, its parent stays: it goes back where it was, out of the flow, plays its exit and
 * is gone (auto-animate's approach). Nothing holds it already (a Transition keeps its own).
 */
export function leaveInPlace(
  el: HTMLElement | SVGSVGElement,
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
      boxSizing: 'border-box',
      margin: '0',
      pointerEvents: 'none',
    })
    // Placed there, not transitioned to it.
    el.style.setProperty('transition', 'none')
    el.setAttribute('aria-hidden', 'true')
    if (el instanceof HTMLElement) el.inert = true
    // In a box that follows its size, it leaves inside it: the box shrinks over it, not past it.
    const box =
      place.parent instanceof Element ? place.parent.closest<HTMLElement>('[data-ui-size]') : null
    const unclip = box ? clipWhileLeaving(box) : () => {}
    place.parent.insertBefore(el, next)
    // Placed at 0,0 of whatever holds it, then moved by what that turned out to be.
    const at = el.getBoundingClientRect()
    el.style.top = `${place.box.top - at.top}px`
    el.style.left = `${place.box.left - at.left}px`
    // From the look it had, not its resting one: on top of the place it's measured into.
    for (const [prop, value] of Object.entries(place.look ?? {})) el.style.setProperty(prop, value)
    clipToScrollers(el, place)
    const look = prefersReducedMotion() ? reducePresence(values) : values
    const rtl = getComputedStyle(el).direction === 'rtl'
    // A value with its own timing leaves on it; x and y timed apart can't share `translate`.
    let translateTaken = false
    const runs = groupValues(look).map((group) => {
      const moves = 'x' in group.values || 'y' in group.values
      const frame = toKeyframe(
        group.values,
        rtl,
        moves && translateTaken ? 'transform' : 'translate',
      )
      if (moves) translateTaken = true
      if (!Object.keys(frame).length) return undefined
      const { duration, easing } = resolveTiming(el, group.timing ?? timing)
      return el.animate([{ ...frame, offset: 1 }], {
        duration,
        easing,
        delay: group.delay * 1000,
        fill: 'forwards',
      }).finished
    })
    const gone = () => {
      el.remove()
      unclip()
    }
    void track(Promise.all(runs).then(gone, gone))
  })
}
