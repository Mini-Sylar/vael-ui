import { stepSpring } from './springStep'
import type { Spring as IndicatorSpring } from './types'
import { springOf } from './springNames'
import type { SpringName } from './springNames'

export { SPRINGS, springOf } from './springNames'
export type { SpringName } from './springNames'

/** ConfigProvider's `motion` as an object: motion stays on, retimed. */
export interface MotionOptions {
  /** Drawers, sheets, toasts, sliding indicators and AnimatedNumber follow this spring: a name (`'bouncy'`) or `{ damping, response }`. */
  spring?: IndicatorSpring | SpringName
  /** A picked value crossfades into its field (Select, Combobox, TreeSelect, CascadeSelect,
   * DatePicker). `false` shows it plainly. @default true */
  valueSwap?: boolean
}

/** The drawer's spring: critically damped, so a flick never bounces past where it rests. */
export const FLING_SPRING: IndicatorSpring = { damping: 1, response: 0.4 }

const cache = new Map<string, { easing: string; duration: number; arrival: number }>()

// Settled once it's within this share of the distance and has all but stopped.
const SETTLED = 0.005
/** @internal The share of a move this long (px) that stays under half a pixel, so its end never jumps. */
export const settleFor = (distance: number): number =>
  distance > 100 ? Math.min(SETTLED, 0.5 / 2 ** Math.ceil(Math.log2(distance))) : SETTLED

/**
 * A spring as a CSS `linear()` easing, and the time it takes to settle, in ms. `velocity` is where
 * it starts moving, in distances per second (a flick handing its speed on); negative moves away.
 */
export function springEasing(
  spring: IndicatorSpring | SpringName,
  velocity = 0,
  /** @internal How close to the target counts as there (`settleFor`), a share of the distance. */
  settled = SETTLED,
): { easing: string; duration: number } {
  const { easing, duration } = compileSpring(spring, velocity, settled)
  return { easing, duration }
}

/** @internal When the spring first reaches its target (ms): what `after` waits for by default. */
export function springArrival(spring: IndicatorSpring | SpringName): number {
  return compileSpring(spring).arrival
}

// Cached by value, so an inline `{ damping, response }` isn't recompiled on every render.
function compileSpring(
  named: IndicatorSpring | SpringName,
  velocity = 0,
  settled = SETTLED,
): {
  easing: string
  duration: number
  arrival: number
} {
  const spring = springOf(named)
  const start = Math.round(velocity * 100) / 100
  const key = `${spring.damping}|${spring.response}|${start}|${settled}`
  const hit = cache.get(key)
  if (hit) return hit
  const compiled = sampleSpring(spring, start, settled)
  if (cache.size > 64) cache.clear()
  cache.set(key, compiled)
  return compiled
}

function sampleSpring(
  spring: IndicatorSpring,
  velocity: number,
  settled: number,
): {
  easing: string
  duration: number
  arrival: number
} {
  const dt = 1 / 240
  const samples: number[] = [0]
  let state = { value: 0, velocity }
  let t = 0
  let arrival = -1
  while (t < 5) {
    state = stepSpring(state, 1, dt, spring.damping, spring.response)
    t += dt
    samples.push(state.value)
    if (arrival < 0 && state.value >= 0.98) arrival = t
    if (Math.abs(1 - state.value) < settled && Math.abs(state.velocity) < settled * 10) break
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
