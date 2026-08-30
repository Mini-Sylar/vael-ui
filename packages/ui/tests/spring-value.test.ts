import { expect, test, vi } from 'vitest'
import { createSpring, stepSpring } from '../src/composables/useSpringValue'
import type { SpringState } from '../src/composables/useSpringValue'

// Pure integrator, driven with fixed timesteps rather than through rAF — real
// frame timing can't be reproduced in a test, and the physics is the part
// worth pinning down (same reasoning as dockFalloff / resolveSwipeCommit).
const FRAME = 1 / 60

function settle(
  from: number,
  target: number,
  { damping = 1, response = 0.35, velocity = 0, frames = 600 } = {},
): { state: SpringState; peak: number; frames: number } {
  let state: SpringState = { value: from, velocity }
  let peak = from
  let used = frames
  for (let i = 0; i < frames; i++) {
    state = stepSpring(state, target, FRAME, damping, response)
    peak = Math.abs(state.value - from) > Math.abs(peak - from) ? state.value : peak
    if (Math.abs(state.value - target) < 0.05 && Math.abs(state.velocity) < 0.05) {
      used = i + 1
      break
    }
  }
  return { state, peak, frames: used }
}

test('converges to the target from rest', () => {
  const { state } = settle(0, 100)
  expect(state.value).toBeCloseTo(100, 1)
  expect(Math.abs(state.velocity)).toBeLessThan(0.05)
})

test('critically damped (the default) never overshoots the target', () => {
  const { peak } = settle(0, 100, { damping: 1 })
  expect(peak).toBeLessThanOrEqual(100.0001)
})

test('underdamped overshoots — the bounce reserved for flick releases', () => {
  const { peak, state } = settle(0, 100, { damping: 0.6 })
  expect(peak).toBeGreaterThan(100)
  // Still settles exactly, it just gets there via overshoot.
  expect(state.value).toBeCloseTo(100, 1)
})

test('a lower response converges in fewer frames', () => {
  const fast = settle(0, 100, { response: 0.2 })
  const slow = settle(0, 100, { response: 0.6 })
  expect(fast.frames).toBeLessThan(slow.frames)
})

test('initial velocity carries into the motion — the gesture handoff', () => {
  // Same target, but thrown toward it: the moving spring must be further
  // along after one frame than the one starting from rest.
  const thrown = stepSpring({ value: 0, velocity: 400 }, 100, FRAME)
  const resting = stepSpring({ value: 0, velocity: 0 }, 100, FRAME)
  expect(thrown.value).toBeGreaterThan(resting.value)
})

test('velocity away from the target still resolves to the target', () => {
  const { state } = settle(0, 100, { velocity: -600 })
  expect(state.value).toBeCloseTo(100, 1)
})

test('re-targeting mid-flight keeps the live velocity (no hard cut)', () => {
  let state: SpringState = { value: 0, velocity: 0 }
  for (let i = 0; i < 10; i++) state = stepSpring(state, 100, FRAME)
  const midVelocity = state.velocity
  expect(midVelocity).toBeGreaterThan(0)
  // Re-target: the integrator reads the SAME state object, so the motion
  // continues from the live value/velocity rather than restarting at 0.
  const next = stepSpring(state, 0, FRAME)
  expect(next.velocity).toBeLessThan(midVelocity)
  expect(next.value).toBeGreaterThan(0)
})

test('a zero or negative timestep is a no-op', () => {
  const state = { value: 12, velocity: 34 }
  expect(stepSpring(state, 100, 0)).toEqual(state)
  expect(stepSpring(state, 100, -1)).toEqual(state)
})

test('already at the target with no velocity stays put', () => {
  const state = stepSpring({ value: 100, velocity: 0 }, 100, FRAME)
  expect(state.value).toBe(100)
  expect(state.velocity).toBe(0)
})

// ---------------------------------------------------------------------------
// createSpring — the rAF-driven runtime around the integrator above. These run
// in a real browser, so the shared frame loop is exercised for real.
// ---------------------------------------------------------------------------

test('jump moves instantly with no animation and no frames scheduled', () => {
  const frames: number[] = []
  const spring = createSpring(0, {}, (v) => frames.push(v))
  spring.jump(50)
  expect(spring.value).toBe(50)
  expect(spring.isAnimating).toBe(false)
  expect(frames).toEqual([50])
  spring.destroy()
})

test('set animates over real frames and settles exactly on the target', async () => {
  const spring = createSpring(0, { response: 0.15 })
  spring.set(100)
  expect(spring.isAnimating).toBe(true)
  await vi.waitFor(() => expect(spring.isAnimating).toBe(false), { timeout: 2000 })
  expect(spring.value).toBe(100)
  expect(spring.velocity).toBe(0)
  spring.destroy()
})

test('setting the target it already rests at does not start an animation', () => {
  const spring = createSpring(42, {})
  spring.set(42)
  expect(spring.isAnimating).toBe(false)
  spring.destroy()
})

test('stop parks at the live value instead of finishing the motion', async () => {
  const spring = createSpring(0, { response: 0.6 })
  spring.set(500)
  await vi.waitFor(() => expect(spring.value).toBeGreaterThan(1), { timeout: 2000 })
  const parked = spring.value
  spring.stop()
  expect(spring.isAnimating).toBe(false)
  expect(spring.value).toBe(parked)
  expect(spring.target).toBe(parked)
  spring.destroy()
})

test('independent springs animate concurrently on the one shared loop', async () => {
  const a = createSpring(0, { response: 0.15 })
  const b = createSpring(0, { response: 0.15 })
  a.set(10)
  b.set(-20)
  await vi.waitFor(
    () => {
      expect(a.isAnimating).toBe(false)
      expect(b.isAnimating).toBe(false)
    },
    { timeout: 2000 },
  )
  expect(a.value).toBe(10)
  expect(b.value).toBe(-20)
  a.destroy()
  b.destroy()
})
