// What every drag in vael-ui shares, apart from its own thresholds: how fast the pointer was
// moving when it let go (from motion, where exits read speed too), and how a pull past an end
// gives. Internal; never exported.
export { createVelocityTracker } from '../motion/velocity'
export type { VelocityTracker } from '../motion/velocity'

/** How far a pull past an end shows: starts 1:1, then gives up (a shifted log, as iOS does). */
export function dampen(overshoot: number, range = 60): number {
  return range * Math.log(1 + overshoot / range)
}
