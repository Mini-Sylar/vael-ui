import { stepSpring } from './springStep'
import type { IndicatorSpring } from './useTabIndicator'

/** ConfigProvider's `motion` as an object: motion stays on, retimed. */
export interface MotionOptions {
  /** Drawers, sheets, toasts, sliding indicators and AnimatedNumber follow this spring. */
  spring?: IndicatorSpring
}

const cache = new Map<string, { easing: string; duration: number; arrival: number }>()

/** A spring as a CSS `linear()` easing, and the time it takes to settle, in ms. */
export function springEasing(spring: IndicatorSpring): { easing: string; duration: number } {
  const { easing, duration } = compileSpring(spring)
  return { easing, duration }
}

/** @internal When the spring first reaches its target (ms): what `after` waits for by default. */
export function springArrival(spring: IndicatorSpring): number {
  return compileSpring(spring).arrival
}

// Cached by value, so an inline `{ damping, response }` isn't recompiled on every render.
function compileSpring(spring: IndicatorSpring): {
  easing: string
  duration: number
  arrival: number
} {
  const key = `${spring.damping}|${spring.response}`
  const hit = cache.get(key)
  if (hit) return hit
  const compiled = sampleSpring(spring)
  if (cache.size > 64) cache.clear()
  cache.set(key, compiled)
  return compiled
}

function sampleSpring(spring: IndicatorSpring): {
  easing: string
  duration: number
  arrival: number
} {
  const dt = 1 / 240
  const samples: number[] = [0]
  let state = { value: 0, velocity: 0 }
  let t = 0
  let arrival = -1
  // Settled once it is within 0.5% of the target and has all but stopped.
  while (t < 5) {
    state = stepSpring(state, 1, dt, spring.damping, spring.response)
    t += dt
    samples.push(state.value)
    if (arrival < 0 && state.value >= 0.98) arrival = t
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
    arrival: Math.round((arrival < 0 ? t : arrival) * 1000),
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
