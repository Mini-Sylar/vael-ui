// v-animate's `replay` also plays `animate`'s keyframes again from the start: the same look, drawn
// again on each new period.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const frame = () => new Promise(requestAnimationFrame)

test('a changed replay plays the same keyframes again', async () => {
  const period = shallowRef('month')
  const screen = await render(() =>
    withDirectives(h('div', { class: 'line' }), [
      [vAnimate, { animate: { x: [0, 120, 0] }, duration: 400, replay: period.value }],
    ]),
  )
  const el = screen.container.querySelector<HTMLElement>('.line')!
  const xs = async () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      seen.add(getComputedStyle(el).translate)
      await frame()
    }
    return seen
  }
  // Mounted: shown in its look; then still.
  await new Promise((resolve) => setTimeout(resolve, 600))
  expect((await xs()).size).toBe(1)

  period.value = 'quarter'
  await vi.waitFor(async () => expect((await xs()).size).toBeGreaterThan(2))
})
