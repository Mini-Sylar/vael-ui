import { onScopeDispose, watch } from 'vue'
import type { Ref, WatchSource } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { animate, motionValue } from 'motion-v'

// The leading edge moves fast and the trailing edge follows a beat later, so
// the bar stretches toward where it's going and settles, rather than
// teleporting. Critically damped (no bounce): it follows a click or a
// scroll, not a flick.
const LEAD = { type: 'spring', bounce: 0, duration: 0.3 } as const
const TRAIL = { type: 'spring', bounce: 0, duration: 0.5 } as const

/**
 * Drives an absolutely positioned indicator bar to the vertical extent of the
 * active item inside `container`. `findActive` returns the element to track
 * (or null to hide the bar); it re-runs whenever `source` changes and when
 * the container resizes. With `offsetX`, the bar also lines up horizontally:
 * that many pixels from the active item's left edge.
 */
export function useGlidingIndicator(
  container: Readonly<Ref<HTMLElement | null>>,
  indicator: Readonly<Ref<HTMLElement | null>>,
  findActive: () => HTMLElement | null | undefined,
  source: WatchSource,
  offsetX?: number,
): void {
  const top = motionValue(0)
  const bottom = motionValue(0)
  let placed = false

  const paint = () => {
    const el = indicator.value
    if (!el) return
    el.style.transform = `translateY(${top.get()}px)`
    el.style.height = `${Math.max(0, bottom.get() - top.get())}px`
  }
  const unsubscribe = [top.on('change', paint), bottom.on('change', paint)]

  function update(): void {
    const box = container.value
    const target = findActive()
    const el = indicator.value
    if (!box || !el) return
    if (!target) {
      el.style.opacity = '0'
      placed = false
      return
    }
    const boxRect = box.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const nextTop = rect.top - boxRect.top + box.scrollTop
    const nextBottom = nextTop + rect.height
    el.style.opacity = '1'
    if (offsetX !== undefined) el.style.left = `${rect.left - boxRect.left + offsetX}px`

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The first placement (and any placement under reduced motion) jumps
    // straight there; only moves between items glide.
    if (!placed || reduced) {
      top.jump(nextTop)
      bottom.jump(nextBottom)
      placed = true
      paint()
      return
    }
    const movingDown = nextTop > top.get()
    animate(top, nextTop, movingDown ? TRAIL : LEAD)
    animate(bottom, nextBottom, movingDown ? LEAD : TRAIL)
  }

  watch(source, () => requestAnimationFrame(update), { flush: 'post' })
  useResizeObserver(container, () => requestAnimationFrame(update))
  onScopeDispose(() => unsubscribe.forEach((stop) => stop()))
}
