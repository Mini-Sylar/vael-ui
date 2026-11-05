// `animate([...steps])`: one sequence. Each step starts after the one before unless its `at` says
// otherwise, and the whole sequence is steered as one: paused, sought, reversed, sped up.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { animate } from '../src/motion/animate'

afterEach(() => {
  document.body.innerHTML = ''
})

function box(cls: string) {
  const el = document.createElement('div')
  el.className = cls
  el.style.cssText = 'width: 40px; height: 40px'
  document.body.append(el)
  return el
}
const shownX = (el: HTMLElement) =>
  Number.parseFloat(getComputedStyle(el).translate.split(' ')[0]!) || 0
const linear = { duration: 200, easing: 'linear' } as const

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

/** Seeks the (paused) sequence to `ms` and reads where each box is, once its code has loaded. */
async function at(run: ReturnType<typeof animate>, ms: number, ...els: HTMLElement[]) {
  await new Promise((resolve) => setTimeout(resolve, 30))
  run.time = ms
  await frame()
  return els.map(shownX)
}

test('steps play one after another, and the end stays as their own style', async () => {
  const a = box('a')
  const b = box('b')
  const start = performance.now()
  await animate([
    [a, { x: 100 }, linear],
    [b, { x: 100 }, linear],
  ])
  expect(performance.now() - start).toBeGreaterThanOrEqual(360)
  expect(a.style.translate).toBe('100px')
  expect(b.style.translate).toBe('100px')
  expect(a.getAnimations()).toHaveLength(0)
})

test('`at` places a step: a gap, an overlap, a share of the step before, seconds from the start', async () => {
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(box)
  const run = animate([
    [a!, { x: 100 }, linear], // 0–200
    [b!, { x: 100 }, { ...linear, at: '+0.1' }], // 300–500
    [c!, { x: 100 }, { ...linear, at: '-0.1' }], // 400–600
    [d!, { x: 100 }, { ...linear, at: '50%' }], // halfway through c: 500–700
    [e!, { x: 100 }, { ...linear, at: 0.05 }], // 50–250
  ])
  run.pause()
  expect((await at(run, 100, a!, b!, e!)).map(Math.round)).toEqual([50, 0, 25])
  expect((await at(run, 400, b!, c!)).map(Math.round)).toEqual([50, 0])
  expect((await at(run, 600, c!, d!)).map(Math.round)).toEqual([100, 50])
})

test('a step can start with, or part of the way through, a named step', async () => {
  const [a, b, c] = ['a', 'b', 'c'].map(box)
  const run = animate([
    [a!, { x: 100 }, { ...linear, name: 'cards' }], // 0–200
    [b!, { x: 100 }, { ...linear, at: '+0.5' }], // 700–900
    [c!, { x: 100 }, { ...linear, at: 'cards:50%' }], // 100–300
  ])
  run.pause()
  expect((await at(run, 200, c!)).map(Math.round)).toEqual([50])
  // Steps on boxes the first sequence left mid-way (c at 50) go on from there.
  const withStart = animate([
    [a!, { x: 0 }, { ...linear, name: 'back' }],
    [b!, { x: 0 }, { ...linear, at: '+1' }],
    [c!, { x: 0 }, { ...linear, at: 'back' }],
  ])
  withStart.pause()
  expect((await at(withStart, 100, a!, c!)).map(Math.round)).toEqual([50, 25])
})

test('two steps on one element: the second carries on from where the first ends', async () => {
  const a = box('a')
  const run = animate([
    [a, { x: 100 }, linear],
    [a, { x: 0 }, linear],
  ])
  run.pause()
  expect(Math.round((await at(run, 100, a))[0]!)).toBe(50)
  expect(Math.round((await at(run, 200, a))[0]!)).toBe(100)
  expect(Math.round((await at(run, 300, a))[0]!)).toBe(50)
  // Sought back to the start, the first step plays again from where it began.
  expect(Math.round((await at(run, 0, a))[0]!)).toBe(0)
})

test('the sequence reverses as one, and resolves once it is back at the start', async () => {
  const a = box('a')
  const b = box('b')
  const run = animate([
    [a, { x: 100 }, linear],
    [b, { x: 100 }, linear],
  ])
  run.pause()
  run.time = 300 // a done, b halfway
  run.reverse()
  run.play()
  await new Promise((resolve) => setTimeout(resolve, 60))
  // Playing back: b goes back first; a has not started back yet.
  expect(shownX(b)).toBeLessThan(50)
  expect(shownX(a)).toBe(100)
  await run
  expect(shownX(a)).toBe(0)
})

test('stagger inside a step, and the next step waits for the last element', async () => {
  const rows = ['r1', 'r2', 'r3'].map(box)
  const after = box('after')
  const run = animate([
    [rows, { x: 100 }, { ...linear, stagger: 0.1 }], // 0–200, 100–300, 200–400
    [after, { x: 100 }, linear], // 400–600
  ])
  run.pause()
  expect((await at(run, 300, ...rows)).map(Math.round)).toEqual([100, 100, 50])
  expect(Math.round((await at(run, 500, after))[0]!)).toBe(50)
})

test('an `at` naming a later step, or no step, warns and starts after the step before', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const [a, b, c] = ['a', 'b', 'c'].map(box)
  const run = animate([
    [a!, { x: 100 }, linear],
    // 'later' is declared, below this step: the types allow it, the warning catches it.
    [b!, { x: 100 }, { ...linear, at: 'later' }],
    [c!, { x: 100 }, { ...linear, name: 'later', at: 'nope' as 'later' }],
  ])
  run.pause()
  expect((await at(run, 300, b!)).map(Math.round)).toEqual([50])
  const said = warn.mock.calls.flat().join(' ')
  expect(said).toContain("the step named 'later' comes later in the list")
  expect(said).toContain("no step is named 'nope'")
  warn.mockRestore()
})
