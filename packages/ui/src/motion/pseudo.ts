import { resolveTiming } from './timing'
import { groupValues, toKeyframe } from './values'
import type { MotionValues } from './types'

/**
 * Plays motion values on one of `el`'s pseudo-elements, such as a View Transition's snapshots:
 * from them (`'in'`) or to them (`'out'`), each value on its own timing or `base`'s.
 */
export function animatePseudo(
  el: Element,
  pseudoElement: string,
  values: MotionValues,
  base: { duration: number; easing: string },
  way: 'in' | 'out',
): Animation[] {
  return groupValues(values).map((group) => {
    const own = group.timing ? resolveTiming(el, group.timing) : base
    return el.animate([{ ...toKeyframe(group.values), offset: way === 'in' ? 0 : 1 }], {
      duration: own.duration,
      easing: own.easing,
      delay: group.delay * 1000,
      fill: 'both',
      pseudoElement,
    })
  })
}
