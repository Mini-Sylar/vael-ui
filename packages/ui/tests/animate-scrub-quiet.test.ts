// A scrubbed v-animate (`progress`) under motion: false keeps its fade and drops its movement.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { vAnimate } from '../src/motion/vAnimate'

test('motion off on the provider: a scrub fades but never moves', async () => {
  const p = shallowRef(0)
  await render(() =>
    h(ConfigProvider, { motion: false }, () =>
      withDirectives(h('div', { class: 'scrub' }, 'Scrub'), [
        [vAnimate, { animate: { x: [0, 100], opacity: [0, 1] }, progress: p.value }],
      ]),
    ),
  )
  const el = () => document.querySelector<HTMLElement>('.scrub')!
  await vi.waitFor(() => expect(getComputedStyle(el()).opacity).toBe('0'))
  p.value = 0.5
  await vi.waitFor(() => expect(Number(getComputedStyle(el()).opacity)).toBeCloseTo(0.5, 2))
  expect(getComputedStyle(el()).translate).toBe('none')
})
