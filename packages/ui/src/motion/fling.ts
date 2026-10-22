// Gestures hand their speed to the motion that follows: a spring that starts at the release speed
// and settles, compiled to CSS `linear()` so it still runs on the compositor.
import { springEasing } from '../composables/springEasing'
import type { Spring } from './types'

/** The drawer's spring: critically damped, so a flick never bounces past where it rests. */
export const FLING_SPRING: Spring = { damping: 1, response: 0.4 }

/**
 * Timing for covering `distance` px when the finger let go at `velocity` px/ms (positive toward
 * where it's going, negative away from it).
 */
export function flingTiming(
  distance: number,
  velocity: number,
  spring: Spring = FLING_SPRING,
): { duration: number; easing: string } {
  const relative = distance !== 0 ? (velocity * 1000) / distance : 0
  return springEasing(spring, relative)
}
