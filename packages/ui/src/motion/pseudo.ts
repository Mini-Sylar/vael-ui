import { easingOf, resolveTiming } from './timing'
import { groupValues, toKeyframe, toKeyframes } from './values'
import type { Sequence } from './values'
import type { MotionValues } from './types'

/**
 * Plays motion values on one of `el`'s pseudo-elements, such as a View Transition's snapshots:
 * from them (`'in'`) or to them (`'out'`), each value on its own timing or `base`'s. Arrays play
 * as keyframes, as in the runtime: each segment eases on its own, at `times`.
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
    const frames = toKeyframes(group.values, false, {
      easing: easingOf(el, group.timing?.easing) ?? base.easing,
      times: (group.timing as Sequence | undefined)?.times,
    })
    return el.animate(frames ?? [{ ...toKeyframe(group.values), offset: way === 'in' ? 0 : 1 }], {
      duration: own.duration,
      easing: frames ? 'linear' : own.easing,
      delay: group.delay * 1000,
      fill: 'both',
      pseudoElement,
    })
  })
}
