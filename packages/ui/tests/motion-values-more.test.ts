import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import { vAnimate } from '../src/motion/vAnimate'
import { repeating } from '../src/motion/repeatPlan'
import { toKeyframe, toKeyframes } from '../src/motion/values'
import type { OtpInputMotion } from '../src/motion/types'

afterEach(() => {
  document.body.innerHTML = ''
})
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('3D turns and skews compose into transform, after any translate', () => {
  expect(toKeyframe({ rotateY: 180, perspective: 600 })).toEqual({
    transform: 'perspective(600px) rotateY(180deg)',
  })
  expect(toKeyframe({ x: 10, skewX: 5 }, false, 'transform')).toEqual({
    transform: 'translate(10px, 0) skewX(5deg)',
  })
  // Beside the individual properties, x and y keep `translate`.
  expect(toKeyframe({ x: 10, rotateX: 45 })).toEqual({
    translate: '10px 0',
    transform: 'rotateX(45deg)',
  })
})

test('pathLength draws a share of a stroke measured as 1 long', () => {
  expect(toKeyframe({ pathLength: 0.25, pathOffset: 0.5 })).toEqual({
    strokeDasharray: '0.25 1',
    strokeDashoffset: '-0.5',
  })
})

test('a null keyframe leaves the value out, so it plays from where it is', () => {
  const frames = toKeyframes({ opacity: [null, 0.2, 1] })!
  expect(frames[0]).not.toHaveProperty('opacity')
  expect(frames[1]!.opacity).toBe(0.2)
  // x and y too: no translate of 0 in its place.
  expect(toKeyframe({ x: null as never })).toEqual({})
})

test('repeatDelay holds between runs and ends as the last run does', () => {
  const plan = repeating([{ opacity: 0 }, { opacity: 1 }], 100, { repeat: 2, repeatDelay: 0.1 })!
  expect(plan.duration).toBe(200)
  expect(plan.every).toBe(200)
  // Three runs and two pauses: 500 ms, so 2.5 cycles of 200.
  expect(plan.iterations).toBe(2.5)
  expect(plan.frames.at(-1)).toMatchObject({ opacity: 1, offset: 1 })
  expect(plan.frames[1]).toMatchObject({ opacity: 1, offset: 0.5 })
})

test("'mirror' comes back the way it went, with the way there's easing", () => {
  const plan = repeating(
    [
      { opacity: 0, easing: 'ease-in' },
      { opacity: 1, easing: 'linear' },
    ],
    100,
    { repeat: 1, repeatType: 'mirror' },
  )!
  expect(plan.duration).toBe(200)
  expect(plan.iterations).toBe(1)
  const values = plan.frames.map((f) => f.opacity)
  expect(values[0]).toBe(0)
  expect(values.at(-1)).toBe(0)
  expect(values).toContain(1)
  // The way back's first segment eases as the way there's first did.
  // Several keyframes at the turn: the segment after it eases from the last of them.
  const turn = plan.frames.findLastIndex((f) => f.offset === 0.5)
  expect(plan.frames[turn]!.easing).toBe('ease-in')
})

test('nothing to plan without a pause or a mirror', () => {
  expect(repeating([{ opacity: 0 }, { opacity: 1 }], 100, { repeat: 3 })).toBeUndefined()
  expect(repeating([{ opacity: 0 }, { opacity: 1 }], 100, { repeatDelay: 1 })).toBeUndefined()
})

test('a state with repeatDelay waits between runs, and onRepeat counts each run', async () => {
  const onAfterEnter = vi.fn()
  const counts: number[] = []
  const invalid = shallowRef(false)
  const motion: OtpInputMotion = {
    states: {
      invalid: {
        root: {
          x: {
            value: [0, -8, 0],
            duration: 100,
            repeat: 2,
            repeatDelay: 0.1,
            onRepeat: (n: number) => counts.push(n),
          },
        },
        onAfterEnter,
      },
    },
  }
  render(() => h(OtpInput, { length: 4, invalid: invalid.value, motion, 'aria-label': 'Code' }))
  await wait(300)
  invalid.value = true
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 3000 })
  // Three runs of 100 and two pauses of 100.
  expect(performance.now() - start).toBeGreaterThanOrEqual(460)
  expect(counts).toEqual([1, 2])
})

test('v-animate measures a drawn path as 1 long', async () => {
  render(() =>
    h('svg', { viewBox: '0 0 10 10' }, [
      withDirectives(h('path', { d: 'M1 5 4 8 9 2', stroke: 'black', fill: 'none' }), [
        [vAnimate, { initial: { pathLength: 0 }, duration: 200 }],
      ]),
    ]),
  )
  await wait(60)
  const path = document.querySelector('path')!
  expect(path.getAttribute('pathLength')).toBe('1')
  // Mid-draw: a dash part of the way, easing toward its resting full dash.
  const [drawn] = getComputedStyle(path).strokeDasharray.split(/[ ,]+/).map(Number.parseFloat)
  expect(drawn).toBeGreaterThan(0)
  expect(drawn).toBeLessThan(1)
  await wait(250)
  expect(getComputedStyle(path).strokeDasharray.replace(/px/g, '')).toMatch(/^1,? 1$/)
})
