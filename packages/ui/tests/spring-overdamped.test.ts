// A spring damped past critical glides to its target without overshooting or jumping to it, as an
// underdamped one rings around it.
import { expect, test } from 'vitest'
import { stepSpring } from '../src/motion/springStep'

function path(damping: number, frames = 120) {
  let state = { value: 0, velocity: 0 }
  const values: number[] = []
  for (let i = 0; i < frames; i++) {
    state = stepSpring(state, 1, 1 / 60, damping, 0.35)
    values.push(state.value)
  }
  return values
}

test('an overdamped spring rises smoothly and never passes its target', () => {
  const values = path(3)
  expect(Math.max(...values)).toBeLessThanOrEqual(1)
  expect(values[0]!).toBeLessThan(0.2) // no snap to the target in the first frame
  expect(values.every((v, i) => i === 0 || v >= values[i - 1]!)).toBe(true)
  expect(values.at(-1)!).toBeGreaterThan(0.98)
})

test('an underdamped spring rings past its target and comes back', () => {
  const values = path(0.3)
  expect(Math.max(...values)).toBeGreaterThan(1.1)
  expect(values.at(-1)!).toBeCloseTo(1, 1)
})
