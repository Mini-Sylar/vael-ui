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
  const screen = render(SortableGroupFixture)
  const handle = handles(screen)[0]! // todo's Alpha
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('c,a'))
  expect(order(screen, 'todo-order')).toBe('b')
})

test('a same-container move inside a grouped Sortable behaves exactly like an ungrouped one', async () => {
  const screen = render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => expect(order(screen, 'todo-order')).toBe('b,a'))
  expect(order(screen, 'doing-order')).toBe('c')
})

test('keyboard: the transfer key moves the grab to the adjacent column, and focus follows', async () => {
  const screen = render(SortableGroupFixture)
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
  const screen = render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight}{ArrowUp} ')
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a,c'))
  expect(order(screen, 'todo-order')).toBe('b')
})

test('a group-level canDrop rejection reverts both arrays', async () => {
  const screen = render(SortableGroupFixture, { props: { canDrop: () => false } })
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('a rejecting group-level beforeDrop reverts instead of throwing', async () => {
  const screen = render(SortableGroupFixture, {
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
  const screen = render(SortableGroupFixture)
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
