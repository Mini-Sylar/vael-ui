// A state's `replay`: while it stays on, a new value plays its keyframes again (a second wrong
// code shakes, though the field never stopped being invalid). Off, a new value plays nothing.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Input from '../src/components/Input/Input.vue'
import type { InputMotion } from '../src/motion/types'

const frame = () => new Promise(requestAnimationFrame)
const running = () =>
  (document.querySelector('.ui-input')?.getAnimations() ?? []).filter(
    (a) => a.id === 'ui-state' && a.playState === 'running',
  )
const settle = async () => {
  while (running().length) await frame()
}

test('a state plays again while on when its replay changes, and not while off', async () => {
  const invalid = shallowRef(false)
  const attempts = shallowRef(0)
  render({
    setup: () => () =>
      h(Input, {
        invalid: invalid.value,
        motion: {
          states: { invalid: { root: { x: [0, -6, 6, -3, 0] }, replay: attempts.value } },
        } satisfies InputMotion,
      }),
  })
  await vi.waitFor(() => expect(document.querySelector('.ui-input')).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()

  // Off: a new attempt plays nothing.
  attempts.value++
  for (let i = 0; i < 5; i++) await frame()
  expect(running()).toHaveLength(0)

  invalid.value = true
  attempts.value++
  await vi.waitFor(() => expect(running().length).toBeGreaterThan(0))
  await settle()

  // Still invalid, another wrong code: it shakes again.
  attempts.value++
  await vi.waitFor(() => expect(running().length).toBeGreaterThan(0))
})
