// A Resizable panel that reaches its container's edge keeps its handle inside, so the page never
// scrolls sideways; with room past the edge, the handle straddles it to be grabbed from both sides.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Resizable from '../src/components/Resizable/Resizable.vue'

for (const dir of ['ltr', 'rtl'] as const)
  test(`the handle tucks in only where the panel meets its container's edge (${dir})`, async () => {
    const width = shallowRef(200)
    const screen = await render(() =>
      h('div', { class: 'box', dir, style: 'inline-size: 300px; overflow: visible' }, [
        h(
          Resizable,
          { size: width.value, 'onUpdate:size': (v: number) => (width.value = v) },
          () => 'Panel',
        ),
      ]),
    )
    const box = screen.container.querySelector<HTMLElement>('.box')!.getBoundingClientRect()
    const handle = () =>
      screen.container.querySelector<HTMLElement>('.ui-resizable-handle')!.getBoundingClientRect()
    const past = () => (dir === 'ltr' ? handle().right - box.right : box.left - handle().left)
    // Room past the edge: it straddles.
    await vi.waitFor(() =>
      expect(dir === 'ltr' ? handle().right - box.left : box.right - handle().left).toBeCloseTo(
        203,
        0,
      ),
    )
    // Filling the container: inside it.
    width.value = 300
    const panel = () => screen.container.querySelector<HTMLElement>('.ui-resizable')!
    await vi.waitFor(() => expect(panel().getBoundingClientRect().width).toBe(300))
    await vi.waitFor(() => expect(past()).toBeLessThanOrEqual(0.5))
    width.value = 200
    await vi.waitFor(() =>
      expect(dir === 'ltr' ? handle().right - box.left : box.right - handle().left).toBeCloseTo(
        203,
        0,
      ),
    )
  })
