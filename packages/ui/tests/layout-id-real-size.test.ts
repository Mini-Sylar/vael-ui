// A layoutId travel resizes the element for real, as Vue Starport does: its content reflows on the
// way instead of being stretched by a scale.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('a card growing into a panel travels at its real size, never scaled', async () => {
  const open = shallowRef(false)
  const screen = await render(() =>
    h('div', [
      open.value
        ? withDirectives(
            h('section', { class: 'panel', style: 'width: 400px; height: 200px' }, 'Panel text'),
            [[vAnimate, { layoutId: 'site', duration: 2000 }]],
          )
        : withDirectives(
            h('article', { class: 'card', style: 'width: 100px; height: 80px' }, 'Card'),
            [[vAnimate, { layoutId: 'site', duration: 2000 }]],
          ),
    ]),
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  open.value = true
  await nextTick()
  const panel = await vi.waitFor(() => {
    const el = screen.container.querySelector<HTMLElement>('.panel')
    if (!el?.getAnimations().length) throw new Error('not travelling yet')
    return el
  })
  for (const run of panel.getAnimations()) {
    run.pause()
    run.currentTime = 1000
  }
  const mid = panel.getBoundingClientRect()
  expect(mid.width).toBeGreaterThan(110)
  expect(mid.width).toBeLessThan(390)
  // Its own layout width, not a drawn one: the text wraps to it.
  expect(panel.offsetWidth).toBe(Math.round(mid.width))
  const transform = getComputedStyle(panel).transform
  const m = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform)
  expect([m.a, m.d]).toEqual([1, 1])
  for (const run of panel.getAnimations()) run.finish()
  await vi.waitFor(() => expect(panel.getBoundingClientRect().width).toBe(400))
  expect(panel.getBoundingClientRect().height).toBe(200)
})
