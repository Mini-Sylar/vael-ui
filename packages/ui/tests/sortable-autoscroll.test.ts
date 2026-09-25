import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import SortableScrollFixture from './fixtures/SortableScrollFixture.vue'
import SortableNestedScrollFixture from './fixtures/SortableNestedScrollFixture.vue'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function dragFirstRowToBottomEdge(autoScroll: boolean) {
  const screen = await render(SortableScrollFixture, { props: { autoScroll } })
  const scroller = screen.container.querySelector<HTMLElement>('[data-testid="scroller"]')!
  const handle = screen.container.querySelector<HTMLElement>('.ui-sortable-handle')!
  const start = handle.getBoundingClientRect()
  const box = scroller.getBoundingClientRect()
  const pointerId = 31
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: start.left + start.width / 2,
      clientY: start.top + start.height / 2,
    }),
  )
  const edge = { clientX: start.left + start.width / 2, clientY: box.bottom - 4 }
  window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId, ...edge }))
  await wait(600)
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId, ...edge }))
  await wait(50)
  const order = screen.container.querySelector('[data-testid="order"]')!.textContent!.split(',')
  return { scrollTop: scroller.scrollTop, index: order.indexOf('r0') }
}

test('dragging near the edge of a scrollable list scrolls it and drops past the first visible rows', async () => {
  const { scrollTop, index } = await dragFirstRowToBottomEdge(true)
  expect(scrollTop).toBeGreaterThan(100)
  expect(index).toBeGreaterThan(6)
})

test('autoScroll=false leaves the list where it is', async () => {
  const { scrollTop, index } = await dragFirstRowToBottomEdge(false)
  expect(scrollTop).toBe(0)
  expect(index).toBeLessThan(6)
})

test('a scroll-locked page (open Dialog) is never autoscrolled', async () => {
  const spacer = document.createElement('div')
  spacer.style.height = '3000px'
  document.body.appendChild(spacer)
  document.body.style.overflow = 'hidden'
  try {
    const screen = await render(SortableScrollFixture, { props: { autoScroll: true } })
    const handle = screen.container.querySelector<HTMLElement>('.ui-sortable-handle')!
    const start = handle.getBoundingClientRect()
    const pointerId = 32
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId,
        button: 0,
        clientX: start.left + 4,
        clientY: start.top + 4,
      }),
    )
    const edge = { clientX: start.left + 4, clientY: window.innerHeight - 2 }
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId, ...edge }))
    await wait(400)
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId, ...edge }))
    expect(document.scrollingElement!.scrollTop).toBe(0)
  } finally {
    document.body.style.overflow = ''
    spacer.remove()
  }
})

async function dropAfterOuterScroll(rowsScrolled: number) {
  const screen = await render(SortableNestedScrollFixture)
  const outer = screen.container.querySelector<HTMLElement>('[data-testid="outer"]')!
  const handle = screen.container.querySelector<HTMLElement>('.ui-sortable-handle')!
  const rows = screen.container.querySelectorAll<HTMLElement>('[data-sortable-item]')
  const r3 = rows[3]!.getBoundingClientRect()
  const stride = rows[1]!.getBoundingClientRect().top - rows[0]!.getBoundingClientRect().top
  const point = { clientX: handle.getBoundingClientRect().left + 4, clientY: r3.top + 18 }
  const pointerId = 33
  const start = handle.getBoundingClientRect()
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: start.left + 4,
      clientY: start.top + 4,
    }),
  )
  window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId, ...point }))
  outer.scrollTop = rowsScrolled * stride
  window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId, ...point }))
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId, ...point }))
  await wait(50)
  const order = screen.container
    .querySelector('[data-testid="order"]')!
    .textContent!.split(',')
    .indexOf('r0')
  screen.unmount()
  return order
}

test('drop targets follow an outer scroll container that scrolls mid-drag', async () => {
  const still = await dropAfterOuterScroll(0)
  const scrolled = await dropAfterOuterScroll(2)
  expect(scrolled).toBe(still + 2)
})
