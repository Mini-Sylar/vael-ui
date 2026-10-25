import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import type { OtpInputMotion } from '../src/motion/types'

const SHAKE_MS = 300
const shake = { value: [0, -10, 9, -6, 0], duration: SHAKE_MS, easing: 'linear' }
// The states player loads at mount; a state that changes before it arrives isn't animated.
const loaded = () => new Promise((resolve) => setTimeout(resolve, 300))

function mount(motion: OtpInputMotion) {
  const invalid = shallowRef(false)
  const screen = render(() =>
    h(OtpInput, { length: 4, invalid: invalid.value, motion, 'aria-label': 'Code' }),
  )
  return { invalid, screen }
}

test("a state's onFinish runs once its animation has finished, not before", async () => {
  const onFinish = vi.fn()
  const { invalid } = mount({ states: { invalid: { root: { x: shake }, onFinish } } })
  await loaded()
  const start = performance.now()
  invalid.value = true
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS / 2))
  expect(onFinish).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  expect(performance.now() - start).toBeGreaterThanOrEqual(SHAKE_MS - 40)
  // The component's elements by part name; the repeated cells as an array.
  const parts = onFinish.mock.calls[0]![0]
  expect(parts.root.classList).toContain('ui-otp')
  expect(parts.cell).toHaveLength(4)
})

test('with a repeated part, every cell shaking, it still runs once', async () => {
  const onFinish = vi.fn()
  const { invalid } = mount({ states: { invalid: { cell: { x: shake }, onFinish } } })
  await loaded()
  invalid.value = true
  await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  await new Promise((resolve) => setTimeout(resolve, 150))
  expect(onFinish).toHaveBeenCalledTimes(1)
})

test('it does not run when the state turns off before the animation finishes', async () => {
  const onFinish = vi.fn()
  const { invalid } = mount({ states: { invalid: { root: { x: shake }, onFinish } } })
  await loaded()
  invalid.value = true
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS / 3))
  invalid.value = false
  await new Promise((resolve) => setTimeout(resolve, SHAKE_MS * 1.5))
  expect(onFinish).not.toHaveBeenCalled()
})

test('with nothing to play, it runs right away', async () => {
  const onFinish = vi.fn()
  const { invalid } = mount({ states: { invalid: { onFinish } } })
  await loaded()
  const start = performance.now()
  invalid.value = true
  await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  expect(performance.now() - start).toBeLessThan(SHAKE_MS / 2)
})
