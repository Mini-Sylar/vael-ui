import { nextTick, watch } from 'vue'
import type { WatchSource } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface UseEasedHeightOptions {
  /** The list whose height eases. */
  el: () => HTMLElement | null | undefined
  /** What changes its contents: a search, items, loading. */
  source: WatchSource | WatchSource[]
  /** False turns it off (a `motionCss` prop); reduced motion is checked here. */
  enabled: () => boolean
  /** The custom property the list's CSS eases its soft bottom edge with. @default '--ui-list-edge' */
  edgeProperty?: string
}

/**
 * Eases a list to its new height when its contents change, from wherever it is now, so typing
 * again mid-way doesn't jump. While it resizes, the list carries `data-resizing` (`fit` or
 * `scroll`) and, when it grows, `data-growing`: its CSS hides the scrollbar and softens the moving
 * edge so rows fade in there instead of being cut mid-glyph. The results themselves never wait.
 */
export function useEasedHeight(options: UseEasedHeightOptions): void {
  const edgeProperty = options.edgeProperty ?? '--ui-list-edge'

  watch(
    options.source,
    () => {
      const el = options.el()
      if (!el || !options.enabled() || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return
      }
      const from = el.getBoundingClientRect().height
      nextTick(() => {
        el.style.transition = 'none'
        el.style.blockSize = ''
        const to = el.getBoundingClientRect().height
        if (Math.abs(to - from) >= 1) {
          el.dataset.resizing = el.scrollHeight > el.clientHeight + 1 ? 'scroll' : 'fit'
          if (to > from) el.dataset.growing = ''
          else delete el.dataset.growing
          el.style.blockSize = `${from}px`
          void el.offsetHeight
          el.style.blockSize = `${to}px`
        } else {
          delete el.dataset.resizing
          delete el.dataset.growing
        }
        el.style.transition = ''
      })
    },
    { flush: 'pre' },
  )

  // Not transitioncancel: a restart cancels the previous run after setting the new height.
  useEventListener(options.el, 'transitionend', (event: TransitionEvent) => {
    const el = options.el()
    if (!el || event.target !== el) return
    const heightDone = event.propertyName === 'block-size' || event.propertyName === 'height'
    // A list that fits eases its soft edge away first. One that scrolls hands it to its scroll fade.
    if (heightDone && el.dataset.growing !== undefined && el.dataset.resizing === 'fit') {
      delete el.dataset.growing
      return
    }
    if (heightDone || event.propertyName === edgeProperty) {
      el.style.blockSize = ''
      delete el.dataset.resizing
      delete el.dataset.growing
    }
  })
}
