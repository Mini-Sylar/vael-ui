// `pathOffset` as keyframes, with or without `pathLength` beside it: the offset moves.
import { expect, test, vi } from 'vitest'
import { toKeyframe, toKeyframes } from '../src/motion/values'

test('pathOffset alone becomes a dash offset, so its keyframes move', () => {
  expect(toKeyframe({ pathOffset: 0.5 } as never).strokeDashoffset).toBe('-0.5')
  const frames = toKeyframes({ pathOffset: [0, 0.88] } as never)!
  expect(frames.map((f) => f.strokeDashoffset)).toEqual(['0', '-0.88'])
})

test('pathLength still sets the dash, and the offset beside it', () => {
  expect(toKeyframe({ pathLength: 0.12, pathOffset: 0.3 } as never)).toMatchObject({
    strokeDasharray: '0.12 1',
    strokeDashoffset: '-0.3',
  })
})

test('scaleX and scaleY are one-axis scales, unitless, in the transform', () => {
  expect(toKeyframe({ scaleY: 0.4 } as never).transform).toBe('scaleY(0.4)')
  expect(toKeyframe({ rotateY: 30, scaleX: 2 } as never).transform).toBe('rotateY(30deg) scaleX(2)')
})

test('scaleZ is a one-axis scale too, after scaleY in the transform', () => {
  expect(toKeyframe({ scaleX: 2, scaleZ: 3 } as never).transform).toBe('scaleX(2) scaleZ(3)')
  expect(toKeyframe({ rotateX: 10, scaleY: 1.5, scaleZ: 0.5 } as never).transform).toBe(
    'rotateX(10deg) scaleY(1.5) scaleZ(0.5)',
  )
})

test('pathLength 0 hides the stroke, so a round cap leaves no dot; any length shows it', () => {
  expect(toKeyframe({ pathLength: 0 } as never).visibility).toBe('hidden')
  expect(toKeyframe({ pathLength: 0.01 } as never).visibility).toBe('visible')
  // Yours wins.
  expect(toKeyframe({ pathLength: 0, visibility: 'visible' } as never).visibility).toBe('visible')
})

test('drawn on screen: no dot at 0, the line shows as soon as it starts', async () => {
  const { animate } = await import('../src/motion/animate')
  document.body.innerHTML =
    '<svg viewBox="0 0 24 24" width="48"><path d="M5 12h14" stroke="black" stroke-width="4" stroke-linecap="round" fill="none"/></svg>'
  const path = document.querySelector('path')!
  const run = animate(path, { pathLength: [0, 1] }, { duration: 400, easing: 'linear' })
  run.pause()
  // Its player loads on first use: seek once it's playing.
  await vi.waitFor(() => expect(path.getAnimations().length).toBeGreaterThan(0))
  run.time = 0
  await new Promise(requestAnimationFrame)
  expect(getComputedStyle(path).visibility).toBe('hidden')
  run.time = 100
  await new Promise(requestAnimationFrame)
  expect(getComputedStyle(path).visibility).toBe('visible')
  run.finish()
  await run
  expect(getComputedStyle(path).visibility).toBe('visible')
  await animate(path, { pathLength: 0 }, { duration: 50 })
  expect(getComputedStyle(path).visibility).toBe('hidden')
  document.body.innerHTML = ''
})
