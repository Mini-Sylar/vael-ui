// `animate()` on an element that's already moving: only the values a new call names give way; x and
// y are values of their own, so one never resets or stops the other, in a call or a sequence.
import '../src/style.css'
import { afterEach, expect, test } from 'vitest'
import { animate } from '../src/motion/animate'

afterEach(() => {
  document.body.innerHTML = ''
})

function box() {
  const el = document.createElement('div')
  el.style.cssText = 'width: 40px; height: 40px'
  document.body.append(el)
  return el
}
// [x, y]: `translate` drops a trailing 0 (`100px` is `100px 0px`).
const shown = (el: HTMLElement) => {
  const [x, y] = getComputedStyle(el).translate.split(' ')
  return [x, y].map((v) => Math.round(Number.parseFloat(v ?? '') || 0) + 0)
}
const linear = { duration: 200, easing: 'linear' } as const
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('a fade started straight after a move leaves the move playing', async () => {
  const el = box()
  const move = animate(el, { x: 200, y: -50, scale: 0.5, rotate: 20 }, linear)
  const fade = animate(el, { opacity: 0 }, { ...linear, delay: 0.1 })
  await Promise.all([move, fade])
  const style = getComputedStyle(el)
  expect(shown(el)).toEqual([200, -50])
  expect([style.scale, style.rotate, style.opacity]).toEqual(['0.5', '20deg', '0'])
  expect(el.getAnimations()).toHaveLength(0)
})

test('y on its own keeps x where an earlier call left it', async () => {
  const el = box()
  await animate(el, { x: 100 }, linear)
  await animate(el, { y: 50 }, linear)
  expect(shown(el)).toEqual([100, 50])
})

test('y started mid-flight leaves x flying, and x still lands', async () => {
  const el = box()
  const x = animate(el, { x: 200 }, { duration: 300, easing: 'linear' })
  await wait(100)
  const y = animate(el, { y: 80 }, linear)
  await wait(50)
  const [midX] = shown(el)
  expect(midX).toBeGreaterThan(30)
  expect(midX).toBeLessThan(200)
  await Promise.all([x, y])
  expect(shown(el)).toEqual([200, 80])
})

test('the same value again takes over from where it is, without a jump', async () => {
  const el = box()
  void animate(el, { x: 200, opacity: 0.5 }, { duration: 400, easing: 'linear' })
  await wait(150)
  const before = shown(el)[0]!
  const again = animate(el, { x: 0 }, linear)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(Math.abs(shown(el)[0]! - before)).toBeLessThan(25)
  await again
  await wait(300)
  // Opacity, which the second call didn't name, still got to its end.
  expect(shown(el)[0]).toBe(0)
  expect(getComputedStyle(el).opacity).toBe('0.5')
})

test('a sequence with overlapping steps on one element keeps every axis', async () => {
  const el = box()
  const seen: number[][] = []
  const run = animate(
    [
      [el, { y: -120, scale: 0.8 }, { duration: 300, easing: 'out' }],
      [el, { x: 200 }, { at: 0, duration: 500, easing: 'linear' }],
      [el, { y: 150, scale: 0.3 }, { at: 0.19, spring: { damping: 0.85, response: 0.2 } }],
    ],
    { delay: 0.05 },
  )
  const watch = setInterval(() => seen.push(shown(el)), 16)
  await run
  clearInterval(watch)
  expect(shown(el)).toEqual([200, 150])
  expect(getComputedStyle(el).scale).toBe('0.3')
  // x only ever moves forward, never back to 0 when the second y starts.
  const xs = seen.map(([x]) => x!)
  expect(xs.every((x, i) => i === 0 || x >= xs[i - 1]! - 1)).toBe(true)
  expect(el.getAnimations()).toHaveLength(0)
})

test('a reversed sequence of axes ends where it began', async () => {
  const el = box()
  const run = animate([
    [el, { x: 100 }, linear],
    [el, { y: 60 }, { ...linear, at: '-0.1' }],
  ])
  await wait(250)
  expect(shown(el)[1]).toBeGreaterThan(0)
  run.reverse()
  await run
  expect(shown(el)).toEqual([0, 0])
})

test('a move with nothing else moving stays a plain run the compositor can play', async () => {
  const el = box()
  const run = animate(el, { x: 100, y: 20 }, linear)
  await wait(30)
  for (const each of el.getAnimations())
    expect((each.effect as KeyframeEffect).composite).toBe('replace')
  await run
  // Steps one after another on one element: still plain runs.
  const seq = animate([
    [el, { y: 60 }, { ...linear, at: 0.3 }],
    [el, { x: 0 }, linear],
  ])
  await wait(30)
  for (const each of el.getAnimations())
    expect((each.effect as KeyframeEffect).composite).toBe('replace')
  await seq
  expect(shown(el)).toEqual([0, 60])
})

test('y on an x-and-y move stops only y; x flies on and lands', async () => {
  const el = box()
  const both = animate(el, { x: 200, y: 200 }, { duration: 300, easing: 'linear' })
  await wait(100)
  const y = animate(el, { y: -40 }, linear)
  await wait(50)
  const [midX] = shown(el)
  expect(midX).toBeGreaterThan(40)
  expect(midX).toBeLessThan(200)
  await Promise.all([both, y])
  expect(shown(el)).toEqual([200, -40])
})
