import { getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import type { Ref } from 'vue'

export interface SpringOptions {
  /** Damping ratio. `1` (the default) is critically damped — reaches the target with no overshoot. Below 1 overshoots and oscillates; reserve that for motion the user's own gesture already threw (a flick release), never for something that merely appeared. */
  damping?: number
  /** Seconds to reach the target. Deliberately NOT a duration — a spring has no fixed end; this sets how *quickly* it converges and the real settle time emerges from the physics. */
  response?: number
  /** Below this distance AND this speed (per second), the spring snaps to the target and parks. Defaults suit px; raise it for values on a 0–1 scale. */
  epsilon?: number
}

export interface SpringState {
  value: number
  velocity: number
}

const DEFAULT_DAMPING = 1
const DEFAULT_RESPONSE = 0.35
const DEFAULT_EPSILON = 0.05
// A backgrounded tab hands back a multi-second dt on its first frame. Feeding
// that to the integrator below launches the value into the void — every spring
// on screen visibly explodes on tab refocus. Clamping costs one slow frame.
const MAX_DT = 1 / 30

/**
 * One semi-implicit Euler step. Pure, so the physics is testable with plain
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
  const omega = (2 * Math.PI) / response
  const stiffness = omega * omega
  const dampingCoefficient = 2 * damping * omega
  const acceleration = -stiffness * (state.value - target) - dampingCoefficient * state.velocity
  const velocity = state.velocity + acceleration * dt
  return { value: state.value + velocity * dt, velocity }
}

export interface SpringHandle {
  /** Live presentation value — what's actually on screen this frame. */
  readonly value: number
  readonly velocity: number
  readonly target: number
  readonly isAnimating: boolean
  /** Re-targets from the CURRENT presentation value and velocity, never from the previous target — that's what makes a spring interruptible mid-flight instead of jumping. Pass `velocity` to hand off a gesture's release speed so there's no seam between drag and animation. */
  set: (target: number, options?: { velocity?: number }) => void
  /** Teleports with no motion (initial placement, or a reduced-motion path). */
  jump: (value: number) => void
  /** Parks at the current value, dropping the remaining motion. */
  stop: () => void
  destroy: () => void
}

// One rAF loop drives every live spring. A per-spring loop would mean ~100
// concurrent rAF callbacks while dragging a long list — the loop parks itself
// whenever nothing is animating, so an idle page schedules no frames at all.
type SpringRunner = { advance: (dt: number) => void }
const active = new Set<SpringRunner>()
// Reused scratch buffer: a settling spring removes ITSELF from `active` mid
// tick, so the set can't be iterated live — and allocating a fresh copy every
// frame is the one thing a 60fps loop shouldn't do.
const ticking: SpringRunner[] = []
let frameId = 0
let lastFrameTime = 0

function tick(now: number) {
  const dt = Math.min((now - lastFrameTime) / 1000, MAX_DT)
  lastFrameTime = now
  ticking.length = 0
  for (const spring of active) ticking.push(spring)
  for (const spring of ticking) spring.advance(dt)
  ticking.length = 0
  frameId = active.size > 0 ? requestAnimationFrame(tick) : 0
}

function schedule(spring: SpringRunner) {
  if (typeof requestAnimationFrame === 'undefined') return
  active.add(spring)
  if (frameId) return
  lastFrameTime = performance.now()
  frameId = requestAnimationFrame(tick)
}

function unschedule(spring: SpringRunner) {
  active.delete(spring)
}

/**
 * Imperative spring, deliberately outside Vue's reactivity: the sortable
 * engine runs one per row and writes straight to `el.style.translate` every
 * frame, where routing ~100 values through refs would schedule ~100 component
 * re-renders per frame instead. `useSpringValue` below is the reactive wrapper
 * for the cases that do want a ref.
 */
export function createSpring(
  initial: number,
  options: SpringOptions = {},
  onFrame?: (value: number) => void,
): SpringHandle {
  const damping = options.damping ?? DEFAULT_DAMPING
  const response = options.response ?? DEFAULT_RESPONSE
  const epsilon = options.epsilon ?? DEFAULT_EPSILON

  let state: SpringState = { value: initial, velocity: 0 }
  let target = initial
  let animating = false

  const runner = {
    advance(dt: number) {
      state = stepSpring(state, target, dt, damping, response)
      const settled = Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon
      if (settled) {
        state = { value: target, velocity: 0 }
        animating = false
        unschedule(runner)
      }
      onFrame?.(state.value)
    },
  }

  return {
    get value() {
      return state.value
    },
    get velocity() {
      return state.velocity
    },
    get target() {
      return target
    },
    get isAnimating() {
      return animating
    },
    set(next, setOptions) {
      target = next
      if (setOptions?.velocity != null) state.velocity = setOptions.velocity
      if (Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon) {
        state = { value: target, velocity: 0 }
        animating = false
        unschedule(runner)
        onFrame?.(state.value)
        return
      }
      animating = true
      schedule(runner)
    },
    jump(next) {
      target = next
      state = { value: next, velocity: 0 }
      animating = false
      unschedule(runner)
      onFrame?.(next)
    },
    stop() {
      target = state.value
      state = { value: state.value, velocity: 0 }
      animating = false
      unschedule(runner)
    },
    destroy() {
      animating = false
      unschedule(runner)
    },
  }
}

export interface UseSpringValueReturn {
  /** Read-only live value. Drive it with `set`/`jump`, never by assigning. */
  value: Ref<number>
  set: SpringHandle['set']
  jump: SpringHandle['jump']
  stop: SpringHandle['stop']
}

/** Reactive wrapper over `createSpring`, auto-disposed with the owning scope. */
export function useSpringValue(initial: number, options: SpringOptions = {}): UseSpringValueReturn {
  const value = shallowRef(initial)
  const spring = createSpring(initial, options, (next) => {
    value.value = next
  })
  if (getCurrentScope()) onScopeDispose(() => spring.destroy())
  return { value, set: spring.set, jump: spring.jump, stop: spring.stop }
}
