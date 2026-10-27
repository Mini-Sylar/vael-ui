// One spring step, apart from useSpringValue so the spring compiler (springEasing) and the motion
// engines can use the physics without pulling in the composable.
export interface SpringState {
  value: number
  velocity: number
}

export const DEFAULT_DAMPING = 1
export const DEFAULT_RESPONSE = 0.35

// Semi-implicit Euler goes unstable on a stiff spring at 30fps; 240Hz substeps keep it exact.
const SUBSTEP = 1 / 240

/**
 * Advances a spring by `dt` seconds. Pure, so the physics is testable with plain
 * numbers instead of through rAF timing (same reasoning as `dockFalloff` and
 * `resolveSwipeCommit`).
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dt: number,
  damping: number = DEFAULT_DAMPING,
  response: number = DEFAULT_RESPONSE,
): SpringState {
  if (dt <= 0) return { value: state.value, velocity: state.velocity }
  // A zero or invalid spring would never settle; it arrives at once instead.
  if (!(response > 0) || !(damping >= 0)) return { value: target, velocity: 0 }
  const omega = (2 * Math.PI) / response
  const stiffness = omega * omega
  const dampingCoefficient = 2 * damping * omega
  const steps = Math.ceil(dt / SUBSTEP)
  const h = dt / steps
  let { value, velocity } = state
  for (let i = 0; i < steps; i++) {
    velocity += (-stiffness * (value - target) - dampingCoefficient * velocity) * h
    value += velocity * h
  }
  return { value, velocity }
}
