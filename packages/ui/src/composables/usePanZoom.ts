import { computed, getCurrentScope, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { motionOffAt } from '../motion/styleHolder'
import { createSpring } from '../motion/useSpringValue'
import type { SpringName } from '../motion/springNames'
import type { Spring } from '../motion/types'
import { createClickGuard, prefersReducedMotion } from './dom'
import type { ElRef } from './dom'
import {
  createVelocityTracker,
  dampen,
  DRAG_THRESHOLD,
  gestureSprings,
  limitOvershoot,
} from './gesture'

// Pan, pinch and zoom for a piece of content bigger (or smaller) than the box it sits in: an image,
// a map, a diagram. It moves `translate` and `scale` of the content (from its top left corner), so
// nothing else is restyled and a frame renders nothing.

/** Apple's scroll deceleration: where a pan would stop if nothing caught it. */
const DECELERATION = 0.998
/** A second tap this soon after the first, and this near (px), is a double tap. */
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_PX = 30
/** A press that moves less than this (px) and ends within this long (ms) is a tap. */
const TAP_PX = 10
const TAP_MS = 250
/** Zoom per px of a mouse wheel's delta while ctrl is held (a trackpad pinch sends it too). */
const WHEEL_ZOOM = 0.01
const EPSILON = 0.05

export interface UsePanZoomOptions {
  /** The box you pan and zoom in. It receives the pointer, the wheel and the focus. */
  el: ElRef<HTMLElement | null>
  /** What moves. Default: the first child of `el`. */
  content?: ElRef<HTMLElement | null>
  /** The smallest scale. Default `1`: the content at its own size. */
  minScale?: MaybeRefOrGetter<number>
  /** The largest scale. Default `4`. */
  maxScale?: MaybeRefOrGetter<number>
  /** The scale a double tap zooms to, from the smallest. Default `2`. */
  doubleTapScale?: MaybeRefOrGetter<number>
  disabled?: MaybeRefOrGetter<boolean>
  /**
   * The spring it settles on: a name or `{ damping, response }`. Default: the ConfigProvider's
   * `spring`, else the default every component uses.
   */
  spring?: MaybeRefOrGetter<Spring | SpringName | undefined>
}

export interface UsePanZoomReturn {
  /** Where the content's top left is, in px from where it sits at rest, live. */
  x: Ref<number>
  y: Ref<number>
  /** How big the content is, live: 1 is its own size. */
  scale: Ref<number>
  /** Whether a pointer is panning or pinching. */
  isDragging: Ref<boolean>
  /** Whether it is zoomed in past the smallest scale. */
  isZoomed: ComputedRef<boolean>
  /** Zooms to `scale`, around `at` (px in `el`, default its centre). */
  zoomTo: (scale: number, options?: { at?: { x: number; y: number }; animate?: boolean }) => void
  /** Zooms by a factor from where it is: `1.5` in, `1 / 1.5` out. */
  zoomBy: (factor: number, options?: { at?: { x: number; y: number }; animate?: boolean }) => void
  /** Moves by `by` px, kept inside the content. */
  panBy: (by: { x: number; y: number }, options?: { animate?: boolean }) => void
  /** Back to the smallest scale, centred. */
  reset: (options?: { animate?: boolean }) => void
  /** `+`, `-`, `0` and the arrow keys. Bind it to `@keydown` on `el`. */
  onKeydown: (event: KeyboardEvent) => void
}

interface Pt {
  x: number
  y: number
}

export function usePanZoom(options: UsePanZoomOptions): UsePanZoomReturn {
  const minScale = () => Math.max(0.01, toValue(options.minScale) ?? 1)
  const maxScale = () => Math.max(minScale(), toValue(options.maxScale) ?? 4)
  const x = shallowRef(0)
  const y = shallowRef(0)
  const scale = shallowRef(1)
  const isDragging = shallowRef(false)
  const isZoomed = computed(() => scale.value > minScale() + 0.01)

  const springs = () => gestureSprings(toValue(options.el), toValue(options.spring))
  const contentEl = () => toValue(options.content) ?? toValue(options.el)?.firstElementChild ?? null

  // Written straight to the content, so a frame renders nothing.
  const write = () => {
    const el = contentEl() as HTMLElement | null
    if (!el) return
    el.style.translate = x.value || y.value ? `${x.value}px ${y.value}px` : ''
    el.style.scale = scale.value === 1 ? '' : String(scale.value)
  }
  // One spring each, all on the same dynamics, so with no speed to start they cover the same share
  // of their distances at every moment: a zoom keeps the point under the finger fixed as it goes.
  const make = (set: (v: number) => void) =>
    createSpring(0, { ...springs().settle, epsilon: EPSILON }, (v) => {
      set(v)
      write()
    })
  const sx = make((v) => (x.value = v))
  const sy = make((v) => (y.value = v))
  const ss = make((v) => (scale.value = v))
  ss.jump(1)

  const clickGuard = createClickGuard()
  const trackX = createVelocityTracker()
  const trackY = createVelocityTracker()

  // --- geometry ---
  // What the box and the content measure now, and where the content sits in the box at rest.
  let box = { w: 0, h: 0 }
  let size = { w: 0, h: 0 }
  let base = { x: 0, y: 0 }
  function measure() {
    const el = toValue(options.el)
    const content = contentEl() as HTMLElement | null
    if (!el || !content) return
    box = { w: el.clientWidth, h: el.clientHeight }
    // Its own size and its place in the box, without the move and scale we put on it (scaled from
    // its top left, so they only shift where it is). Measured, so an SVG works as well as a div.
    const e = el.getBoundingClientRect()
    const c = content.getBoundingClientRect()
    size = { w: c.width / scale.value, h: c.height / scale.value }
    base = {
      x: c.left - e.left - el.clientLeft - x.value,
      y: c.top - e.top - el.clientTop - y.value,
    }
  }
  // The range the content's translate may take at scale `s`: inside the box when it is bigger,
  // centred when it is smaller.
  function range(s: number) {
    const along = (boxLen: number, len: number, at: number) => {
      const shown = len * s
      if (shown <= boxLen) {
        const centre = (boxLen - shown) / 2 - at
        return { lo: centre, hi: centre }
      }
      return { lo: boxLen - shown - at, hi: -at }
    }
    return { x: along(box.w, size.w, base.x), y: along(box.h, size.h, base.y) }
  }
  const overflows = (s: number) => ({ x: size.w * s > box.w + 0.5, y: size.h * s > box.h + 0.5 })
  const clamp = (v: number, r: { lo: number; hi: number }) => Math.min(r.hi, Math.max(r.lo, v))
  // Past an edge it gives, as a rubber band does.
  const soft = (v: number, r: { lo: number; hi: number }) =>
    v > r.hi ? r.hi + dampen(v - r.hi) : v < r.lo ? r.lo - dampen(r.lo - v) : v
  // The same for the scale, past the smallest or largest: a ratio, so it gives by shares.
  const softScale = (s: number) => {
    const lo = minScale()
    const hi = maxScale()
    return s > hi
      ? hi * (1 + dampen(s / hi - 1, 0.15))
      : s < lo
        ? lo / (1 + dampen(lo / s - 1, 0.15))
        : s
  }
  // The translate that keeps the content point under `at` (px in the box) where it is, at scale `s`.
  const translateFor = (s: number, at: Pt, from = { x: x.value, y: y.value, s: scale.value }) => ({
    x: at.x - base.x - (at.x - base.x - from.x) * (s / from.s),
    y: at.y - base.y - (at.y - base.y - from.y) * (s / from.s),
  })
  const clampScale = (s: number) => Math.min(maxScale(), Math.max(minScale(), s))
  const centre = (): Pt => ({ x: box.w / 2, y: box.h / 2 })
  const within = (event: { clientX: number; clientY: number }): Pt => {
    const el = toValue(options.el)!
    const r = el.getBoundingClientRect()
    return { x: event.clientX - r.left - el.clientLeft, y: event.clientY - r.top - el.clientTop }
  }

  // --- moving ---
  const reduced = () => prefersReducedMotion()
  const off = () => {
    const el = toValue(options.el)
    return !!el && motionOffAt(el)
  }
  /** Sends all three to `to`, springing unless told not to (or motion is off). */
  function go(to: { x: number; y: number; s: number }, animate = true, spring?: Spring, v?: Pt) {
    if (!animate || off()) {
      sx.jump(to.x)
      sy.jump(to.y)
      ss.jump(to.s)
      return
    }
    const given = reduced() ? springs().reduced : (spring ?? springs().settle)
    sx.set(to.x, { ...given, velocity: reduced() ? 0 : (v?.x ?? 0) })
    sy.set(to.y, { ...given, velocity: reduced() ? 0 : (v?.y ?? 0) })
    ss.set(to.s, { ...given, velocity: 0 })
  }

  function zoomTo(target: number, opts: { at?: Pt; animate?: boolean } = {}) {
    measure()
    const s = Math.min(maxScale(), Math.max(minScale(), target))
    const at = opts.at ?? centre()
    const t = translateFor(s, at)
    const r = range(s)
    go({ x: clamp(t.x, r.x), y: clamp(t.y, r.y), s }, opts.animate)
  }
  const zoomBy: UsePanZoomReturn['zoomBy'] = (factor, opts) => zoomTo(ss.target * factor, opts)
  function panBy(by: Pt, opts: { animate?: boolean } = {}) {
    measure()
    const r = range(ss.target)
    const o = overflows(ss.target)
    go(
      {
        x: o.x ? clamp(sx.target + by.x, r.x) : sx.target,
        y: o.y ? clamp(sy.target + by.y, r.y) : sy.target,
        s: ss.target,
      },
      opts.animate,
    )
  }
  function reset(opts: { animate?: boolean } = {}) {
    measure()
    const s = minScale()
    const r = range(s)
    go({ x: clamp(0, r.x), y: clamp(0, r.y), s }, opts.animate)
  }

  // --- pointers ---
  const pointers = new Map<number, Pt>()
  let mode: 'none' | 'pan' | 'pinch' = 'none'
  let committed = false
  // A pinch happened in this gesture: no coasting from the pan that follows it.
  let pinched = false
  // Where it all was when the gesture began, for Escape.
  let started = { x: 0, y: 0, s: 1 }
  let pressAt = { t: 0, x: 0, y: 0 }
  let lastTap = { t: 0, x: 0, y: 0 }
  let userSelect = ''
  // Pan: where the pointer and the content were when it began, and the threshold not yet followed.
  let panFrom = { px: 0, py: 0, tx: 0, ty: 0 }
  let slack = { x: 0, y: 0 }
  // Pinch: the two fingers' distance, centre and the content's place when it began.
  let pinchFrom = { dist: 1, mid: { x: 0, y: 0 }, tx: 0, ty: 0, s: 1 }
  let lastMid: Pt = { x: 0, y: 0 }

  function beginPan(p: Pt) {
    panFrom = { px: p.x, py: p.y, tx: x.value, ty: y.value }
    trackX.reset(x.value)
    trackY.reset(y.value)
  }
  function beginPinch() {
    const [a, b] = [...pointers.values()] as [Pt, Pt]
    const mid = within({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
    pinchFrom = {
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mid,
      tx: x.value,
      ty: y.value,
      s: scale.value,
    }
    lastMid = mid
  }

  function onPointerdown(event: PointerEvent) {
    if (toValue(options.disabled)) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    measure()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    // Caught mid-flight: the fingers take over from where the springs are.
    sx.stop()
    sy.stop()
    ss.stop()
    if (pointers.size === 1) {
      pressAt = { t: performance.now(), x: event.clientX, y: event.clientY }
      committed = false
      pinched = false
      mode = 'none'
      started = { x: x.value, y: y.value, s: scale.value }
      window.addEventListener('pointermove', onPointermove)
      window.addEventListener('pointerup', onPointerup)
      window.addEventListener('pointercancel', onPointerup)
      window.addEventListener('keydown', onEscape, true)
      beginPan({ x: event.clientX, y: event.clientY })
    } else if (pointers.size === 2) {
      // A second finger: a pinch, at once.
      mode = 'pinch'
      pinched = true
      grab(event)
      beginPinch()
    }
  }

  function grab(event: PointerEvent) {
    if (committed) return
    committed = true
    isDragging.value = true
    const el = toValue(options.el)
    if (el) {
      userSelect = el.style.userSelect
      el.style.userSelect = 'none'
    }
    try {
      toValue(options.el)?.setPointerCapture(event.pointerId)
    } catch {
      // A synthetic pointer can't be captured; the window listeners still follow it.
    }
  }

  function onPointermove(event: PointerEvent) {
    const known = pointers.get(event.pointerId)
    if (!known) return
    known.x = event.clientX
    known.y = event.clientY
    if (mode === 'pinch' && pointers.size >= 2) return pinch(event)
    if (pointers.size !== 1) return
    const dx = event.clientX - panFrom.px
    const dy = event.clientY - panFrom.py
    if (!committed) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      const o = overflows(scale.value)
      // Nothing to pan at this size: the press stays a click, or becomes a pinch.
      if (!o.x && !o.y) return
      mode = 'pan'
      slack = { x: Math.sign(dx) * DRAG_THRESHOLD, y: Math.sign(dy) * DRAG_THRESHOLD }
      grab(event)
    }
    if (mode !== 'pan') return
    slack = { x: slack.x * 0.8, y: slack.y * 0.8 }
    const r = range(scale.value)
    const o = overflows(scale.value)
    if (o.x) sx.jump(soft(panFrom.tx + dx - slack.x, r.x))
    if (o.y) sy.jump(soft(panFrom.ty + dy - slack.y, r.y))
    trackX.add(x.value)
    trackY.add(y.value)
    if (event.cancelable) event.preventDefault()
  }

  function pinch(event: PointerEvent) {
    const [a, b] = [...pointers.values()] as [Pt, Pt]
    const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
    const mid = within({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
    const s = softScale((pinchFrom.s * dist) / pinchFrom.dist)
    // The content point that was under the fingers' centre stays under it as they move.
    const t = translateFor(s, pinchFrom.mid, { x: pinchFrom.tx, y: pinchFrom.ty, s: pinchFrom.s })
    const shift = { x: mid.x - pinchFrom.mid.x, y: mid.y - pinchFrom.mid.y }
    const r = range(s)
    ss.jump(s)
    sx.jump(soft(t.x + shift.x, r.x))
    sy.jump(soft(t.y + shift.y, r.y))
    lastMid = mid
    if (event.cancelable) event.preventDefault()
  }

  function onPointerup(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    pointers.delete(event.pointerId)
    if (mode === 'pinch' && pointers.size >= 1) {
      // One finger left: it carries on as a pan from where it is.
      const [left] = [...pointers.values()] as [Pt]
      beginPan(left)
      mode = 'pan'
      slack = { x: 0, y: 0 }
      return
    }
    if (pointers.size > 0) return
    stopListening()
    if (!committed) return tap(event)
    isDragging.value = false
    clickGuard.arm()
    // A cancelled touch carries no real position: the drag's own samples are all there is.
    release(event.type === 'pointerup')
  }

  function stopListening() {
    window.removeEventListener('pointermove', onPointermove)
    window.removeEventListener('pointerup', onPointerup)
    window.removeEventListener('pointercancel', onPointerup)
    window.removeEventListener('keydown', onEscape, true)
    const el = toValue(options.el)
    if (el && committed) el.style.userSelect = userSelect
    mode = 'none'
  }

  // Where it settles once let go: inside the content and the scale limits, carrying a pan's speed.
  function release(withSpeed: boolean) {
    const s = clampScale(scale.value)
    const rescaled = Math.abs(s - scale.value) > 0.001
    const r = range(s)
    const o = overflows(s)
    // The scale gives back around the fingers' centre, so the point under them stays put.
    const at = rescaled ? translateFor(s, lastMid) : { x: x.value, y: y.value }
    const v = {
      x: !pinched && withSpeed && o.x ? trackX.velocity() * 1000 : 0,
      y: !pinched && withSpeed && o.y ? trackY.velocity() * 1000 : 0,
    }
    // Where a pan would stop if left to coast (Apple's projection), then kept inside the content.
    const coast = DECELERATION / (1 - DECELERATION) / 1000
    const reach = { x: at.x + v.x * coast, y: at.y + v.y * coast }
    const to = { x: clamp(reach.x, r.x), y: clamp(reach.y, r.y), s }
    if (off()) return go(to, false)
    if (reduced()) return go(to, true)
    const { end, settle } = springs()
    // Meeting an edge it stops there without a bounce, and swings out only a little.
    const arrive = (axis: 'x' | 'y') => {
      if (reach[axis] === to[axis]) return { spring: settle, speed: v[axis] }
      const sign = reach[axis] > to[axis] ? 1 : -1
      const past = sign * ((axis === 'x' ? x.value : y.value) - to[axis])
      const limited = limitOvershoot(past, sign * v[axis], end.response ?? 0.25, 14)
      return { spring: end, speed: sign * limited }
    }
    const ax = arrive('x')
    const ay = arrive('y')
    sx.set(to.x, { ...ax.spring, velocity: ax.speed })
    sy.set(to.y, { ...ay.spring, velocity: ay.speed })
    ss.set(to.s, { ...settle, velocity: 0 })
  }

  // A tap, and a second soon after it: zoom in around it, or back out.
  function tap(event: PointerEvent) {
    const quick = performance.now() - pressAt.t < TAP_MS
    const still = Math.hypot(event.clientX - pressAt.x, event.clientY - pressAt.y) < TAP_PX
    if (event.type !== 'pointerup' || !quick || !still) return
    const now = performance.now()
    const near =
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < DOUBLE_TAP_PX &&
      now - lastTap.t < DOUBLE_TAP_MS
    if (!near) {
      lastTap = { t: now, x: event.clientX, y: event.clientY }
      return
    }
    lastTap = { t: 0, x: 0, y: 0 }
    const zoomedIn = ss.target > minScale() * 1.05
    zoomTo(zoomedIn ? minScale() : (toValue(options.doubleTapScale) ?? 2), {
      at: within(event),
    })
  }

  // Escape mid-gesture puts it back where the gesture began.
  function onEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !committed) return
    event.preventDefault()
    event.stopPropagation()
    pointers.clear()
    stopListening()
    isDragging.value = false
    clickGuard.arm()
    go(started, true)
  }

  // --- the wheel and the keys ---
  function onWheel(event: WheelEvent) {
    if (toValue(options.disabled)) return
    // Ctrl and the wheel is a zoom (a trackpad pinch sends it too). A plain scroll is the page's.
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    measure()
    sx.stop()
    sy.stop()
    ss.stop()
    const lines = event.deltaMode === 1 ? 16 : 1
    const s = clampScale(scale.value * Math.exp(-event.deltaY * lines * WHEEL_ZOOM))
    const t = translateFor(s, within(event))
    const r = range(s)
    ss.jump(s)
    sx.jump(clamp(t.x, r.x))
    sy.jump(clamp(t.y, r.y))
  }

  function onKeydown(event: KeyboardEvent) {
    if (toValue(options.disabled) || event.altKey || event.ctrlKey || event.metaKey) return
    const step = 60
    let handled = true
    if (event.key === '+' || event.key === '=') zoomBy(1.5)
    else if (event.key === '-') zoomBy(1 / 1.5)
    else if (event.key === '0') reset()
    else if (event.key === 'ArrowLeft') panBy({ x: step, y: 0 })
    else if (event.key === 'ArrowRight') panBy({ x: -step, y: 0 })
    else if (event.key === 'ArrowUp') panBy({ x: 0, y: step })
    else if (event.key === 'ArrowDown') panBy({ x: 0, y: -step })
    else handled = false
    if (handled) event.preventDefault()
  }

  function onClickCapture(event: MouseEvent) {
    if (!clickGuard.consume()) return
    event.preventDefault()
    event.stopPropagation()
  }
  const onDragstart = (event: Event) => event.preventDefault()
  // Safari sends a trackpad pinch as gesture events, not as ctrl and the wheel, and would zoom the
  // page with them: the content is zoomed instead, around the point the pinch is over. A touch pinch
  // that reaches us as two pointers is already handled above.
  type PinchEvent = Event & { scale?: number; clientX?: number; clientY?: number }
  let pinchOf: { s: number; tx: number; ty: number; at: Pt } | null = null
  function onGesturestart(event: Event) {
    event.preventDefault()
    if (toValue(options.disabled) || pointers.size >= 2) return
    measure()
    sx.stop()
    sy.stop()
    ss.stop()
    const e = event as PinchEvent
    const at =
      Number.isFinite(e.clientX) && Number.isFinite(e.clientY)
        ? within({ clientX: e.clientX!, clientY: e.clientY! })
        : centre()
    pinchOf = { s: scale.value, tx: x.value, ty: y.value, at }
  }
  function onGesturechange(event: Event) {
    event.preventDefault()
    const from = pinchOf
    if (!from || toValue(options.disabled)) return
    const s = softScale(from.s * ((event as PinchEvent).scale ?? 1))
    const t = translateFor(s, from.at, { x: from.tx, y: from.ty, s: from.s })
    const r = range(s)
    ss.jump(s)
    sx.jump(soft(t.x, r.x))
    sy.jump(soft(t.y, r.y))
  }
  function onGestureend(event: Event) {
    event.preventDefault()
    const from = pinchOf
    pinchOf = null
    if (!from) return
    // Past the smallest or largest it gave: back inside, around the same point.
    const s = clampScale(scale.value)
    const t = translateFor(s, from.at)
    const r = range(s)
    go({ x: clamp(t.x, r.x), y: clamp(t.y, r.y), s })
  }

  watch(
    () => toValue(options.el),
    (el, _, onCleanup) => {
      if (!el) return
      const previous = el.style.touchAction
      el.style.touchAction = 'none'
      const content = contentEl() as HTMLElement | null
      if (content) content.style.transformOrigin = '0 0'
      el.addEventListener('pointerdown', onPointerdown)
      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('click', onClickCapture, true)
      el.addEventListener('dragstart', onDragstart)
      el.addEventListener('gesturestart', onGesturestart)
      el.addEventListener('gesturechange', onGesturechange)
      el.addEventListener('gestureend', onGestureend)
      // A real resize keeps it inside the content: a spring still moving is retargeted, not cut.
      const observer =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(() => {
              if (isDragging.value) return
              const was = box
              measure()
              if (was.w === box.w && was.h === box.h) return
              const r = range(ss.target)
              const keep = (spring: typeof sx, v: number) =>
                spring.isAnimating ? spring.set(v) : spring.jump(v)
              keep(sx, clamp(sx.target, r.x))
              keep(sy, clamp(sy.target, r.y))
            })
      measure()
      observer?.observe(el)
      onCleanup(() => {
        el.style.touchAction = previous
        el.removeEventListener('pointerdown', onPointerdown)
        el.removeEventListener('wheel', onWheel)
        el.removeEventListener('click', onClickCapture, true)
        el.removeEventListener('dragstart', onDragstart)
        el.removeEventListener('gesturestart', onGesturestart)
        el.removeEventListener('gesturechange', onGesturechange)
        el.removeEventListener('gestureend', onGestureend)
        observer?.disconnect()
        if (content) {
          content.style.translate = ''
          content.style.scale = ''
          content.style.transformOrigin = ''
        }
      })
    },
    { immediate: true, flush: 'post' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      sx.destroy()
      sy.destroy()
      ss.destroy()
      clickGuard.disarm()
      stopListening()
    })
  }

  return { x, y, scale, isDragging, isZoomed, zoomTo, zoomBy, panBy, reset, onKeydown }
}
