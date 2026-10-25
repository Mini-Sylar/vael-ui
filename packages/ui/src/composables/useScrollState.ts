import { computed, reactive, shallowRef } from 'vue'
import type { WritableComputedRef } from 'vue'
import { tryOnMounted, tryOnScopeDispose, useEventListener } from '@vueuse/core'
import type { ElRef } from './dom'

type Edges = { left: boolean; right: boolean; top: boolean; bottom: boolean }

export interface ScrollState {
  /** `scrollLeft`; set it to scroll there. */
  x: WritableComputedRef<number>
  /** `scrollTop`; set it to scroll there. */
  y: WritableComputedRef<number>
  /** True from a scroll until `scrollend`, or 200 ms without one. */
  isScrolling: Readonly<{ value: boolean }>
  /** Which edges it rests against (within 1 px). */
  arrivedState: Readonly<Edges>
  /** Which way the last scroll went; all false once it stops. */
  directions: Readonly<Edges>
  /** Reads the edges again, after a size change. */
  measure: () => void
}

/** VueUse's `useScroll` for one scroll box, with the same rules, in the part vael-ui uses. */
export function useScrollState(
  el: ElRef<HTMLElement | null>,
  onScroll?: (event: Event) => void,
): ScrollState {
  const left = shallowRef(0)
  const top = shallowRef(0)
  const isScrolling = shallowRef(false)
  const arrivedState = reactive({ left: true, right: false, top: true, bottom: false })
  const directions = reactive({ left: false, right: false, top: false, bottom: false })
  const scrollTo = (to: ScrollToOptions) => {
    el.value?.scrollTo(to)
    measure()
  }
  let idle: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    clearTimeout(idle)
    if (!isScrolling.value) return
    isScrolling.value = false
    directions.left = directions.right = directions.top = directions.bottom = false
  }

  function measure() {
    const box = el.value
    if (!box) return
    const { display, flexDirection } = getComputedStyle(box)
    const x = box.scrollLeft
    const y = box.scrollTop
    directions.left = x < left.value
    directions.right = x > left.value
    directions.top = y < top.value
    directions.bottom = y > top.value
    const atLeft = Math.abs(x) <= 0
    const atRight = Math.abs(x) + box.clientWidth >= box.scrollWidth - 1
    const atTop = Math.abs(y) <= 0
    const atBottom = Math.abs(y) + box.clientHeight >= box.scrollHeight - 1
    // A reversed flex box starts at the other end.
    const rows = display === 'flex' && flexDirection === 'row-reverse'
    const columns = display === 'flex' && flexDirection === 'column-reverse'
    arrivedState.left = rows ? atRight : atLeft
    arrivedState.right = rows ? atLeft : atRight
    arrivedState.top = columns ? atBottom : atTop
    arrivedState.bottom = columns ? atTop : atBottom
    left.value = x
    top.value = y
  }

  useEventListener(
    el,
    'scroll',
    (event: Event) => {
      measure()
      isScrolling.value = true
      clearTimeout(idle)
      idle = setTimeout(stop, 200)
      onScroll?.(event)
    },
    { passive: true },
  )
  useEventListener(el, 'scrollend', stop, { passive: true })
  tryOnMounted(measure)
  tryOnScopeDispose(() => clearTimeout(idle))

  return {
    x: computed({ get: () => left.value, set: (x) => scrollTo({ left: x }) }),
    y: computed({ get: () => top.value, set: (y) => scrollTo({ top: y }) }),
    isScrolling,
    arrivedState,
    directions,
    measure,
  }
}
