import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import type { OtpInputMotion } from '../src/motion/types'

const SHAKE_MS = 300
const shake = { value: [0, -10, 9, -6, 0], duration: SHAKE_MS, easing: 'linear' }
// The states player loads at mount.
const loaded = () => new Promise((resolve) => setTimeout(resolve, 300))

function mount(motion: OtpInputMotion) {
  const invalid = shallowRef(false)
  const screen = render(() =>
    h(OtpInput, { length: 4, invalid: invalid.value, motion, 'aria-label': 'Code' }),
  )
  return { invalid, screen }
}

test("a state's onAfterEnter runs once its animation has finished, not before", async () => {
  const onAfterEnter = vi.fn()
  const { invalid } = mount({ states: { invalid: { root: { x: shake }, onAfterEnter } } })
  await loaded()
  const start = performance.now()
  invalid.value = true
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS / 2))
  expect(onAfterEnter).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1))
  expect(performance.now() - start).toBeGreaterThanOrEqual(SHAKE_MS - 40)
  // The component's elements by part name; the repeated cells as an array.
  const parts = onAfterEnter.mock.calls[0]![0]
  expect(parts.root.classList).toContain('ui-otp')
  expect(parts.cell).toHaveLength(4)
})

test('with a repeated part, every cell shaking, it still runs once', async () => {
  const onAfterEnter = vi.fn()
  const { invalid } = mount({ states: { invalid: { cell: { x: shake }, onAfterEnter } } })
  await loaded()
  invalid.value = true
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1))
  await new Promise((resolve) => setTimeout(resolve, 150))
  expect(onAfterEnter).toHaveBeenCalledTimes(1)
})

test('it does not run when the state turns off before the animation finishes', async () => {
  const onAfterEnter = vi.fn()
  const { invalid } = mount({ states: { invalid: { root: { x: shake }, onAfterEnter } } })
  await loaded()
  invalid.value = true
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS / 3))
  invalid.value = false
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS * 1.5))
  expect(onAfterEnter).not.toHaveBeenCalled()
})

test('with nothing to play, it runs right away', async () => {
  const onAfterEnter = vi.fn()
  const { invalid } = mount({ states: { invalid: { onAfterEnter } } })
  await loaded()
  const start = performance.now()
  invalid.value = true
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1))
  expect(performance.now() - start).toBeLessThan(SHAKE_MS / 2)
})

test('a state that is on at mount does not run onAfterEnter', async () => {
  const onAfterEnter = vi.fn()
  render(() =>
    h(OtpInput, {
      length: 4,
      invalid: true,
      motion: { states: { invalid: { root: { x: shake }, onAfterEnter } } },
      'aria-label': 'Code',
    }),
  )
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS * 2))
  expect(onAfterEnter).not.toHaveBeenCalled()
})

test("a state's onAfterLeave runs once it has turned off and settled back", async () => {
  const onAfterLeave = vi.fn()
  const { invalid } = mount({
    duration: SHAKE_MS,
    states: { invalid: { root: { opacity: 0.5 }, onAfterLeave } },
  })
  await loaded()
  invalid.value = true
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS * 1.5))
  expect(onAfterLeave).not.toHaveBeenCalled()
  invalid.value = false
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThan(40)
  expect(getComputedStyle(onAfterLeave.mock.calls[0]![0].root).opacity).toBe('1')
})

test('onRepeat runs as each repeat starts, with how many it has done', async () => {
  const counts: number[] = []
  const { invalid } = mount({
    states: {
      invalid: {
        root: {
          x: { ...shake, duration: 120, repeat: 2, onRepeat: (n: number) => counts.push(n) },
        },
      },
    },
  })
  await loaded()
  invalid.value = true
  await vi.waitFor(() => expect(counts).toEqual([1, 2]), { timeout: 2000 })
})
