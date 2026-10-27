// `pathOffset` as keyframes, with or without `pathLength` beside it: the offset moves.
import { expect, test } from 'vitest'
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
