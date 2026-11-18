// Keyframe lists of different lengths each spread over the whole run, as in Motion: three rotate
// keyframes next to five opacity ones still turn through 0 halfway, instead of the shorter list
// holding its last value.
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'
import { settled } from '../src/motion/settled'
import { toKeyframes } from '../src/motion/values'

test('each property gets its own evenly spaced keyframes on one run', () => {
  const frames = toKeyframes({ rotate: [-25, 0, 25], opacity: [0, 1, 1, 1, 0] })!
  expect(frames.map((f) => f.offset)).toEqual([0, 0.25, 0.5, 0.75, 1])
  expect(frames.map((f) => f.rotate ?? null)).toEqual(['-25deg', null, '0deg', null, '25deg'])
  expect(frames.map((f) => f.opacity)).toEqual([0, 1, 1, 1, 0])
})

test('values that share a CSS property stay together', () => {
  const frames = toKeyframes({ x: [0, 100], y: [0, 10, 0] })!
  // x is stretched to y's three keyframes, so every translate names both.
  expect(frames.map((f) => f.translate)).toEqual(['0px 0px', '50px 10px', '100px 0px'])
})

test('lists of the same length are unchanged', () => {
  const frames = toKeyframes({ rotate: [0, 10], opacity: [0, 1] })!
  expect(frames).toHaveLength(2)
  expect(frames.every((f) => f.offset === undefined)).toBe(true)
})

test('a scrubbed look with uneven lists sits where each list says', async () => {
  const at = async (progress: number) => {
    const screen = await render(() =>
      withDirectives(h('div', { 'data-p': '' }), [
        [
          vAnimate,
          { animate: { rotate: [-25, 0, 25], opacity: [0, 1, 1, 1, 0] }, progress: () => progress },
        ],
      ]),
    )
    const el = screen.container.querySelector<HTMLElement>('[data-p]')!
    // The scrub starts once the directive has mounted and measured.
    await new Promise((resolve) => setTimeout(resolve, 200))
    await settled()
    const style = getComputedStyle(el)
    const out = { rotate: style.rotate, opacity: style.opacity }
    screen.unmount()
    return out
  }
  expect(await at(0.5)).toEqual({ rotate: '0deg', opacity: '1' })
  expect(await at(0.25)).toEqual({ rotate: '-12.5deg', opacity: '1' })
  expect(await at(1)).toEqual({ rotate: '25deg', opacity: '0' })
})
