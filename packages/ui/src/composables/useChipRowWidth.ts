import { nextTick, watch } from 'vue'
import { prefersReducedMotion } from './dom'

export interface UseChipRowWidthOptions {
  /** The value row that holds the chips group and, once empty, the placeholder. */
  row: () => HTMLElement | null | undefined
  /** True once the selection is empty. */
  empty: () => boolean
  /** False skips it: text or count display, or the built-in chip transitions are off. */
  active: () => boolean
  /** Selector for the placeholder inside the row. */
  placeholder: string
}

/**
 * When the last chip leaves, eases the value row from that chip's width to the placeholder's. A
 * trigger sized by its content would otherwise shrink to nothing while the chip collapses, then
 * jump out again for the placeholder. A trigger with a set width is unaffected: the row keeps
 * filling it, and the placeholder slides in behind the chip's shrinking edge.
 */
export function useChipRowWidth(options: UseChipRowWidthOptions): void {
  watch(
    options.empty,
    async (empty) => {
      const row = options.row()
      if (!empty || !row || !options.active()) return
      if (prefersReducedMotion()) return
      // Measured before the DOM changes: the chip is still at full size.
      const from = row.getBoundingClientRect().width
      await nextTick()
      const placeholder = row.querySelector<HTMLElement>(options.placeholder)
      if (!placeholder || !row.isConnected) return
      const to = placeholder.getBoundingClientRect().width
      if (Math.abs(to - from) < 1) return
      row.style.inlineSize = `${from}px`
      void row.offsetWidth
      row.style.transition = 'inline-size var(--ui-duration-exit) var(--ui-ease-out)'
      row.style.inlineSize = `${to}px`
      const clear = (event: TransitionEvent) => {
        if (event.target !== row) return
        row.style.inlineSize = ''
        row.style.transition = ''
        row.removeEventListener('transitionend', clear)
        row.removeEventListener('transitioncancel', clear)
      }
      row.addEventListener('transitionend', clear)
      row.addEventListener('transitioncancel', clear)
    },
    { flush: 'pre' },
  )
}
