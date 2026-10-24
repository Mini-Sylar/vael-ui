import { toValue } from 'vue'
import { prefersReducedMotion } from './dom'
import type { UseHoverIndicatorOptions } from './useHoverIndicator'

// The hover highlight handed between neighbouring lists in a group (MenuList, Tree): loaded only by
// lists that set `group`. The one you leave lets go of it; a neighbour you enter at once picks it up
// and glides on from where it was.
let released: {
  group: string
  list: HTMLElement
  indicator: HTMLElement
  rect: DOMRect
  at: number
} | null = null
const HANDOFF_MS = 250

export function release(group: string, list: HTMLElement, indicator: HTMLElement) {
  released = {
    group,
    list,
    indicator,
    rect: indicator.getBoundingClientRect(),
    at: performance.now(),
  }
}

/** Plays this list's indicator from where the neighbour's was seen to where this one lands. */
export function receive(
  options: UseHoverIndicatorOptions,
  provided: { motion?: unknown; indicator?: unknown } | undefined,
  list: HTMLElement,
  row: HTMLElement,
  indicatorOf: () => HTMLElement | null,
) {
  const from = released
  released = null
  if (!from || from.group !== options.group || from.list === list) return
  // Motion off, instant indicators or reduced motion: it simply appears where it lands.
  if (prefersReducedMotion()) return
  if ((toValue(options.motion) ?? provided?.motion) === false) return
  if ((toValue(options.indicator) ?? provided?.indicator) === 'instant') return
  if (performance.now() - from.at > HANDOFF_MS) return
  const near = row.getBoundingClientRect()
  const gap = Math.max(near.top - from.rect.bottom, from.rect.top - near.bottom, 0)
  if (gap > near.height * 3) return
  // After the indicator's own measure, which runs in the frame before this one's paint.
  requestAnimationFrame(() => {
    const el = indicatorOf()
    const to = el?.getBoundingClientRect()
    if (!el || !to?.width || !to.height) return
    const style = getComputedStyle(el)
    const raw = style.getPropertyValue('--ui-duration-indicator-wide').trim()
    const n = Number.parseFloat(raw)
    // `200ms` or `0.2s`; unset, 200 ms.
    const ms = Number.isNaN(n) ? 200 : n * (raw.endsWith('ms') ? 1 : 1000)
    const easing = style.getPropertyValue('--ui-ease-indicator').trim() || 'ease-out'
    const x = from.rect.left - to.left
    const y = from.rect.top - to.top
    const scale = `${from.rect.width / to.width}, ${from.rect.height / to.height}`
    el.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          opacity: 1,
        },
        { transformOrigin: '0 0', transform: 'none', opacity: 1 },
      ],
      { id: 'ui-indicator-handoff', duration: ms, easing },
    )
    // One highlight: the one it came from is gone at once instead of fading beside it.
    from.indicator.animate([{ opacity: 0 }, { opacity: 0 }], { duration: ms })
  })
}
