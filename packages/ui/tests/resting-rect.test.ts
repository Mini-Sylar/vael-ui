// restingRect: an element's box once what moves it has played out, without disturbing the motion.
import { afterEach, expect, test } from 'vitest'
import { restingRect } from '../src/composables/dom'

afterEach(() => {
  document.body.innerHTML = ''
})

function nested() {
  const panel = document.createElement('div')
  panel.style.cssText = 'position: absolute; left: 100px; top: 100px; width: 200px; height: 100px'
  const target = document.createElement('button')
  target.style.cssText = 'display: block; width: 50px; height: 20px'
  panel.append(target)
  document.body.append(panel)
  return { panel, target }
}

test('it reads the box an ancestor animation ends on, and leaves the animation where it was', async () => {
  const { panel, target } = nested()
  const rest = target.getBoundingClientRect()
  const run = panel.animate(
    [
      { scale: '0.5', translate: '0 200px' },
      { scale: '1', translate: '0 0' },
    ],
    {
      duration: 10_000,
    },
  )
  run.currentTime = 2000
  const moving = target.getBoundingClientRect()
  expect(Math.abs(moving.top - rest.top)).toBeGreaterThan(50)

  const resting = restingRect(target)
  expect(resting.top).toBeCloseTo(rest.top, 0)
  expect(resting.left).toBeCloseTo(rest.left, 0)
  expect(resting.width).toBeCloseTo(rest.width, 0)
  // Put back exactly, still running, and not finished early.
  expect(run.currentTime).toBe(2000)
  expect(run.playState).toBe('running')
  let finished = false
  // Cancelling below rejects `finished`; only an early resolve counts.
  run.finished.then(
    () => (finished = true),
    () => {},
  )
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(finished).toBe(false)
  run.cancel()
})

test('an endless loop and an unrelated animation stay where they are', () => {
  const { panel, target } = nested()
  const other = document.createElement('div')
  document.body.append(other)
  const loop = panel.animate([{ translate: '0 0' }, { translate: '0 40px' }], {
    duration: 1000,
    iterations: Infinity,
  })
  loop.currentTime = 500
  const unrelated = other.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000 })
  unrelated.currentTime = 300
  const now = target.getBoundingClientRect()
  expect(restingRect(target).top).toBeCloseTo(now.top, 0)
  expect(loop.currentTime).toBe(500)
  expect(unrelated.currentTime).toBe(300)
  loop.cancel()
  unrelated.cancel()
})

test('with nothing animating it is the box as it is', () => {
  const { target } = nested()
  const now = target.getBoundingClientRect()
  const resting = restingRect(target)
  expect([resting.top, resting.left, resting.width, resting.height]).toEqual([
    now.top,
    now.left,
    now.width,
    now.height,
  ])
})
