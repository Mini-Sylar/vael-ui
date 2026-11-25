// Sortable `virtualize` inside a board column that scrolls on its own: resting rows keep their size
// when the column squeezes the list, and rows just below the column's edge render ahead.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Sortable from '../src/components/Sortable/Sortable.vue'

const frames = (n = 3) =>
  new Promise<void>((resolve) => {
    const step = () => (--n ? requestAnimationFrame(step) : resolve())
    requestAnimationFrame(step)
  })

async function column() {
  const items = Array.from({ length: 29 }, (_, i) => ({ value: i, label: `Card ${i}` }))
  const screen = await render(() =>
    h(
      'div',
      {
        class: 'scroller',
        // A board column: its own scroll, a flex column, and a list with a minimum size of its own.
        style:
          'height: 500px; overflow-y: auto; display: flex; flex-direction: column; min-block-size: 0',
      },
      h(
        Sortable as never,
        {
          items,
          handle: 'item',
          variant: 'plain',
          virtualize: true,
          style: 'min-block-size: 3rem',
        },
        {
          item: ({ item }: { item: { label: string } }) =>
            h('div', { style: 'height: 90px' }, item.label),
        },
      ),
    ),
  )
  const scroller = screen.container.querySelector<HTMLElement>('.scroller')!
  const rows = () => [...scroller.querySelectorAll<HTMLElement>('.ui-sortable-item')]
  return { scroller, rows }
}

test('resting rows keep their size when the column squeezes the list', async () => {
  const { scroller, rows } = await column()
  await frames(5)
  expect(rows().some((row) => row.hasAttribute('data-sortable-resting'))).toBe(true)
  expect(rows().filter((row) => row.getBoundingClientRect().height < 1)).toHaveLength(0)
  // Scrolls the whole list, not one screen.
  expect(scroller.scrollHeight).toBeGreaterThan(29 * 80)
  scroller.scrollTop = scroller.scrollHeight
  await frames(5)
  const box = scroller.getBoundingClientRect()
  const blank = rows().filter((row) => {
    const r = row.getBoundingClientRect()
    return r.bottom > box.top && r.top < box.bottom && row.hasAttribute('data-sortable-resting')
  })
  expect(blank).toHaveLength(0)
})

test('rows a column-height below its edge are drawn before they scroll in', async () => {
  const { scroller, rows } = await column()
  await frames(5)
  const box = scroller.getBoundingClientRect()
  const ahead = rows().filter((row) => {
    const r = row.getBoundingClientRect()
    return r.top >= box.bottom && r.top < box.bottom + box.height
  })
  expect(ahead.length).toBeGreaterThan(0)
  expect(ahead.filter((row) => row.hasAttribute('data-sortable-resting'))).toHaveLength(0)
})

test('a board that scrolls only sideways leaves the page to window the rows', async () => {
  const items = Array.from({ length: 300 }, (_, i) => ({ value: i, label: `Card ${i}` }))
  const screen = await render(() =>
    h('div', { style: 'overflow-x: auto; display: flex' }, [
      h('div', { style: 'width: 300px; flex: none' }, [
        h(Sortable as never, { items, handle: 'item', variant: 'plain', virtualize: true }),
      ]),
    ]),
  )
  await frames(8)
  expect(screen.container.querySelectorAll('[data-sortable-resting]').length).toBeGreaterThan(200)
})
