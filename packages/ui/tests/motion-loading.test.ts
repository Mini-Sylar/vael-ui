import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import { settled } from '../src/motion/settled'
import { loading } from '../src/motion/styleKey'

// First in its file: nothing has loaded the states player yet, so it's still on its way.
const MS = 300
const shake = { value: [0, -10, 9, -6, 0], duration: MS, easing: 'linear' }

test('a state that turns on while the player is loading still plays, and its onAfterEnter runs', async () => {
  const onAfterEnter = vi.fn()
  const invalid = shallowRef(false)
  render(() =>
    h(OtpInput, {
      length: 4,
      invalid: invalid.value,
      motion: { states: { invalid: { root: { x: shake }, onAfterEnter } } },
      'aria-label': 'Code',
    }),
  )
  // On, and rendered, before the player has arrived.
  invalid.value = true
  await nextTick()
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
})

test('settled(el) waits for motion code still loading, then for what it plays', async () => {
  const el = document.createElement('div')
  document.body.append(el)
  // A chunk that takes a while; once it's in, the element animates.
  const chunk = loading(new Promise((resolve) => setTimeout(resolve, 150)))
  void chunk.then(() => el.animate([{ opacity: 0 }, { opacity: 1 }], MS))
  const start = performance.now()
  await settled(el)
  expect(performance.now() - start).toBeGreaterThanOrEqual(150 + MS - 40)
})
