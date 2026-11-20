// What every drag in vael-ui shares, apart from its own thresholds: how fast the pointer was
// moving when it let go (from motion, where exits read speed too), and how a pull past an end
// gives. Internal; never exported.
import { motionSpringAt } from '../motion/styleHolder'
import { DEFAULT_SPRING, SPRINGS, springOf } from '../motion/springNames'
import type { SpringName } from '../motion/springNames'
import type { Spring } from '../motion/types'
export { createVelocityTracker } from '../motion/velocity'
export type { VelocityTracker } from '../motion/velocity'

/** Movement before a press is a drag, not a click: the one threshold for every drag. */
export const DRAG_THRESHOLD = 8

export interface GestureSprings {
  /** Where a pull past the end of a list goes back to: quick and without a bounce. */
  end: Spring
  /** Where a hand's release sends a card back home: a little give, less than a throw's. */
  home: Spring
  /** Where a button, a key or a slow placement sends it: the spring as given. */
  settle: Spring
  /** Where a hand's release sends it: a little give, never more than the app's own spring has. */
  thrown: Spring
  /** Under reduced motion: short, with none. */
  reduced: Spring
}

/**
 * The springs a gesture settles on. One source: the spring you name, else the nearest
 * ConfigProvider's (`:motion="{ spring }"`), else the default every component uses. A button or a key uses it as given. A
 * hand's release has a little give (never a fling), the end of a list has none, and reduced motion
 * has none.
 */
export function gestureSprings(el: Element | null, own?: Spring | SpringName): GestureSprings {
  const base = springOf(own ?? (el && motionSpringAt(el)) ?? DEFAULT_SPRING) as Spring
  const response = base.response ?? DEFAULT_SPRING.response ?? 0.32
  return {
    settle: { damping: base.damping ?? 1, response },
    // A hand's release has some give, between 0.5 and 0.6: a very bouncy app spring (damping 0.25)
    // would otherwise fling it.
    thrown: { damping: Math.max(0.5, Math.min(base.damping ?? 1, 0.6)), response },
    home: { damping: Math.max(0.6, Math.min(base.damping ?? 1, 0.8)), response },
    end: { damping: 1, response: Math.min(response, SPRINGS.snappy.response ?? 0.25) },
    reduced: { damping: 1, response: SPRINGS.snappy.response },
  }
}

/** How far a pull past an end shows: starts 1:1, then gives up (a shifted log, as iOS does). */
export function dampen(overshoot: number, range = 60): number {
  return range * Math.log(1 + overshoot / range)
}

/**
 * How many screen px one px of `translate` moves `el`, along each axis: 1, unless an ancestor is
 * scaled (a preview at half size), where a drag of 100 px must move it 200 translate px to stay
 * under the finger. Measured by moving it and putting it back, in the one frame, unseen.
 */
export function screenPerTranslate(el: HTMLElement): { x: number; y: number } {
  const own = el.style.translate
  const before = el.getBoundingClientRect()
  el.style.translate = '100px 100px'
  const after = el.getBoundingClientRect()
  el.style.translate = own
  const x = (after.left - before.left) / 100
  const y = (after.top - before.top) / 100
  return { x: x > 0.05 ? x : 1, y: y > 0.05 ? y : 1 }
}

/**
 * The speed to hand a critically damped spring so it swings out past its target by at most `max`
 * px and no further, as a rubber band at the end of a list does. `past` is how far beyond the
 * target it is now (negative inside), `speed` its outward speed in px/s. A speed that would
 * overshoot is lowered; one that wouldn't is left alone.
 */
export function limitOvershoot(past: number, speed: number, response: number, max: number): number {
  const w = (2 * Math.PI) / response
  const peak = (u: number) => {
    let m = Math.max(past, 0)
    for (let t = 0; t < 2; t += 0.004)
      m = Math.max(m, (past + (u + w * past) * t) * Math.exp(-w * t))
    return m
  }
  if (peak(speed) <= max) return speed
  // Already beyond `max`: no more outward speed than lets it come straight back.
  if (past > max) return -w * past
  let lo = -w * 100
  let hi = speed
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (peak(mid) > max) hi = mid
    else lo = mid
  }
  return lo
}
