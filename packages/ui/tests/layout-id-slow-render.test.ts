// A layoutId travel still plays when the render that swaps the two is slow (dev mode, a first open
// that mounts a lot): it's the same flush, however long that takes.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

// Takes its time to render, as a detail full of components does.
const Slow = defineComponent(() => {
  const until = performance.now() + 80
  while (performance.now() < until);
  return () => h('p', 'Details')
})

test('a card opening into a panel that is slow to render still travels from the card', async () => {
  const open = shallowRef(false)
  const screen = await render(() =>
    h('div', [
      open.value
        ? withDirectives(
            h('section', { class: 'panel', style: 'width: 400px; height: 200px' }, [h(Slow)]),
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
  await new Promise(requestAnimationFrame)
  const panel = screen.container.querySelector<HTMLElement>('.panel')!
  // On its way from the card's size, not already at its own.
  await vi.waitFor(() => expect(panel.getBoundingClientRect().width).toBeLessThan(390))
})
