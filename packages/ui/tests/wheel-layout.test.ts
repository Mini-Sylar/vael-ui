// Where items sit along a wheel, and the maps between rows and positions.
import { expect, test } from 'vitest'
import { wheelLayout } from '../src/composables/wheelLayout'
import type { WheelLayoutInput } from '../src/composables/wheelLayout'

const base: WheelLayoutInput = {
  count: 10,
  size: 100,
  gap: 0,
  align: 'start',
  viewport: 300,
  loop: false,
  containScroll: false,
  slidesToScroll: 1,
}
const make = (over: Partial<WheelLayoutInput> = {}) => wheelLayout({ ...base, ...over })

test('equal rows: a row is its index, and a position maps back to it', () => {
  const l = make()
  expect(l.pxOf(3)).toBe(300)
  expect(l.rowAt(300)).toBe(3)
  expect(l.rowAt(350)).toBe(3.5)
  expect(l.pitch).toBe(100)
})

test('a gap adds to every step', () => {
  const l = make({ gap: 20 })
  expect(l.pxOf(2)).toBe(240)
  expect(l.rowAt(240)).toBe(2)
  expect(l.pitch).toBe(120)
})

test('rows of different lengths put each anchor where the row starts or is centred', () => {
  const start = make({ sizes: [100, 200, 50], count: 3 })
  expect(start.anchor).toEqual([0, 100, 300])
  const middle = make({ sizes: [100, 200, 50], count: 3, align: 'center' })
  expect(middle.anchor).toEqual([50, 200, 325])
  // Halfway between two rows is halfway between their anchors, not the same as halfway in px.
  expect(middle.rowAt(125)).toBeCloseTo(0.5, 5)
  expect(middle.pxOf(1.5)).toBeCloseTo(262.5, 5)
})

test('past the ends the rows carry on at the end pitch, so a pull past them still reads', () => {
  const l = make()
  expect(l.rowAt(-50)).toBe(-0.5)
  expect(l.rowAt(1050)).toBe(10.5)
  expect(l.pxOf(-1)).toBe(-100)
})

test('rests are clamped between the first and last anchor', () => {
  const l = make()
  expect([l.lo, l.hi]).toEqual([0, 900])
  expect(l.clamp(-40)).toBe(0)
  expect(l.clamp(2000)).toBe(900)
})

test('containScroll stops with the last row flush against the end', () => {
  const l = make({ containScroll: true })
  // 10 rows of 100 in a 300 viewport: the furthest it goes is 700.
  expect([l.lo, l.hi]).toEqual([0, 700])
  expect(l.snapNear(900)).toBe(700)
  expect(l.snapNear(650)).toBe(700)
  expect(l.snapNear(520)).toBe(500)
})

test('content shorter than the viewport has nowhere to go with containScroll', () => {
  const l = make({ containScroll: true, count: 2 })
  expect([l.lo, l.hi]).toEqual([0, 0])
})

test('snapNear rests on the nearest row, and on a multiple of slidesToScroll', () => {
  expect(make().snapNear(340)).toBe(300)
  expect(make().snapNear(360)).toBe(400)
  const pages = make({ slidesToScroll: 3 })
  expect(pages.snapNear(340)).toBe(300)
  expect(pages.snapNear(520)).toBe(600)
  expect(pages.snapNear(10)).toBe(0)
})

test('a loop counts rows past the ends, one lap at a time', () => {
  const l = make({ loop: true })
  expect(l.period).toBe(1000)
  expect(l.rowAt(1000)).toBe(10)
  expect(l.rowAt(-100)).toBe(-1)
  expect(l.pxOf(12)).toBe(1200)
  expect(l.pxOf(-3)).toBe(-300)
  expect(l.snapNear(1230)).toBe(1200)
  expect(l.clamp(5000)).toBe(5000)
})

test('a loop of unequal rows still maps both ways', () => {
  const l = make({ loop: true, sizes: [100, 300, 100], count: 3, gap: 0 })
  for (const row of [0, 0.5, 1, 1.7, 2.3, 3, 4.5, -0.5, -2]) {
    expect(l.rowAt(l.pxOf(row))).toBeCloseTo(row, 5)
  }
})

test('no rows is a layout that does nothing', () => {
  const l = make({ count: 0 })
  expect(
    [l.rowAt(10), l.pxOf(3), l.snapNear(10), l.clamp(10)].every((v) => Number.isFinite(v)),
  ).toBe(true)
})
