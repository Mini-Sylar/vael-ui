import { expect, test } from 'vitest'
import { flingTiming } from '../src/motion/fling'

// Distances per second over a compiled `linear()` curve's first segment.
function startSpeed({ easing, duration }: { easing: string; duration: number }) {
  const points = easing.slice(7, -1).split(',').map(Number)
  return (points[1]! - points[0]!) / (duration / 1000 / (points.length - 1))
}

test('a fling adds the release speed to the spring: 1.5 px/ms over 900 px is 1.67/s more', () => {
  // The spring is linear: the release velocity adds to its own pull from rest.
  const fromRest = flingTiming(900, 0)
  const flung = flingTiming(900, 1.5)
  expect(startSpeed(flung) - startSpeed(fromRest)).toBeGreaterThan(1.67 * 0.75)
  expect(startSpeed(flung) - startSpeed(fromRest)).toBeLessThan(1.67 * 1.25)
})

test('let go moving away from where it settles, it first slows, then comes back', () => {
  const points = flingTiming(300, -2).easing.slice(7, -1).split(',').map(Number)
  expect(points[1]).toBeLessThan(0)
  expect(points.at(-1)).toBe(1)
})

test('faster releases start faster', () => {
  expect(startSpeed(flingTiming(900, 3))).toBeGreaterThan(startSpeed(flingTiming(900, 1)))
})
