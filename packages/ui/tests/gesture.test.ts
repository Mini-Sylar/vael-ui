// The shared drag maths: release speed over the last window, and the give past an end.
import { expect, test } from 'vitest'
import { createVelocityTracker, dampen } from '../src/composables/gesture'

// Samples every 8 ms along `phases` ([ms, distance]), released right after the last one.
function drag(phases: [number, number][], hold = 0, windowMs?: number) {
  const tracker = createVelocityTracker(windowMs)
  let t = 0
  let y = 0
  tracker.reset(0, 0)
  for (const [ms, distance] of phases) {
    const steps = Math.max(1, Math.round(ms / 8))
    for (let i = 1; i <= steps; i++) tracker.add(y + (distance * i) / steps, t + (ms * i) / steps)
    t += ms
    y += distance
  }
  return tracker.velocity(t + hold)
}

test('a steady drag reads at its own speed', () => {
  expect(drag([[1200, 300]])).toBeCloseTo(0.25, 2)
})

test('a slow drag that ends in a flick reads as the flick', () => {
  expect(
    drag([
      [800, 100],
      [60, 60],
    ]),
  ).toBeGreaterThan(0.6)
})

test('a fast drag that stopped and held before letting go reads as still', () => {
  expect(drag([[150, 150]], 300)).toBe(0)
})

test('a short drag is judged over its own length, not a window it never had', () => {
  expect(drag([[40, 20]])).toBeCloseTo(0.5, 2)
})

test('a press and release in the same tick read as a jump', () => {
  const tracker = createVelocityTracker()
  tracker.reset(0, 100)
  tracker.add(60, 100)
  expect(tracker.velocity(100)).toBe(60)
})

test('it goes the other way when the pointer does', () => {
  expect(drag([[100, -80]])).toBeCloseTo(-0.8, 2)
})

test('a reset forgets the drag before it', () => {
  const tracker = createVelocityTracker()
  tracker.reset(0, 0)
  tracker.add(100, 50)
  tracker.reset(100, 60)
  expect(tracker.velocity(60)).toBe(0)
})

test('dampen follows the pointer at first, then gives up', () => {
  expect(dampen(1)).toBeCloseTo(1, 1)
  expect(dampen(600)).toBeLessThan(150)
  expect(dampen(200)).toBeGreaterThan(dampen(100))
})
