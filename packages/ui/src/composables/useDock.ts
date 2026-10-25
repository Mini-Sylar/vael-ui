import { onMounted, onScopeDispose, nextTick, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { ssrWindow } from '../ssr'
import type { ElRef } from './dom'
import { prefersReducedMotion } from './dom'
import { stepSpring } from '../motion/springStep'

export type DockOrientation = 'horizontal' | 'vertical'

export interface UseDockOptions {
  orientation?: MaybeRefOrGetter<DockOrientation>
  /** Resting icon size, in px. */
  baseSize?: MaybeRefOrGetter<number>
  /** Icon size, in px, directly under the pointer (distance 0). */
  maxSize?: MaybeRefOrGetter<number>
  /** Distance (px, along the dock's main axis) at which the magnification has fully tapered back to `baseSize` — the falloff's "radius". Defaults to 3.5x `baseSize`, landing neighbor falloff around the 3-4 icon mark a real dock reads as (see `dockFalloff` below). */
  range?: MaybeRefOrGetter<number | undefined>
  disabled?: MaybeRefOrGetter<boolean>
  /** `false` turns off the pointer-proximity size effect entirely — the dock stays fully interactive (click, keyboard nav, tooltips), items just never grow. Distinct from `disabled`, which also blocks interaction outright; this only opts out of the one visual effect. */
  magnify?: MaybeRefOrGetter<boolean>
  /** `true` magnifies by changing each item's real size, so the dock grows with its items. Default `false` scales and spreads items with transforms: the dock keeps its size and the end items can reach past it. */
  grow?: MaybeRefOrGetter<boolean>
  /** A spring for items to chase the pointer on, overshoot included. Unset, they ease in without one. */
  spring?: MaybeRefOrGetter<{ damping?: number; response?: number } | undefined>
}

export interface UseDockReturn {
  /** Bind as `:ref="setItemEl(index)"` on each item's own root element. */
  setItemEl: (index: number) => (el: unknown) => void
  /** Bind to the root's `pointerdown`: a finger or pen magnifies only once it has slid from here. */
  onPointerDown: (event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  /** Bind to the root's `pointerleave`, `pointerup` and `pointercancel`. */
  onPointerLeave: (event?: PointerEvent) => void
  /** Whether the finger or pen that is down has slid far enough to magnify; false means a tap. */
  touchSlid: () => boolean
  /** Re-measures each item's resting center. Called automatically on mount, on root resize, and when `itemCount` changes — exposed for a consumer that mutates layout some other way (e.g. a font swap mid-session). */
  remeasure: () => void
}

export interface DockFalloffOptions {
  baseSize: number
  maxSize: number
  range: number
}

// Raised-cosine falloff: C1-continuous, spring-like.
export function dockFalloff(distance: number, range: number): number {
  if (range <= 0) return 0
  const clamped = Math.min(Math.abs(distance), range)
  return (Math.cos((clamped / range) * Math.PI) + 1) / 2
}

export function dockItemSize(distance: number, options: DockFalloffOptions): number {
  const factor = dockFalloff(distance, options.range)
  return options.baseSize + (options.maxSize - options.baseSize) * factor
}

// Pure function for unit testing with known distances (DOM-free).
export function dockItemSizes(
  pointerPosition: number,
  centers: readonly number[],
  options: DockFalloffOptions,
): number[] {
  return centers.map((center) => dockItemSize(pointerPosition - center, options))
}

// Offsets to spread magnified items; virtual re-layout computed in JS.
export function dockItemOffsets(
  sizes: readonly number[],
  centers: readonly number[],
  gap: number,
): number[] {
  if (sizes.length === 0) return []
  // Laid out in the order they sit on screen, not index order: right to left (or row-reverse),
  // the first item is at the far end.
  const order = centers.map((_, i) => i).sort((a, b) => centers[a]! - centers[b]!)
  const virtualCenters: number[] = []
  let cursor = 0
  for (const i of order) {
    virtualCenters[i] = cursor + sizes[i]! / 2
    cursor += sizes[i]! + gap
  }
  const [first, last] = [order[0]!, order[order.length - 1]!]
  const restingMid = (centers[first]! + centers[last]!) / 2
  const virtualMid = (virtualCenters[first]! + virtualCenters[last]!) / 2
  const shift = restingMid - virtualMid
  return virtualCenters.map((center, i) => center + shift - centers[i]!)
}

/**
 * Maps a pointer position on a grown dock back onto the resting layout, where
 * item `i` spans `[i * (restSize + gap), i * (restSize + gap) + restSize]`. The
 * pointer keeps the same fractional position inside whichever item or gap it's
 * over, so sizes derived from it never feed back into the layout they grew.
 */
export function dockRestingPosition(
  pointer: number,
  spans: readonly (readonly [start: number, end: number])[],
  restSize: number,
  gap: number,
): number {
  if (spans.length === 0) return pointer
  const pitch = restSize + gap
  const [firstStart] = spans[0]!
  if (pointer < firstStart) return pointer - firstStart
  for (let i = 0; i < spans.length; i++) {
    const [start, end] = spans[i]!
    const restStart = i * pitch
    if (pointer <= end) {
      const length = end - start
      return restStart + (length > 0 ? ((pointer - start) / length) * restSize : 0)
    }
    const next = spans[i + 1]
    if (next && pointer < next[0]) {
      const gapLength = next[0] - end
      return restStart + restSize + (gapLength > 0 ? ((pointer - end) / gapLength) * gap : 0)
    }
  }
  const lastEnd = spans[spans.length - 1]![1]
  return (spans.length - 1) * pitch + restSize + (pointer - lastEnd)
}

export function useDock(
  rootEl: ElRef<HTMLElement | null>,
  itemCount: MaybeRefOrGetter<number>,
  options: UseDockOptions = {},
): UseDockReturn {
  function orientation(): DockOrientation {
    return toValue(options.orientation) ?? 'horizontal'
  }
  function baseSize(): number {
    return toValue(options.baseSize) ?? 48
  }
  function maxSize(): number {
    return toValue(options.maxSize) ?? 76
  }
  function range(): number {
    return toValue(options.range) ?? baseSize() * 3.5
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }
  function magnifyEnabled(): boolean {
    return toValue(options.magnify) ?? true
  }
  function grows(): boolean {
    return toValue(options.grow) ?? false
  }

  const itemEls: (HTMLElement | null)[] = []
  function setItemEl(index: number) {
    return (el: unknown) => {
      const resolved =
        el && typeof el === 'object' && '$el' in el
          ? ((el as { $el?: Element }).$el as HTMLElement | undefined)
          : (el as HTMLElement | null)
      itemEls[index] = resolved ?? null
    }
  }

  // Resting centers measured once for virtual re-layout. Items can rest below
  // `baseSize` when a narrow container shrinks them, so the real resting size is
  // measured too and magnification scales from it.
  let centers: number[] = []
  let gap = 0
  let restSize = 0
  // In grow mode the root resizes every frame while magnified; only the resting
  // layout is worth measuring.
  let magnified = false
  // How far the bar has widened past its resting length, half on each side (transforms only).
  let spread = 0
  function setSpread(px: number) {
    const root = rootEl.value
    spread = Math.abs(px) < 0.5 ? 0 : px
    if (spread) root?.style.setProperty('--ui-dock-spread', `${spread}px`)
    else root?.style.removeProperty('--ui-dock-spread')
  }

  // Real macOS Dock magnification is a continuous spring-like catch-up, not
  // a value tweened between discrete pointermove samples — a CSS transition
  // retargeted every frame is the wrong tool (apple-design's own guidance:
  // avoid transitions for anything gesture-driven) and is what caused the
  // Safari-specific judder this replaces. currentScale/currentOffset chase
  // targetScale/targetOffset every animation frame via exponential decay,
  // independent of how often pointermove itself fires.
  let currentScale: number[] = []
  let currentOffset: number[] = []
  let targetScale: number[] = []
  let targetOffset: number[] = []
  let scaleVelocity: number[] = []
  let offsetVelocity: number[] = []
  let rafId: number | null = null
  let lastFrameTime = 0
  const SETTLE_HALF_LIFE_MS = 30 // time to close half the remaining distance to target
  const SCALE_EPSILON = 0.001
  const OFFSET_EPSILON = 0.05

  function syncArrayLengths() {
    const n = itemEls.length
    for (const arr of [
      currentScale,
      currentOffset,
      targetScale,
      targetOffset,
      scaleVelocity,
      offsetVelocity,
    ])
      arr.length = n
    for (let i = 0; i < n; i++) {
      scaleVelocity[i] ??= 0
      offsetVelocity[i] ??= 0
      if (currentScale[i] === undefined) currentScale[i] = 1
      if (currentOffset[i] === undefined) currentOffset[i] = 0
      if (targetScale[i] === undefined) targetScale[i] = 1
      if (targetOffset[i] === undefined) targetOffset[i] = 0
    }
  }

  function clearStyles(el: HTMLElement) {
    el.style.transform = ''
    el.style.inlineSize = ''
    el.style.blockSize = ''
  }

  function writeTransform(el: HTMLElement, index: number, vertical: boolean) {
    const scale = currentScale[index]!
    const offset = currentOffset[index]!
    const atRest = Math.abs(scale - 1) < SCALE_EPSILON && Math.abs(offset) < OFFSET_EPSILON
    if (grows()) {
      if (atRest) {
        clearStyles(el)
        return
      }
      const size = `${scale * restSize}px`
      el.style.transform = ''
      el.style.inlineSize = size
      el.style.blockSize = size
      return
    }
    if (atRest) {
      // Fully settled — clear the inline style so `.ui-dock-item:active`'s
      // press-shrink (gated on no live transform being present) can apply.
      el.style.transform = ''
      return
    }
    el.style.transform = vertical
      ? `translateY(${offset}px) scale(${scale})`
      : `translateX(${offset}px) scale(${scale})`
  }

  function tick(time: number) {
    const dt = lastFrameTime ? time - lastFrameTime : 16
    lastFrameTime = time
    const factor = 1 - Math.pow(0.5, dt / SETTLE_HALF_LIFE_MS)
    const spring = toValue(options.spring)
    // A tab coming back after a while doesn't fling the items.
    const seconds = Math.min(dt, 64) / 1000
    const vertical = orientation() === 'vertical'
    let stillMoving = false
    let atRest = true
    let widened = 0
    itemEls.forEach((el, i) => {
      if (!el) return
      const scaleDelta = targetScale[i]! - currentScale[i]!
      const offsetDelta = targetOffset[i]! - currentOffset[i]!
      const coasting =
        !!spring &&
        (Math.abs(scaleVelocity[i]!) > SCALE_EPSILON * 10 ||
          Math.abs(offsetVelocity[i]!) > OFFSET_EPSILON * 10)
      if (
        coasting ||
        Math.abs(scaleDelta) > SCALE_EPSILON ||
        Math.abs(offsetDelta) > OFFSET_EPSILON
      ) {
        if (spring) {
          const { damping, response } = spring
          const scale = stepSpring(
            { value: currentScale[i]!, velocity: scaleVelocity[i]! },
            targetScale[i]!,
            seconds,
            damping,
            response,
          )
          const offset = stepSpring(
            { value: currentOffset[i]!, velocity: offsetVelocity[i]! },
            targetOffset[i]!,
            seconds,
            damping,
            response,
          )
          currentScale[i] = scale.value
          scaleVelocity[i] = scale.velocity
          currentOffset[i] = offset.value
          offsetVelocity[i] = offset.velocity
        } else {
          currentScale[i]! += scaleDelta * factor
          currentOffset[i]! += offsetDelta * factor
        }
        stillMoving = true
      } else {
        currentScale[i] = targetScale[i]
        currentOffset[i] = targetOffset[i]
        scaleVelocity[i] = 0
        offsetVelocity[i] = 0
      }
      if (Math.abs(currentScale[i]! - 1) >= SCALE_EPSILON) atRest = false
      writeTransform(el, i, vertical)
      widened += (currentScale[i]! - 1) * restSize
    })
    // The bar widens with the items, so the end ones never hang off it.
    if (!grows()) setSpread(atRest ? 0 : widened)
    magnified = !atRest
    rafId = stillMoving ? requestAnimationFrame(tick) : null
    if (!stillMoving) lastFrameTime = 0
  }

  function startLoop() {
    if (rafId == null) rafId = requestAnimationFrame(tick)
  }

  function measure() {
    const root = rootEl.value
    if (!root || (grows() && magnified)) return
    const rootRect = root.getBoundingClientRect()
    const vertical = orientation() === 'vertical'
    // From where the bar's edge rests, however far it has widened.
    const origin = (vertical ? rootRect.top : rootRect.left) + spread / 2
    const first = itemEls.find((el): el is HTMLElement => !!el)
    // offsetWidth/Height ignore transforms, so this is the resting size even mid-magnify.
    if (first) restSize = vertical ? first.offsetHeight : first.offsetWidth
    centers = itemEls.map((el) => {
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      return vertical ? rect.top + rect.height / 2 - origin : rect.left + rect.width / 2 - origin
    })
    const gapProperty = vertical ? 'rowGap' : 'columnGap'
    gap = parseFloat(getComputedStyle(root)[gapProperty]) || 0
  }

  // A finger or a pen has no hover, so it magnifies while it is down and sliding along the dock
  // (the dock's touch-action: none keeps the page from scrolling then), and settles when it
  // lifts. It has to travel this far first: a tap on an item is a tap, not a slide.
  const TOUCH_SLIDE = 8
  let touchStart: { x: number; y: number } | null = null
  let touchSliding = false

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    touchStart = { x: event.clientX, y: event.clientY }
    touchSliding = false
  }

  function canMagnify(event?: PointerEvent): boolean {
    if (isDisabled() || !magnifyEnabled()) return false
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    if (prefersReducedMotion()) return false
    if (event && (event.pointerType === 'touch' || event.pointerType === 'pen')) {
      if (!touchStart || !(event.buttons > 0 || event.pressure > 0)) return false
      if (!touchSliding)
        touchSliding =
          Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) >= TOUCH_SLIDE
      return touchSliding
    }
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  }

  // Instant — stops live tracking and jumps straight to rest, no easing.
  // For when magnify becomes unavailable mid-frame (disabled toggled,
  // prefers-reduced-motion just turned on): pointerleave gets the smooth
  // spring settle below instead (settleToRest), same as the real Dock.
  function resetSizes() {
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
      lastFrameTime = 0
    }
    syncArrayLengths()
    for (let i = 0; i < itemEls.length; i++) {
      currentScale[i] = 1
      currentOffset[i] = 0
      targetScale[i] = 1
      targetOffset[i] = 0
      scaleVelocity[i] = 0
      offsetVelocity[i] = 0
    }
    magnified = false
    setSpread(0)
    for (const el of itemEls) {
      if (el) clearStyles(el)
    }
  }

  // Smooth — the pointer left, but the effect is still "on": ease every
  // item back to rest through the same spring loop live tracking uses,
  // instead of cutting straight to resetSizes()'s instant snap.
  function settleToRest() {
    syncArrayLengths()
    for (let i = 0; i < itemEls.length; i++) {
      targetScale[i] = 1
      targetOffset[i] = 0
    }
    startLoop()
  }

  function onPointerMove(event: PointerEvent) {
    if (!canMagnify(event)) {
      // Only what it drew itself: with `magnify` off the items' styles are yours.
      if (magnified && event.pointerType !== 'touch' && event.pointerType !== 'pen') resetSizes()
      return
    }
    const root = rootEl.value
    if (!root || centers.length === 0 || restSize === 0) return
    syncArrayLengths()
    const rootRect = root.getBoundingClientRect()
    const vertical = orientation() === 'vertical'
    let pointerPosition =
      (vertical ? event.clientY - rootRect.top : event.clientX - rootRect.left) - spread / 2
    if (grows()) {
      // The layout itself has grown; map the pointer back onto the resting one.
      const spans = itemEls.map((el): [number, number] => {
        if (!el) return [0, 0]
        const rect = el.getBoundingClientRect()
        return vertical ? [rect.top, rect.bottom] : [rect.left, rect.right]
      })
      const firstStart = centers[0]! - restSize / 2
      pointerPosition =
        dockRestingPosition(vertical ? event.clientY : event.clientX, spans, restSize, gap) +
        firstStart
    }
    // Sizes are designed against baseSize; a shrunken dock magnifies in proportion.
    const ratio = restSize / baseSize()
    const sizes = dockItemSizes(pointerPosition, centers, {
      baseSize: restSize,
      maxSize: maxSize() * ratio,
      range: range() * ratio,
    })
    const offsets = grows() ? sizes.map(() => 0) : dockItemOffsets(sizes, centers, gap)
    itemEls.forEach((_, i) => {
      targetScale[i] = sizes[i]! / restSize
      targetOffset[i] = offsets[i]!
    })
    startLoop()
  }

  function onPointerLeave(event?: PointerEvent) {
    // A finger or pen lifting settles the dock; a mouse click under a still pointer doesn't.
    if (event?.type === 'pointerup' && event.pointerType === 'mouse') return
    touchStart = null
    touchSliding = false
    if (magnified || rafId != null) settleToRest()
  }

  onMounted(() => {
    nextTick(measure)
  })
  useResizeObserver(rootEl, () => measure())
  watch(
    () => toValue(itemCount),
    () => nextTick(measure),
  )
  watch(grows, () => {
    resetSizes()
    nextTick(measure)
  })
  // Clear sizes on prefers-reduced-motion toggle.
  useEventListener(
    () => ssrWindow()?.matchMedia('(prefers-reduced-motion: reduce)'),
    'change',
    resetSizes,
  )
  onScopeDispose(() => {
    if (rafId != null) cancelAnimationFrame(rafId)
  })

  return {
    setItemEl,
    onPointerDown,
    onPointerMove,
    onPointerLeave,
    touchSlid: () => touchSliding,
    remeasure: measure,
  }
}
