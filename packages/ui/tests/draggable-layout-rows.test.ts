// Rows that both drag (v-draggable) and follow layout (v-animate `layout`): on a drop the drag
// engine glides the rows to their new places, and the layout slides stand down, so no row is moved
// twice at once.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, reactive, withDirectives } from 'vue'
import { vDraggable } from '../src/directives/vDraggable'
import { LAYOUT_ID } from '../src/motion/ids'
import { vAnimate } from '../src/motion/vAnimate'

// Each row wrapped in `display: contents` (as ContextMenu's trigger is), the hardest case: the
// wrapper holds only its own row, so `layout` watches the list around it.
test('a drop reorders the rows without layout slides on top of the drag glides', async () => {
  const items = reactive(['a', 'b', 'c', 'd'])
  const screen = await render(() =>
    withDirectives(
      h(
        'div',
        { class: 'list', style: 'display: grid; gap: 4px; width: 200px' },
        items.map((item) =>
          h('span', { key: item, style: 'display: contents' }, [
            withDirectives(h('div', { class: 'row', style: 'height: 40px' }, item), [
              [vAnimate, { layout: 'position' }],
            ]),
          ]),
        ),
      ),
      [[vDraggable, { items }]],
    ),
  )
  const rows = () => [...screen.container.querySelectorAll<HTMLElement>('.row')]
  const first = rows()[0]!.getBoundingClientRect()
  const x = first.left + 10
  const y = first.top + 20
  rows()[0]!.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 4,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  for (let i = 1; i <= 10; i++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 4,
        clientX: x,
        clientY: y + i * 10,
      }),
    )
    await new Promise(requestAnimationFrame)
  }
  await new Promise((r) => setTimeout(r, 300))
  window.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 4, clientX: x, clientY: y + 100 }),
  )
  let slides = 0
  for (let frame = 0; frame < 40; frame++) {
    await new Promise(requestAnimationFrame)
    for (const row of rows())
      slides += row.getAnimations().filter((run) => run.id === LAYOUT_ID).length
  }
  expect(items[0]).not.toBe('a')
  expect(slides).toBe(0)
})
