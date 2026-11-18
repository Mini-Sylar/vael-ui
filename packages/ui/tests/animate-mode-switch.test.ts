// An element whose v-animate switches between a scrubbed look (`progress`) and a held one keeps
// only the look it has now: neither leaves its values behind under the other.
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'
import { settled } from '../src/motion/settled'

const scrubbed = { animate: { scale: [0.5, 1] }, progress: () => 0 }
const held = { animate: { scale: 0.9 } }
const turning = { animate: { rotate: [-20, 20] }, progress: () => 0.5 }

async function mount(first: object) {
  const value = shallowRef<object>(first)
  const screen = await render(() =>
    withDirectives(h('div', { 'data-p': '' }), [[vAnimate, value.value]]),
  )
  const el = screen.container.querySelector<HTMLElement>('[data-p]')!
  const rest = async () => {
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 200))
    await settled()
  }
  await rest()
  return { el, value, rest, screen }
}

test('from a scrub to a held look, the scrub lets go', async () => {
  const { el, value, rest, screen } = await mount(scrubbed)
  expect(getComputedStyle(el).scale).toBe('0.5')
  value.value = held
  await rest()
  expect(getComputedStyle(el).scale).toBe('0.9')
  screen.unmount()
})

test('from a held look to a scrub, the held look lets go', async () => {
  const { el, value, rest, screen } = await mount(held)
  expect(getComputedStyle(el).scale).toBe('0.9')
  value.value = turning
  await rest()
  expect(getComputedStyle(el).scale).toBe('none')
  expect(getComputedStyle(el).rotate).toBe('0deg')
  screen.unmount()
})
