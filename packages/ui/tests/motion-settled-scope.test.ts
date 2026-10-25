import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import Loader from '../src/components/Loader/Loader.vue'
import { settled } from '../src/motion/settled'
import type { OtpInputMotion } from '../src/motion/types'

const SHAKE_MS = 400
const shake: OtpInputMotion = {
  states: {
    invalid: { root: { x: { value: [0, -10, 9, -6, 0], duration: SHAKE_MS, easing: 'linear' } } },
  },
}

test('settled(el) waits for the state a change just started on that element', async () => {
  const invalid = shallowRef(false)
  const screen = await render(() =>
    h(OtpInput, { length: 4, invalid: invalid.value, motion: shake, 'aria-label': 'Code' }),
  )
  const el = screen.container.querySelector<HTMLElement>('.ui-otp')!
  // The states player loads at mount; a state that changes before it arrives isn't animated.
  await new Promise((resolve) => setTimeout(resolve, 300))
  const start = performance.now()
  invalid.value = true
  await settled(el)
  expect(performance.now() - start).toBeGreaterThanOrEqual(SHAKE_MS - 40)
  const left = el
    .getAnimations({ subtree: true })
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .filter((a) => a.playState === 'running')
  expect(left).toEqual([])
})

test('settled(el) resolves at once with no element, or nothing playing there', async () => {
  let start = performance.now()
  await settled(null)
  expect(performance.now() - start).toBeLessThan(20)

  const screen = await render(() => h(OtpInput, { length: 4, motion: false, 'aria-label': 'Code' }))
  await nextTick()
  start = performance.now()
  await settled(screen.container.querySelector('.ui-otp'))
  expect(performance.now() - start).toBeLessThan(SHAKE_MS / 2)
})

test('settled(el) does not wait for an endless loop inside it, such as a loader', async () => {
  const screen = await render(() => h('div', { class: 'box' }, [h(Loader, { label: 'Saving' })]))
  const start = performance.now()
  await settled(screen.container.querySelector('.box'))
  expect(performance.now() - start).toBeLessThan(SHAKE_MS / 2)
})
