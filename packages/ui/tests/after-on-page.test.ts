// `after` naming an element that's already on the page waits for what it's playing now.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const opacity = (el: Element) => Number(getComputedStyle(el).opacity)

test("a stamp waits for the tag's shudder that's already under way", async () => {
  const shudder = shallowRef(0)
  const stamped = shallowRef(false)
  const screen = await render(() => [
    withDirectives(h('div', { class: 'tag' }, 'Tag'), [
      [
        vAnimate,
        { animate: { x: [0, -6, 6, -6, 6, 0] }, duration: 500, replay: shudder.value },
        'tag',
      ],
    ]),
    stamped.value
      ? withDirectives(h('div', { class: 'stamp' }, 'OK'), [
          [vAnimate, { initial: { opacity: 0 }, after: 'tag', duration: 100 }, 'stamp'],
        ])
      : null,
  ])
  await new Promise((resolve) => setTimeout(resolve, 400))
  // The shudder starts, and the stamp is asked for in the same moment.
  shudder.value++
  stamped.value = true
  await nextTick()
  const stamp = await vi.waitFor(() => screen.container.querySelector('.stamp')!)
  const t0 = performance.now()
  // Still unseen well into the shudder.
  while (performance.now() - t0 < 350) {
    expect(opacity(stamp)).toBeLessThan(0.05)
    await new Promise(requestAnimationFrame)
  }
  await vi.waitFor(() => expect(opacity(stamp)).toBe(1), { timeout: 1500 })
})
