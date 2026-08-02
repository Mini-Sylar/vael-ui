import { onMounted, onScopeDispose, nextTick, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { ssrWindow } from '../ssr'

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
}

export interface UseDockReturn {
  /** Bind as `:ref="setItemEl(index)"` on each item's own root element. */
  setItemEl: (index: number) => (el: unknown) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerLeave: () => void
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
  const virtualCenters: number[] = []
  let cursor = 0
  for (const size of sizes) {
    virtualCenters.push(cursor + size / 2)
    cursor += size + gap
  }
  const restingMid = (centers[0]! + centers[centers.length - 1]!) / 2
  const virtualMid = (virtualCenters[0]! + virtualCenters[virtualCenters.length - 1]!) / 2
  const shift = restingMid - virtualMid
  return virtualCenters.map((center, i) => center + shift - centers[i]!)
}

export function useDock(
  rootEl: Ref<HTMLElement | null>,
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

  // Resting centers measured once for virtual re-layout.
  let centers: number[] = []
  let gap = 0

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
  let rafId: number | null = null
  let lastFrameTime = 0
  const SETTLE_HALF_LIFE_MS = 30 // time to close half the remaining distance to target
  const SCALE_EPSILON = 0.001
  const OFFSET_EPSILON = 0.05

  function syncArrayLengths() {
    const n = itemEls.length
    for (const arr of [currentScale, currentOffset, targetScale, targetOffset]) arr.length = n
    for (let i = 0; i < n; i++) {
      if (currentScale[i] === undefined) currentScale[i] = 1
      if (currentOffset[i] === undefined) currentOffset[i] = 0
      if (targetScale[i] === undefined) targetScale[i] = 1
      if (targetOffset[i] === undefined) targetOffset[i] = 0
    }
  }

  function writeTransform(el: HTMLElement, index: number, vertical: boolean) {
    const scale = currentScale[index]!
    const offset = currentOffset[index]!
    const atRest = Math.abs(scale - 1) < SCALE_EPSILON && Math.abs(offset) < OFFSET_EPSILON
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
    const vertical = orientation() === 'vertical'
    let stillMoving = false
    itemEls.forEach((el, i) => {
      if (!el) return
      const scaleDelta = targetScale[i]! - currentScale[i]!
      const offsetDelta = targetOffset[i]! - currentOffset[i]!
      if (Math.abs(scaleDelta) > SCALE_EPSILON || Math.abs(offsetDelta) > OFFSET_EPSILON) {
        currentScale[i]! += scaleDelta * factor
        currentOffset[i]! += offsetDelta * factor
        stillMoving = true
      } else {
        currentScale[i] = targetScale[i]
        currentOffset[i] = targetOffset[i]
      }
      writeTransform(el, i, vertical)
    })
    rafId = stillMoving ? requestAnimationFrame(tick) : null
    if (!stillMoving) lastFrameTime = 0
  }

  function startLoop() {
    if (rafId == null) rafId = requestAnimationFrame(tick)
  }

  function measure() {
    const root = rootEl.value
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const vertical = orientation() === 'vertical'
    centers = itemEls.map((el) => {
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      return vertical
        ? rect.top + rect.height / 2 - rootRect.top
        : rect.left + rect.width / 2 - rootRect.left
    })
    const gapProperty = vertical ? 'rowGap' : 'columnGap'
    gap = parseFloat(getComputedStyle(root)[gapProperty]) || 0
  }

  function canMagnify(): boolean {
    if (isDisabled() || !magnifyEnabled()) return false
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return (
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
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
    }
    for (const el of itemEls) {
      if (el) el.style.transform = ''
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
    if (!canMagnify()) {
      resetSizes()
      return
    }
    const root = rootEl.value
    if (!root || centers.length === 0) return
    syncArrayLengths()
    const rootRect = root.getBoundingClientRect()
    const vertical = orientation() === 'vertical'
    const pointerPosition = vertical ? event.clientY - rootRect.top : event.clientX - rootRect.left
    const base = baseSize()
    const sizes = dockItemSizes(pointerPosition, centers, {
      baseSize: base,
      maxSize: maxSize(),
      range: range(),
    })
    const offsets = dockItemOffsets(sizes, centers, gap)
    itemEls.forEach((_, i) => {
      targetScale[i] = sizes[i]! / base
      targetOffset[i] = offsets[i]!
    })
    startLoop()
  }

  function onPointerLeave() {
    settleToRest()
  }

  onMounted(() => {
    nextTick(measure)
  })
  useResizeObserver(rootEl, () => measure())
  watch(
    () => toValue(itemCount),
    () => nextTick(measure),
  )
  // Clear sizes on prefers-reduced-motion toggle.
  useEventListener(
    () => ssrWindow()?.matchMedia('(prefers-reduced-motion: reduce)'),
    'change',
    resetSizes,
  )
  onScopeDispose(() => {
    if (rafId != null) cancelAnimationFrame(rafId)
  })

  return { setItemEl, onPointerMove, onPointerLeave, remeasure: measure }
}
