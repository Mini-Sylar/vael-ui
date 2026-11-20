import { computed, getCurrentScope, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type { SpringName } from '../motion/springNames'
import type { Spring } from '../motion/types'
import { motionOffAt } from '../motion/styleHolder'
import { createSpring } from '../motion/useSpringValue'
import { createClickGuard, isRtl, prefersReducedMotion } from './dom'
import type { ElRef } from './dom'
import {
  createVelocityTracker,
  dampen,
  DRAG_THRESHOLD,
  gestureSprings,
  limitOvershoot,
} from './gesture'
import { wheelLayout } from './wheelLayout'

// A wheel you can grab: a one-axis position you drag, throw, scroll with a mouse wheel or step with
// keys, resting on an item. It moves a number and your items follow it (nothing native scrolls),
// so the same wheel lays out flat as a carousel, a ruler or a pager. Option names follow ARIA and
// Embla.

/** Apple's scroll deceleration (0.998 is a page; this is a short strip): where a fling would stop. */
const DECELERATION = 0.995
/** It snaps to the nearest row this long after the last tick of a mouse wheel. */
const WHEEL_IDLE = 60
/** The same, while it is stretched past an end of a list. */
const WHEEL_IDLE_STRETCHED = 45
/** Rows a wheel notch moves per px of delta, before the cap that keeps a long row 1:1. */
/** Wheel deltas up to this (px) move it 1:1; larger ones, a mouse notch, are eased. */
const WHEEL_FINE = 30
// Half a pixel, and half a pixel a second, is rest: nothing on screen still moves, and the model
// updates as soon as the motion looks done.
const EPSILON = 0.5

export interface UseWheelOptions {
  /** The element you drag, scroll or tilt the mouse wheel over. */
  el: ElRef<HTMLElement | null>
  /** How many rows. */
  count: MaybeRefOrGetter<number>
  /**
   * One row's length along the axis, in px: how far the pointer goes for one row. `'auto'` is the
   * length of `el` itself: a row per page, at any width. Default 36.
   */
  size?: MaybeRefOrGetter<number | 'auto'>
  /** Rows that aren't `size` long, by index: a carousel of slides of different widths. */
  sizes?: MaybeRefOrGetter<readonly number[] | undefined>
  /** Space between rows, px. */
  gap?: MaybeRefOrGetter<number>
  /** Which way it moves, as `aria-orientation`. Default `'vertical'`, a picker; a carousel is horizontal. */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
  /** Where a slide rests in `el`: centred (default), or against its start or end. */
  align?: MaybeRefOrGetter<'start' | 'center' | 'end'>
  /** Wraps past the ends: `position` keeps counting, `index` wraps. */
  loop?: MaybeRefOrGetter<boolean>
  /** Comes to rest wherever a throw ends, instead of on a slide. */
  dragFree?: MaybeRefOrGetter<boolean>
  /** Slides per rest: `3` moves a page of three at a time. Default 1. */
  slidesToScroll?: MaybeRefOrGetter<number>
  /** Stops with the last slide's end at the end of `el`, so no empty space shows after it. */
  containScroll?: MaybeRefOrGetter<boolean>
  disabled?: MaybeRefOrGetter<boolean>
  /**
   * The spring it settles on: a name or `{ damping, response }`. Unset, the nearest
   * ConfigProvider's `spring`, else the default every component uses. A throw gets a little give, reduced motion none.
   */
  spring?: MaybeRefOrGetter<Spring | SpringName | undefined>
  /** Runs once it has come to rest on `index` (the model already changed when it was chosen). */
  onSettle?: (index: number) => void
  /**
   * Runs each time the row nearest the anchor changes, while dragging, coasting or stepping, with
   * that row wrapped into `0 … count - 1`: a click for every row that passes, such as
   * `useHaptic().selection`. It fires once for the row it lands on and not again if the spring
   * overshoots past it and back, and never for the stretch past either end of a list that doesn't loop.
   */
  onTick?: (index: number) => void
}

export interface UseWheelReturn {
  /** Where it is right now, in rows: a float that follows the pointer, then the spring. */
  position: Ref<number>
  /** The row it's on (or heading for), wrapped into `0 … count - 1`. */
  index: ComputedRef<number>
  isDragging: Ref<boolean>
  /** Moves to row `i` on a spring (a looping wheel takes the short way round). */
  goTo: (i: number, options?: { animate?: boolean }) => void
  /** Moves `n` rests (slides, or pages with `slidesToScroll`) from where it is heading. */
  step: (n: number) => void
  /**
   * Item `i`'s place among the `reach` items either side of the resting spot (default 3), from 0
   * to 1: a `v-animate` `progress`, so its keyframes are the look from one side to the other.
   */
  progressOf: (i: number, reach?: number) => number
  /** The arrow keys along the axis, Home, End, PageUp and PageDown. Bind to `@keydown` on `el`. */
  onKeydown: (event: KeyboardEvent) => void
}

const wrap = (value: number, count: number) => ((value % count) + count) % count

export function useWheel(model: Ref<number>, options: UseWheelOptions): UseWheelReturn {
  const count = () => Math.max(0, toValue(options.count))
  const axis = () => (toValue(options.orientation) === 'horizontal' ? 'x' : 'y')
  const loops = () => toValue(options.loop) === true
  const snaps = () => toValue(options.dragFree) !== true
  const snapEvery = () => Math.max(1, Math.floor(toValue(options.slidesToScroll) ?? 1))
  const last = () => Math.max(0, count() - 1)

  const viewport = shallowRef(0)
  const layout = computed(() => {
    const size = toValue(options.size) ?? 36
    return wheelLayout({
      count: count(),
      sizes: toValue(options.sizes),
      size: size === 'auto' ? viewport.value : size,
      gap: toValue(options.gap) ?? 0,
      align: toValue(options.align) ?? 'center',
      viewport: viewport.value,
      loop: loops(),
      containScroll: toValue(options.containScroll) === true,
      slidesToScroll: snapEvery(),
    })
  })
  // Right to left, a horizontal wheel runs the other way: its px come out mirrored.
  const dir = () => {
    const el = toValue(options.el)
    return axis() === 'x' && el && isRtl(el) ? -1 : 1
  }

  const position = shallowRef(model.value)
  const isDragging = shallowRef(false)
  // The row a fling or a goTo is heading for, so the next step starts from there.
  const heading = shallowRef(model.value)
  const index = computed(() => (count() ? wrap(Math.round(heading.value), count()) : 0))

  // Where the content is, in px at the anchor; rows are read off it.
  let px = layout.value.pxOf(model.value)
  const rowNow = () => layout.value.rowAt(px)
  // These read `position` (a ref, set before each paint) so a getter that calls them, such as a
  // `v-animate` `progress`, follows every frame.
  function offsetOf(i: number): number {
    const raw = i - position.value
    return loops() && count() ? wrap(raw + count() / 2, count()) - count() / 2 : raw
  }
  function distanceOf(i: number): number {
    void position.value
    const l = layout.value
    const raw = (l.anchor[i] ?? 0) - px
    const d = loops() && l.period ? wrap(raw + l.period / 2, l.period) - l.period / 2 : raw
    return d * dir()
  }
  const progressOf = (i: number, reach = 3) =>
    Math.min(1, Math.max(0, (offsetOf(i) + reach) / (2 * reach)))

  // Each row near the anchor gets its own `--ui-wheel-offset` (rows from it, signed) and
  // `--ui-wheel-distance` (the same in px) and reads them itself. A variable on the parent would
  // restyle every row every frame, and past a few dozen rows that is what drops frames; this
  // writes a handful of rows and renders nothing.
  let painted: number[] = []
  // Enough items either side to fill `el`, and at least 4.
  const reachRows = () => Math.max(4, Math.ceil(viewport.value / (2 * layout.value.pitch)) + 2)
  function paint() {
    const el = toValue(options.el)
    const n = count()
    if (!el || !n) return
    const reach = reachRows()
    const rows = el.children
    const row = rowNow()
    const near: number[] = []
    for (let k = Math.floor(row) - reach; k <= Math.ceil(row) + reach; k++) {
      if (!loops() && (k < 0 || k >= n)) continue
      const i = wrap(k, n)
      if (!near.includes(i)) near.push(i)
    }
    const write = (i: number, far: boolean) => {
      const node = rows[i] as HTMLElement | undefined
      if (!node) return
      let offset = offsetOf(i)
      let distance = distanceOf(i)
      if (far) {
        offset = Math.max(-reach - 1, Math.min(reach + 1, offset))
        const limit = (viewport.value || 1000) * 2
        distance = Math.max(-limit, Math.min(limit, distance))
      }
      node.style.setProperty('--ui-wheel-offset', String(offset))
      node.style.setProperty('--ui-wheel-distance', `${distance}px`)
    }
    // Rows that just left the window go to the far value once and are left alone.
    for (const i of painted) if (!near.includes(i)) write(i, true)
    for (const i of near) write(i, false)
    painted = near
  }

  // True from the first move to the moment it rests, so a jump at the start isn't mistaken for rest.
  let moving = false
  let wheelTimer = 0

  // The row it is on its way to once let go, and whether it has got there: a spring that
  // overshoots it and comes back doesn't tick the rows it brushes. null while the pointer or the
  // mouse wheel is moving it.
  let lastNearest = Math.round(model.value)
  let settleRow: number | null = null
  let arrived = false
  function tick() {
    const nearest = Math.round(rowNow())
    if (nearest === lastNearest) return
    lastNearest = nearest
    if (settleRow !== null) {
      if (arrived) return
      if (nearest === settleRow) arrived = true
    }
    if (!loops() && (nearest < 0 || nearest > last())) return
    options.onTick?.(wrap(nearest, count()))
  }
  const headFor = (row: number) => {
    settleRow = Math.round(row)
    arrived = false
  }

  // One source for the springs: the app's (or the one you name), with give for a throw.
  const springs = () => gestureSprings(toValue(options.el), toValue(options.spring))
  const spring = createSpring(px, { ...springs().settle, epsilon: EPSILON }, (value) => {
    px = value
    position.value = rowNow()
    paint()
    tick()
    if (moving && !spring.isAnimating && !isDragging.value && !wheelTimer) settled()
  })
  const tracker = createVelocityTracker()
  const clickGuard = createClickGuard()
  // `motion: false` on a ConfigProvider around it: it still follows the pointer, and goes
  // straight to where it's heading.
  const motionOff = () => {
    const el = toValue(options.el)
    return !!el && motionOffAt(el)
  }

  // The selection is the item it's heading for, from the moment that's decided (a release, a key,
  // goTo), not once the spring rests: a readout or a dot follows the choice at once.
  function select() {
    if (model.value !== index.value) model.value = index.value
  }

  function settled() {
    moving = false
    if (snaps()) heading.value = Math.round(heading.value)
    select()
    options.onSettle?.(index.value)
  }

  // Past an end the pull gives, in px.
  function soft(value: number): number {
    const l = layout.value
    if (loops()) return value
    if (value > l.hi) return l.hi + dampen(value - l.hi)
    if (value < l.lo) return l.lo - dampen(l.lo - value)
    return value
  }

  function goTo(i: number, opts: { animate?: boolean } = {}) {
    if (!count()) return
    let target = i
    if (loops()) {
      // The short way round, from where it's heading.
      const from = heading.value
      target = from + (wrap(i - from + count() / 2, count()) - count() / 2)
    } else {
      target = Math.min(last(), Math.max(0, i))
    }
    const l = layout.value
    const to = l.clamp(l.pxOf(target))
    heading.value = target
    moving = true
    headFor(target)
    select()
    // From past an end (a stretch just let go of) it comes back quickly and without a bounce.
    const pastEnd = !loops() && (px < l.lo - 0.5 || px > l.hi + 0.5)
    if (opts.animate === false || motionOff()) spring.jump(to)
    else if (prefersReducedMotion()) spring.set(to, springs().reduced)
    else spring.set(to, pastEnd ? springs().end : springs().settle)
  }
  const step = (n: number) => goTo(Math.round(heading.value) + n * snapEvery())

  // --- drag ---
  let pointerId: number | null = null
  let startPointer = 0
  let startPx = 0
  let committed = false
  // The px of the drag threshold not yet followed: the content starts under the finger, not 8 px
  // ahead of it, and catches up over the next few moves instead of jumping.
  let slack = 0
  // Screen px per px along the axis: 1 unless it or an ancestor is scaled.
  let scale = 1
  let userSelect = ''
  const along = (event: { clientX: number; clientY: number }) =>
    axis() === 'x' ? event.clientX : event.clientY

  function onPointerdown(event: PointerEvent) {
    if (toValue(options.disabled) || pointerId !== null) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerId = event.pointerId
    committed = false
    startPointer = along(event)
    // Catch it mid-flight: the pointer takes over from where the spring is.
    spring.stop()
    startPx = px
    const el = toValue(options.el)
    const rect = el?.getBoundingClientRect()
    const own = el ? (axis() === 'x' ? el.offsetWidth : el.offsetHeight) : 0
    const screen = rect ? (axis() === 'x' ? rect.width : rect.height) : 0
    scale = own && screen ? screen / own : 1
    moving = true
    settleRow = null
    tracker.reset(startPointer)
    window.addEventListener('pointermove', onPointermove)
    window.addEventListener('pointerup', onPointerup)
    window.addEventListener('pointercancel', onPointerup)
  }

  function onPointermove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    const delta = along(event) - startPointer
    if (!committed) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return
      committed = true
      slack = Math.sign(delta) * DRAG_THRESHOLD
      isDragging.value = true
      const el = toValue(options.el)
      if (el) {
        userSelect = el.style.userSelect
        el.style.userSelect = 'none'
        try {
          el.setPointerCapture(event.pointerId)
        } catch {
          // A synthetic pointer can't be captured; the window listeners still follow it.
        }
      }
    }
    tracker.add(along(event))
    // Dragging forward brings the earlier rows into view, so the position goes back.
    // The finger's screen distance, in the wheel's own px.
    slack *= 0.8
    const next = soft(startPx - ((delta - slack) / scale) * dir())
    heading.value = layout.value.rowAt(next)
    spring.jump(next)
    if (event.cancelable) event.preventDefault()
  }

  function onPointerup(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    window.removeEventListener('pointermove', onPointermove)
    window.removeEventListener('pointerup', onPointerup)
    window.removeEventListener('pointercancel', onPointerup)
    pointerId = null
    const el = toValue(options.el)
    if (el) el.style.userSelect = userSelect
    if (!committed) return
    isDragging.value = false
    clickGuard.arm()
    // A cancelled touch carries no real position: the drag's own samples are all there is.
    if (event.type === 'pointerup') tracker.add(along(event))
    // px/ms along the axis → px/s, the other way round (dragging forward is toward row 0).
    const pxPerSecond = (-tracker.velocity() * 1000 * dir()) / scale
    const l = layout.value
    const reduced = prefersReducedMotion()
    // Where it would stop if left to coast (Apple's projection), then where it rests near that.
    const coast = reduced ? 0 : (pxPerSecond / 1000) * (DECELERATION / (1 - DECELERATION))
    const to = snaps() ? l.snapNear(px + coast) : l.clamp(px + coast)
    heading.value = l.rowAt(to)
    headFor(heading.value)
    select()
    // The spring is already where the drag left it: it carries the release speed on and lands on
    // the app's spring as given (an end of a list is handled below).
    if (motionOff()) return spring.jump(to)
    // At an end of a list there is nothing past it to swing out into: it rubber-bands back with no
    // bounce, and only a little way (a throw's speed is lowered to fit).
    const atEnd = !loops() && (to <= l.lo || to >= l.hi)
    if (atEnd && !reduced) {
      const sign = to >= l.hi ? 1 : -1
      const settle = springs().end
      const speed = limitOvershoot(
        sign * (px - to),
        sign * pxPerSecond,
        settle.response ?? 0.4,
        Math.min(l.pitch * 0.5, 20),
      )
      return spring.set(to, { ...settle, velocity: sign * speed })
    }
    spring.set(to, {
      ...(reduced ? springs().reduced : springs().settle),
      velocity: reduced ? 0 : pxPerSecond,
    })
  }

  // --- mouse wheel ---
  // A wheel gesture belongs to one scroller from its first event until it goes quiet, as the
  // browser's own scrolling works: this wheel or the page, never a little of each. Its first event
  // decides: a push along the axis is ours, unless it pushes on past an end of a list that doesn't
  // loop; across the axis (a vertical scroll over a carousel), it's the page's.
  let gesture: 'wheel' | 'page' | null = null
  let gestureTimer = 0
  // The wheel is still pushing past an end and has already bounced once this gesture.
  let bounced = false
  function onWheel(event: WheelEvent) {
    if (toValue(options.disabled) || !count()) return
    if (event.ctrlKey) return // a pinch-zoom, not a scroll
    window.clearTimeout(gestureTimer)
    gestureTimer = window.setTimeout(() => {
      gesture = null
      bounced = false
    }, WHEEL_IDLE)
    const lines = event.deltaMode === 1 ? 16 : 1
    const alongDelta = axis() === 'x' ? event.deltaX : event.deltaY
    const acrossDelta = axis() === 'x' ? event.deltaY : event.deltaX
    const delta = alongDelta * lines * dir()
    const l = layout.value
    if (gesture === null) {
      const atEnd = !loops() && ((delta > 0 && px >= l.hi) || (delta < 0 && px <= l.lo))
      gesture = Math.abs(alongDelta) > Math.abs(acrossDelta) && !atEnd ? 'wheel' : 'page'
    }
    if (gesture === 'page') return
    event.preventDefault()
    // Inside its gesture, a sideways or empty event just keeps the page still.
    if (!delta) return
    const outward = !loops() && ((delta > 0 && px >= l.hi - 0.5) || (delta < 0 && px <= l.lo + 0.5))
    if (outward) {
      // At an end with the wheel still pushing (trackpad momentum): one small stretch that comes
      // straight back. Holding it out until the events stop reads as sticking, then sliding in.
      if (!bounced) {
        bounced = true
        const settle = springs().end
        const sign = delta > 0 ? 1 : -1
        const w = (2 * Math.PI) / (settle.response ?? 0.25)
        const stretch = Math.min(l.pitch * 0.3, 12)
        moving = true
        settleRow = null
        heading.value = l.rowAt(sign > 0 ? l.hi : l.lo)
        spring.set(sign > 0 ? l.hi : l.lo, { ...settle, velocity: sign * w * Math.E * stretch })
      }
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelTimer = 0
        goTo(Math.round(rowNow() / snapEvery()) * snapEvery())
      }, WHEEL_IDLE)
      return
    }
    spring.stop()
    moving = true
    settleRow = null
    // A trackpad's small deltas move it 1:1, like a finger. A mouse notch (100 or more) is eased
    // down to about a row and a half, so one click doesn't skip rows.
    const mag = Math.abs(delta)
    const eased = mag <= WHEEL_FINE ? mag : WHEEL_FINE + (mag - WHEEL_FINE) * 0.45
    // Past an end the pull stretches only a little: there is no finger, and trackpad momentum
    // would otherwise carry it a long way out into nothing.
    const stretch = Math.min(l.pitch * 0.3, 12)
    const moved = Math.sign(delta) * eased
    const next = loops()
      ? px + moved
      : Math.min(l.hi + stretch, Math.max(l.lo - stretch, soft(px + moved)))
    heading.value = l.rowAt(next)
    spring.jump(next)
    window.clearTimeout(wheelTimer)
    wheelTimer = window.setTimeout(
      () => {
        wheelTimer = 0
        goTo(snaps() ? Math.round(rowNow() / snapEvery()) * snapEvery() : rowNow())
        // Stretched past an end, it lets go sooner: waiting there reads as a stall.
      },
      !loops() && (next < l.lo - 0.5 || next > l.hi + 0.5) ? WHEEL_IDLE_STRETCHED : WHEEL_IDLE,
    )
  }

  function onKeydown(event: KeyboardEvent) {
    if (toValue(options.disabled) || event.altKey || event.ctrlKey || event.metaKey) return
    const horizontal = axis() === 'x'
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown'
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp'
    const page = Math.max(1, Math.floor(viewport.value / layout.value.pitch) || 3)
    let handled = true
    if (event.key === forward) step(dir())
    else if (event.key === back) step(-dir())
    else if (event.key === 'PageDown') step(page)
    else if (event.key === 'PageUp') step(-page)
    else if (event.key === 'Home') goTo(0)
    else if (event.key === 'End') goTo(last())
    else handled = false
    if (handled) event.preventDefault()
  }

  function onClickCapture(event: MouseEvent) {
    if (!clickGuard.consume()) return
    event.preventDefault()
    event.stopPropagation()
  }
  // The browser's own drag of an image or a link would take the gesture from us.
  const onDragstart = (event: Event) => event.preventDefault()

  const measure = (el: HTMLElement) => {
    viewport.value = axis() === 'x' ? el.clientWidth : el.clientHeight
  }

  watch(
    () => toValue(options.el),
    (el, _, onCleanup) => {
      if (!el) return
      measure(el)
      paint()
      const previous = el.style.touchAction
      // Along the axis it owns the touch; across it the page still scrolls.
      el.style.touchAction = axis() === 'x' ? 'pan-y' : 'pan-x'
      el.addEventListener('pointerdown', onPointerdown)
      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('click', onClickCapture, true)
      el.addEventListener('dragstart', onDragstart)
      const observer =
        typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure(el))
      observer?.observe(el)
      onCleanup(() => {
        el.style.touchAction = previous
        el.removeEventListener('pointerdown', onPointerdown)
        el.removeEventListener('wheel', onWheel)
        el.removeEventListener('click', onClickCapture, true)
        el.removeEventListener('dragstart', onDragstart)
        observer?.disconnect()
      })
    },
    { immediate: true, flush: 'post' },
  )

  // Rows added or removed, a resize, new sizes: it stays on its row, and the rows are placed again.
  watch(layout, () => {
    if (isDragging.value || !count()) return
    const row = Math.min(last(), Math.max(0, Math.round(heading.value)))
    if (!loops() && row !== Math.round(heading.value)) heading.value = row
    const to = layout.value.pxOf(heading.value)
    // Mid-flight it carries on to the same slide at its new place; at rest it moves there at once.
    if (moving) {
      spring.set(to, prefersReducedMotion() ? springs().reduced : springs().settle)
      return
    }
    spring.jump(to)
    lastNearest = Math.round(rowNow())
  })

  // The model moving from outside (a form reset, a "today" button) takes it there.
  watch(model, (value) => {
    if (value !== index.value) goTo(value)
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      spring.destroy()
      window.clearTimeout(wheelTimer)
      window.clearTimeout(gestureTimer)
      clickGuard.disarm()
      window.removeEventListener('pointermove', onPointermove)
      window.removeEventListener('pointerup', onPointerup)
      window.removeEventListener('pointercancel', onPointerup)
    })
  }

  return {
    position,
    index,
    isDragging,
    goTo,
    step,
    progressOf,
    onKeydown,
  }
}
