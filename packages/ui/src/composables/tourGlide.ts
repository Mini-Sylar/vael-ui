import { resolveTiming } from '../motion/timing'
import type { MotionTiming } from '../motion/types'

/** Between steps the spotlight and the callout glide together: quick to a neighbour, longer across the screen. */
const GLIDE_MIN_MS = 220
const GLIDE_MAX_MS = 380
// `--ui-ease-out`: the cutout repositions rather than enters, so no long settling tail.
export const GLIDE_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

export function glideMs(travel: number, diagonal: number): number {
  const t = Math.min(1, travel / (diagonal || 1))
  return GLIDE_MIN_MS + (GLIDE_MAX_MS - GLIDE_MIN_MS) * Math.sqrt(t)
}

/** A `motion` value's own timing: a spring, or a duration and easing. */
export function timingOf(source: unknown): MotionTiming | undefined {
  if (typeof source !== 'object' || source === null) return undefined
  const { spring, duration, easing } = source as Record<string, unknown>
  if (spring !== undefined) return { spring } as MotionTiming
  if (duration !== undefined || easing !== undefined) return { duration, easing } as MotionTiming
  return undefined
}

export interface Glide {
  /** Milliseconds. */
  duration: number
  /** A CSS easing. */
  easing: string
}

/** The glide: your timing when set (tokens resolve against `el`), else by distance travelled. */
export function glideOf(
  el: Element,
  timing: MotionTiming | undefined,
  travel: number,
  diagonal: number,
): Glide {
  if (!timing) return { duration: glideMs(travel, diagonal), easing: GLIDE_EASE }
  const { duration, easing } = resolveTiming(el, timing)
  return { duration, easing }
}

/** Eases 0–1 progress by any CSS easing (springs' `linear()` included), via a paused animation. */
export function easingFn(easing: string): (p: number) => number {
  const effect = new KeyframeEffect(null, null, { duration: 1000, easing, fill: 'both' })
  const clock = new Animation(effect, document.timeline)
  return (p) => {
    clock.currentTime = p * 1000
    return effect.getComputedTiming().progress ?? p
  }
}
