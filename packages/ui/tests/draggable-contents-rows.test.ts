// A v-draggable row wrapped in an element with no box of its own (`display: contents`, as
// ContextMenu's trigger is): the drag uses the element inside it, so what you drag stays under the
// pointer and the other rows make room.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, reactive, withDirectives } from 'vue'
import { vDraggable } from '../src/directives/vDraggable'

test('a row wrapped in display: contents is dragged by the box inside it', async () => {
  const items = reactive(['a', 'b', 'c'])
  const screen = await render(() =>
    withDirectives(
      h(
        'div',
        { class: 'list', style: 'display: grid; gap: 4px; width: 200px' },
        items.map((item) =>
          h('span', { key: item, class: 'wrap', style: 'display: contents' }, [
            h('div', { class: 'row', style: 'height: 40px; background: #ddd' }, item),
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
      pointerId: 3,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  for (let i = 1; i <= 6; i++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 3,
        clientX: x,
        clientY: y + i * 10,
      }),
    )
    await new Promise(requestAnimationFrame)
  }
  // What's dragged is on screen under the pointer, at the row's size.
  const preview = document.querySelector<HTMLElement>('[data-sortable-preview]')!
  const box = preview.getBoundingClientRect()
  expect(box.width).toBeCloseTo(first.width, 0)
  expect(box.height).toBeCloseTo(first.height, 0)
  expect(box.top).toBeLessThan(y + 60)
  expect(box.bottom).toBeGreaterThan(y + 60)
  // The row below it made room.
  await new Promise((r) => setTimeout(r, 300))
  expect(rows()[1]!.getBoundingClientRect().top).toBeLessThan(first.bottom)
  window.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: x, clientY: y + 60 }),
  )
})

test('released in its own slot, the row glides home from where the copy was', async () => {
  const items = reactive(['a', 'b', 'c'])
  const screen = await render(() =>
    withDirectives(
      h(
        'div',
        { class: 'list', style: 'display: grid; gap: 4px; width: 200px' },
        items.map((item) => h('div', { key: item, class: 'row', style: 'height: 40px' }, item)),
      ),
      [[vDraggable, { items }]],
    ),
  )
  const rows = () => [...screen.container.querySelectorAll<HTMLElement>('.row')]
  const home = rows()[1]!.getBoundingClientRect()
  const x = home.left + 10
  const y = home.top + 20
  rows()[1]!.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 4,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  // Down, short of half a row: it drops back in its own slot.
  for (let i = 1; i <= 6; i++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 4,
        clientX: x,
        clientY: y + i * 3,
      }),
    )
    await new Promise(requestAnimationFrame)
  }
  const carried = document
    .querySelector<HTMLElement>('[data-sortable-preview]')!
    .getBoundingClientRect().top
  expect(carried).toBeGreaterThan(home.top + 5)
  window.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 4, clientX: x, clientY: y + 18 }),
  )
  await new Promise(requestAnimationFrame)
  // It starts where the copy was, then comes home: never at home at once.
  expect(rows()[1]!.getBoundingClientRect().top).toBeGreaterThan(home.top + 3)
  await new Promise((r) => setTimeout(r, 800))
  expect(rows()[1]!.getBoundingClientRect().top).toBeCloseTo(home.top, 0)
  expect(items.join()).toBe('a,b,c')
})
