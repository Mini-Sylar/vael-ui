// `stagger: 'random'` spaces the elements out in a shuffled order, the same shuffle for the whole
// group while it plays.
import { expect, test } from 'vitest'
import { staggerAt } from '../src/motion/playable'

const group = (count: number) =>
  Array.from({ length: count }, () => document.createElement('div')) as readonly Element[]

test("'random' gives every element its own step, 0 to count - 1, in no fixed order", () => {
  const all = group(8)
  const steps = all.map((el, i) => staggerAt('random', i, all.length, el, all) / 0.04)
  expect(steps.map(Math.round).toSorted((a, b) => a - b)).toEqual(
    Array.from({ length: 8 }, (_, i) => i),
  )
  // The same group plays the same shuffle if asked again, and a new group is shuffled again.
  expect(all.map((el, i) => staggerAt('random', i, all.length, el, all) / 0.04)).toEqual(steps)
  const orders = new Set(
    Array.from({ length: 8 }, () => {
      const next = group(8)
      return next.map((el, i) => Math.round(staggerAt('random', i, 8, el, next) / 0.04)).join()
    }),
  )
  expect(orders.size).toBeGreaterThan(1)
})

test("'random' without the group still spreads across the steps", () => {
  const steps = Array.from({ length: 6 }, (_, i) => staggerAt('random', i, 6))
  expect(steps.every((step) => step >= 0 && step <= 5 * 0.04 + 1e-9)).toBe(true)
})

test('the default step stops at about 0.3 s, and a step you give goes as far as you say', () => {
  expect(staggerAt(true, 3, 40)).toBeCloseTo(0.12)
  expect(staggerAt(true, 39, 40)).toBeCloseTo(0.28)
  expect(staggerAt('end', 0, 40)).toBeCloseTo(0.28)
  expect(staggerAt(0.04, 39, 40)).toBeCloseTo(1.56)
})
