import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SortableGroupFixture from './fixtures/SortableGroupFixture.vue'

function handles(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-sortable-handle'))
}
function rowFor(screen: RenderResult<unknown>, value: string): HTMLElement {
  return screen.container.querySelector<HTMLElement>(`[data-sortable-item][data-value="${value}"]`)!
}
function order(screen: RenderResult<unknown>, testid: 'todo-order' | 'doing-order'): string {
  return screen.container.querySelector(`[data-testid="${testid}"]`)!.textContent!
}

function drag(handle: HTMLElement, toX: number, toY: number, pointerId = 21) {
  const box = handle.getBoundingClientRect()
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId, clientX: toX, clientY: toY }),
  )
  return () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
}

test('pointer-drag across the boundary transfers the card at the resolved index', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]! // todo's Alpha
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('c,a'))
  expect(order(screen, 'todo-order')).toBe('b')
})

test('a same-container move inside a grouped Sortable behaves exactly like an ungrouped one', async () => {
  const screen = await render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => expect(order(screen, 'todo-order')).toBe('b,a'))
  expect(order(screen, 'doing-order')).toBe('c')
})

test('keyboard: the transfer key moves the grab to the adjacent column, and focus follows', async () => {
  const screen = await render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  await userEvent.keyboard('{ArrowRight}')
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(order(screen, 'todo-order')).toBe('b'))
  expect(order(screen, 'doing-order')).toBe('c,a')
  await vi.waitFor(() => {
    expect(
      document.activeElement?.closest('[data-sortable-item]')?.getAttribute('data-value'),
    ).toBe('a')
  })
})

test('keyboard: the reorder key still steps within whichever column currently hosts the grab', async () => {
  const screen = await render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight}{ArrowUp} ')
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a,c'))
  expect(order(screen, 'todo-order')).toBe('b')
})

test('a group-level canDrop rejection reverts both arrays', async () => {
  const screen = await render(SortableGroupFixture, { props: { canDrop: () => false } })
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('a rejecting group-level beforeDrop reverts instead of throwing', async () => {
  const screen = await render(SortableGroupFixture, {
    props: { beforeDrop: () => Promise.resolve(false) },
  })
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('Escape while hovering a foreign column reverts both arrays untouched', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const pointerId = 33
  const startBox = handle.getBoundingClientRect()
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: startBox.left + startBox.width / 2,
      clientY: startBox.top + startBox.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      clientX: doingBox.left + 10,
      clientY: doingBox.top + doingBox.height + 5,
    }),
  )
  const draggedRow = rowFor(screen, 'a')
  // Default previewMode ('element'): no separate clone node — the dragged
  // row itself lifts out of flow once it actually crosses into 'doing'.
  await vi.waitFor(() => expect(getComputedStyle(draggedRow).position).toBe('fixed'))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await vi.waitFor(() => expect(getComputedStyle(draggedRow).position).not.toBe('fixed'))
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('leaving the list springs the rows below up instead of snapping them', async () => {
  const screen = await render(SortableGroupFixture)
  const bravo = rowFor(screen, 'b')
  const restTop = bravo.getBoundingClientRect().top
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handles(screen)[0]!, doingBox.left + 10, doingBox.top + 10)
  // Alpha has lifted out of the flow; Bravo holds its place and springs up from there.
  expect(bravo.style.translate).not.toBe('')
  expect(Math.abs(bravo.getBoundingClientRect().top - restTop)).toBeLessThan(2)
  await vi.waitFor(() => expect(bravo.style.translate).toBe(''))
  expect(bravo.getBoundingClientRect().top).toBeLessThan(restTop)
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a,c'))
})

test('an empty list takes a drop anywhere inside its box, not only at its top edge', async () => {
  const screen = await render(SortableGroupFixture)
  // Empty "doing" first by moving Charlie over.
  const todoBox = rowFor(screen, 'b').getBoundingClientRect()
  drag(handles(screen)[2]!, todoBox.left + 10, todoBox.bottom + 5)()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe(''))
  const doing = screen.container.querySelectorAll<HTMLElement>('.ui-sortable')[1]!
  const box = doing.getBoundingClientRect()
  expect(box.height).toBeGreaterThanOrEqual(200)
  drag(handles(screen)[0]!, box.left + box.width / 2, box.top + box.height * 0.7)()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a'))
})

test('a card let go half-way out of its column glides back on both axes instead of snapping sideways first', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]!
  const alpha = rowFor(screen, 'a')
  const box = handle.getBoundingClientRect()
  const pointerId = 71
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  // Sideways and a little down, still over its own column.
  for (let step = 1; step <= 6; step++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 4 + (60 * step) / 6,
        clientY: box.top + 4 + (10 * step) / 6,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  const xOf = () => parseFloat(alpha.style.translate.split(' ')[0] || '0')
  expect(xOf()).toBeCloseTo(60, 0)
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  // Two frames in, the sideways offset is still mostly there, easing out.
  const mid = xOf()
  expect(mid).toBeGreaterThan(20)
  expect(mid).toBeLessThan(60)
  await vi.waitFor(() => expect(alpha.style.translate).toBe(''))
  expect(order(screen, 'todo-order')).toBe('a,b')
})

test('a row gliding home after release stays stacked above the neighbouring list until it has landed', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]!
  const alpha = rowFor(screen, 'a')
  const box = handle.getBoundingClientRect()
  const pointerId = 91
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  for (let step = 1; step <= 6; step++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 4 + (70 * step) / 6,
        clientY: box.top + 4 + (8 * step) / 6,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  expect(alpha.hasAttribute('data-dragging')).toBe(false)
  expect(getComputedStyle(alpha).zIndex).toBe('1')
  expect(getComputedStyle(alpha).position).toBe('relative')
  // Its right edge, hanging past its own list, is what the pointer finds there.
  const rect = alpha.getBoundingClientRect()
  const hit = document.elementFromPoint(rect.right - 4, rect.top + rect.height / 2)
  expect(hit && alpha.contains(hit)).toBe(true)
  await vi.waitFor(() => expect(alpha.style.translate).toBe(''))
  expect(getComputedStyle(alpha).zIndex).toBe('auto')
  expect(alpha.style.position).toBe('')
})
