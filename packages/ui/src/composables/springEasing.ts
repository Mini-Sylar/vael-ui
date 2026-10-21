import { stepSpring } from './useSpringValue'
import type { IndicatorSpring } from './useTabIndicator'

/** ConfigProvider's `motion` as an object: motion stays on, retimed. */
export interface MotionOptions {
  /** Drawers, sheets, toasts, sliding indicators and AnimatedNumber follow this spring. */
  spring?: IndicatorSpring
}

/** A spring as a CSS `linear()` easing, and the time it takes to settle, in ms. */
export function springEasing(spring: IndicatorSpring): { easing: string; duration: number } {
  const dt = 1 / 240
  const samples: number[] = [0]
  let state = { value: 0, velocity: 0 }
  let t = 0
  // Settled once it is within 0.5% of the target and has all but stopped.
  while (t < 5) {
    state = stepSpring(state, 1, dt, spring.damping, spring.response)
    t += dt
    samples.push(state.value)
    if (Math.abs(1 - state.value) < 0.005 && Math.abs(state.velocity) < 0.05) break
  }
  samples[samples.length - 1] = 1
  // About 60 points keeps the curve smooth and the string short.
  const stride = Math.max(1, Math.round(samples.length / 60))
  const points: string[] = []
  for (let i = 0; i < samples.length; i += stride) points.push(samples[i]!.toFixed(3))
  if ((samples.length - 1) % stride !== 0) points.push('1')
  return {
    easing: `linear(${points.map((point) => String(Number(point))).join(', ')})`,
    duration: Math.round(t * 1000),
  }
}

/** @internal The motion tokens that put drawers, toasts and numbers on one spring. Crossfades keep their own timing. */
export function springTokens(spring: IndicatorSpring): Record<`--ui-${string}`, string> {
  const { easing, duration } = springEasing(spring)
  const ms = `${duration}ms`
  return {
    '--ui-ease-drawer': easing,
    '--ui-duration-drawer': ms,
    '--ui-ease-toast': easing,
    '--ui-duration-toast': ms,
    '--ui-ease-pop': easing,
    '--ui-ease-number': easing,
    '--ui-duration-number': ms,
  }
}
