// Scroll progress as a ref, from 0 to 1: the page's, or an element's way through the viewport (or a
// scrolling container). Feed it to `v-animate`'s `progress` as a getter and the scroll never
// re-renders your component.
import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

type Target = MaybeRefOrGetter<Element | null | undefined>

export interface ScrollProgressOptions {
  /** A scrolling element to measure in, instead of the page. */
  container?: Target
  /** @default 'y' */
  axis?: 'x' | 'y'
  /**
   * Where it starts and ends, each a `'<target edge> <container edge>'` pair: `start`, `center`,
   * `end`, a share (`0.25`), px or %. `'start end'` is the target's start meeting the container's
   * end. With a target, default `['start end', 'end start']`: from entering to having left.
   */
  offset?: [string, string]
}

const EDGES: Record<string, number> = { start: 0, center: 0.5, end: 1 }

// One edge, in px from the start of something `size` long.
function edge(word: string, size: number): number {
  if (word in EDGES) return EDGES[word]! * size
  if (word.endsWith('px')) return Number.parseFloat(word)
  if (word.endsWith('%')) return (Number.parseFloat(word) / 100) * size
  return Number.parseFloat(word) * size || 0
}

/**
 * The scroll position, from 0 to 1. With no target: the page (or `container`) from top to bottom.
 * With a target: its way through the viewport, by `offset`.
 */
export function useScrollProgress(
  target?: Target,
  options: ScrollProgressOptions = {},
): Readonly<Ref<number>> {
  const progress = shallowRef(0)
  if (typeof window === 'undefined') return progress
  const vertical = options.axis !== 'x'
  let frame = 0

  function measure() {
    frame = 0
    const box = toValue(options.container) ?? null
    const scroller = box ?? document.scrollingElement ?? document.documentElement
    const scroll = vertical ? scroller.scrollTop : scroller.scrollLeft
    const view = box
      ? vertical
        ? box.clientHeight
        : box.clientWidth
      : vertical
        ? window.innerHeight
        : window.innerWidth
    const el = toValue(target)
    let from: number
    let to: number
    if (!el) {
      from = 0
      to = (vertical ? scroller.scrollHeight : scroller.scrollWidth) - view
    } else {
      const rect = el.getBoundingClientRect()
      const origin = box ? box.getBoundingClientRect() : undefined
      // Where the target starts, in the scroller's own coordinates.
      const start =
        (vertical ? rect.top - (origin?.top ?? 0) : rect.left - (origin?.left ?? 0)) + scroll
      const size = vertical ? rect.height : rect.width
      const [first, last] = options.offset ?? ['start end', 'end start']
      const at = (pair: string) => {
        const [mine = 'start', theirs = 'start'] = pair.trim().split(/\s+/)
        return start + edge(mine, size) - edge(theirs, view)
      }
      from = at(first)
      to = at(last)
    }
    const span = to - from
    progress.value = span ? Math.min(1, Math.max(0, (scroll - from) / span)) : scroll >= to ? 1 : 0
  }
  const schedule = () => (frame ||= requestAnimationFrame(measure))

  let stop: (() => void) | undefined
  watch(
    () => [toValue(target), toValue(options.container)] as const,
    ([el, box]) => {
      stop?.()
      const source: EventTarget = box ?? window
      source.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule, { passive: true })
      // Content that grows or shrinks moves the ends without a scroll, as rows loading in do.
      const sizes = new ResizeObserver(schedule)
      const root = box ?? document.body
      for (const node of [root, ...root.children, el]) if (node) sizes.observe(node)
      stop = () => {
        source.removeEventListener('scroll', schedule)
        window.removeEventListener('resize', schedule)
        sizes.disconnect()
      }
      measure()
    },
    { immediate: true, flush: 'post' },
  )
  onScopeDispose(() => {
    stop?.()
    if (frame) cancelAnimationFrame(frame)
  })
  return progress
}
