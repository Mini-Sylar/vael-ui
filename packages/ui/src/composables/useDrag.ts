import { getCurrentScope, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { motionOffAt } from '../motion/styleHolder'
import { publishSpeed } from '../motion/velocity'
import { createSpring } from '../motion/useSpringValue'
import type { SpringName } from '../motion/springNames'
import type { Spring } from '../motion/types'
import { createClickGuard, prefersReducedMotion } from './dom'
import type { ElRef } from './dom'
import {
  createVelocityTracker,
  DRAG_THRESHOLD,
  gestureSprings,
  screenPerTranslate,
} from './gesture'

// A drag that decides on release: the element follows the pointer 1:1, and when it lets go you
// say where it goes (thrown out, snapped somewhere, or back home) and it gets there on a spring
// that keeps the throw's speed. A card deck, a swipe to dismiss, a sheet.

/** Apple's scroll deceleration: where a throw would come to rest if nothing caught it. */
const DECELERATION = 0.998
const EPSILON = 0.5

export interface DragPoint {
  x: number
  y: number
}

export interface DragRelease {
  /** Where it is, px from home. */
  offset: DragPoint
  /** How fast it was going when let go, px per second. */
  velocity: DragPoint
  /** Where it would come to rest if it coasted on (Apple's projection), px from home. */
  projected: DragPoint
}

export interface UseDragOptions {
  /** The element you drag. It moves by its own `translate`, so nothing else is restyled. */
  el: ElRef<HTMLElement | null>
  /** `'x'` or `'y'` to move along one axis only. Default both. */
  axis?: MaybeRefOrGetter<'x' | 'y' | 'both'>
  /** Ignores the pointer: for a drag that only applies some of the time. */
  disabled?: MaybeRefOrGetter<boolean>
  /**
   * The spring it settles on: a name or `{ damping, response }`. Unset, the nearest
   * ConfigProvider's `spring`, else the default every component uses. A hand's release gets a little give, reduced motion none.
   */
  spring?: MaybeRefOrGetter<Spring | SpringName | undefined>
  /**
   * Runs when it's let go. Return where it goes, px from home (thrown out of view, say), or
   * nothing for home. Escape during a drag, or a cancelled touch, goes home without asking.
   */
  onRelease?: (release: DragRelease) => DragPoint | null | void
  /** Runs once it comes to rest, at `offset`: remove a thrown card here. */
  onRest?: (offset: DragPoint) => void
}

export interface UseDragReturn {
  /**
   * px from home, live. Link a look to them with a `v-animate` `progress` getter (`() => drag.x.value`
   * mapped to 0 to 1): it follows every frame without re-rendering.
   */
  x: Ref<number>
  y: Ref<number>
  isDragging: Ref<boolean>
  /** Sends it to `to` (px from home) on a spring, as if thrown: a button doing the swipe. */
  throwTo: (to: DragPoint, options?: { velocity?: DragPoint }) => void
  /** Back home on a spring, or at once with `animate: false`. */
  reset: (options?: { animate?: boolean }) => void
}

export function useDrag(options: UseDragOptions): UseDragReturn {
  const axis = () => toValue(options.axis) ?? 'both'
  const x = shallowRef(0)
  const y = shallowRef(0)
  const isDragging = shallowRef(false)

  // One source for the springs: the app's (or the one you name), with give for a hand's release.
  const springs = () => gestureSprings(toValue(options.el), toValue(options.spring))
  // Each axis is its own spring, so a throw up and to the side keeps both speeds.
  let moving = false
  const frame = () => {
    const el = toValue(options.el)
    if (el) el.style.translate = x.value || y.value ? `${x.value}px ${y.value}px` : ''
    if (moving && !sx.isAnimating && !sy.isAnimating && !isDragging.value) {
      moving = false
      options.onRest?.({ x: x.value, y: y.value })
    }
  }
  const sx = createSpring(0, { ...springs().settle, epsilon: EPSILON }, (v) => {
    x.value = v
    frame()
  })
  const sy = createSpring(0, { ...springs().settle, epsilon: EPSILON }, (v) => {
    y.value = v
    frame()
  })
  const trackX = createVelocityTracker()
  const trackY = createVelocityTracker()
  const clickGuard = createClickGuard()

  // `thrown`: a hand let go of it, so a return home may bounce.
  function go(to: DragPoint, velocity: DragPoint, thrown = false) {
    // `motion: false` on a ConfigProvider around it: there at once, and at rest.
    const el = toValue(options.el)
    if (el && motionOffAt(el)) {
      place(to)
      moving = true
      return frame()
    }
    const reduced = prefersReducedMotion()
    const all = springs()
    const spring = reduced
      ? all.reduced
      : thrown && to.x === 0 && to.y === 0
        ? all.home
        : all.settle
    moving = true
    sx.set(to.x, { ...spring, velocity: reduced ? 0 : velocity.x })
    sy.set(to.y, { ...spring, velocity: reduced ? 0 : velocity.y })
  }
  function place(to: DragPoint) {
    moving = false
    sx.jump(to.x)
    sy.jump(to.y)
  }
  const throwTo: UseDragReturn['throwTo'] = (to, opts = {}) =>
    go(to, opts.velocity ?? { x: 0, y: 0 })
  const reset: UseDragReturn['reset'] = (opts = {}) =>
    opts.animate === false ? place({ x: 0, y: 0 }) : go({ x: 0, y: 0 }, { x: 0, y: 0 })

  // --- drag ---
  let pointerId: number | null = null
  let start = { x: 0, y: 0 }
  let from = { x: 0, y: 0 }
  let committed = false
  // The px of the drag threshold not yet followed: it starts under the finger, not ahead of it, and
  // catches up over the next few moves instead of jumping.
  let slack = { x: 0, y: 0 }
  // Screen px per px of translate: 1 unless an ancestor is scaled.
  let unit = { x: 1, y: 1 }
  let userSelect = ''

  function onPointerdown(event: PointerEvent) {
    if (toValue(options.disabled) || pointerId !== null) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerId = event.pointerId
    committed = false
    start = { x: event.clientX, y: event.clientY }
    // Catch it mid-flight: the pointer takes over from where the springs are.
    sx.stop()
    sy.stop()
    from = { x: x.value, y: y.value }
    const el = toValue(options.el)
    unit = el ? screenPerTranslate(el) : { x: 1, y: 1 }
    trackX.reset(event.clientX)
    trackY.reset(event.clientY)
    window.addEventListener('pointermove', onPointermove)
    window.addEventListener('pointerup', onPointerup)
    window.addEventListener('pointercancel', onPointerup)
    window.addEventListener('keydown', onKeydown, true)
  }

  function stopListening() {
    window.removeEventListener('pointermove', onPointermove)
    window.removeEventListener('pointerup', onPointerup)
    window.removeEventListener('pointercancel', onPointerup)
    window.removeEventListener('keydown', onKeydown, true)
    pointerId = null
    const el = toValue(options.el)
    if (el && committed) el.style.userSelect = userSelect
  }

  function onPointermove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!committed) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      const along = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
      // One axis only, and the drag started across it: that's the page's scroll, not ours.
      if (axis() !== 'both' && along !== axis()) {
        stopListening()
        return
      }
      committed = true
      slack = { x: Math.sign(dx) * DRAG_THRESHOLD, y: Math.sign(dy) * DRAG_THRESHOLD }
      isDragging.value = true
      moving = true
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
    trackX.add(event.clientX)
    trackY.add(event.clientY)
    // The finger's screen distance, in the element's own px (an ancestor may scale them).
    slack = { x: slack.x * 0.8, y: slack.y * 0.8 }
    if (axis() !== 'y') sx.jump(from.x + (dx - slack.x) / unit.x)
    if (axis() !== 'x') sy.jump(from.y + (dy - slack.y) / unit.y)
    if (event.cancelable) event.preventDefault()
  }

  function onPointerup(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    const wasCommitted = committed
    stopListening()
    if (!wasCommitted) return
    isDragging.value = false
    clickGuard.arm()
    // A cancelled touch goes home: there's no telling what the hand meant.
    if (event.type !== 'pointerup') return go({ x: 0, y: 0 }, { x: 0, y: 0 })
    trackX.add(event.clientX)
    trackY.add(event.clientY)
    const velocity = {
      x: axis() !== 'y' ? (trackX.velocity() * 1000) / unit.x : 0,
      y: axis() !== 'x' ? (trackY.velocity() * 1000) / unit.y : 0,
    }
    const coast = DECELERATION / (1 - DECELERATION) / 1000
    const offset = { x: x.value, y: y.value }
    const projected = { x: offset.x + velocity.x * coast, y: offset.y + velocity.y * coast }
    const to = options.onRelease?.({ offset, velocity, projected }) ?? { x: 0, y: 0 }
    go(to, velocity, true)
  }

  // Escape mid-drag puts it back and stops the drag, without closing a dialog around it.
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !committed) return
    event.preventDefault()
    event.stopPropagation()
    stopListening()
    isDragging.value = false
    clickGuard.arm()
    go({ x: 0, y: 0 }, { x: 0, y: 0 })
  }

  function onClickCapture(event: MouseEvent) {
    if (!clickGuard.consume()) return
    event.preventDefault()
    event.stopPropagation()
  }
  const onDragstart = (event: Event) => event.preventDefault()

  watch(
    () => toValue(options.el),
    (el, _, onCleanup) => {
      if (!el) return
      // A new element (the next card) starts at home.
      moving = false
      sx.jump(0)
      sy.jump(0)
      const previous = el.style.touchAction
      // Along a free axis the drag owns the touch; across a single axis the page still scrolls.
      el.style.touchAction = axis() === 'x' ? 'pan-y' : axis() === 'y' ? 'pan-x' : 'none'
      el.addEventListener('pointerdown', onPointerdown)
      el.addEventListener('click', onClickCapture, true)
      el.addEventListener('dragstart', onDragstart)
      // How fast it's moving, for a `v-animate` exit that takes over: a thrown card keeps going.
      const unpublish = publishSpeed(el, () =>
        isDragging.value
          ? { x: (trackX.velocity() * 1000) / unit.x, y: (trackY.velocity() * 1000) / unit.y }
          : { x: sx.velocity, y: sy.velocity },
      )
      onCleanup(() => {
        unpublish()
        el.style.touchAction = previous
        el.style.translate = ''
        el.removeEventListener('pointerdown', onPointerdown)
        el.removeEventListener('click', onClickCapture, true)
        el.removeEventListener('dragstart', onDragstart)
      })
    },
    { immediate: true, flush: 'post' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      sx.destroy()
      sy.destroy()
      clickGuard.disarm()
      stopListening()
    })
  }

  return { x, y, isDragging, throwTo, reset }
}
