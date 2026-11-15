// A scrubbed v-animate (`progress`) under reduced motion keeps its fade and drops its movement.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

vi.mock('../src/composables/dom', async (original) => ({
  ...(await original<typeof import('../src/composables/dom')>()),
  prefersReducedMotion: () => true,
}))

test('reduced motion: a scrub fades but never moves', async () => {
  const p = shallowRef(0)
  await render(() =>
    withDirectives(h('div', { class: 'scrub' }, 'Scrub'), [
      [vAnimate, { animate: { x: [0, 100], scale: [1, 2], opacity: [0, 1] }, progress: p.value }],
    ]),
  )
  const el = () => document.querySelector<HTMLElement>('.scrub')!
  await vi.waitFor(() => expect(getComputedStyle(el()).opacity).toBe('0'))
  p.value = 0.5
  await vi.waitFor(() => expect(Number(getComputedStyle(el()).opacity)).toBeCloseTo(0.5, 2))
  expect(getComputedStyle(el()).translate).toBe('none')
  expect(getComputedStyle(el()).scale).toBe('none')
})
