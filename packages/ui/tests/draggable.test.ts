import '../src/style.css'
import { nextTick } from 'vue'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DraggableFixture from './fixtures/DraggableFixture.vue'

function rows(screen: RenderResult<unknown>): HTMLElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLElement>('.draggable-row'))
}
function order(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="order"]')!.textContent!
}
function clicked(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="clicked"]')!.textContent!
}

/** Synthetic drag: the engine only needs pointerdown -> move past threshold -> up. */
function drag(from: HTMLElement, deltaY: number, pointerId = 11) {
  const box = from.getBoundingClientRect()
  const x = box.left + 10
  const y = box.top + box.height / 2
  from.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId, clientX: x, clientY: y + deltaY }),
  )
  return () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
}

test('v-draggable reorders the bound array in place', async () => {
  const screen = render(DraggableFixture)
  expect(order(screen)).toBe('a,b,c')
  const release = drag(rows(screen)[0]!, 40)
  release()
  await vi.waitFor(() => expect(order(screen)).not.toBe('a,b,c'))
})

test('it lifts the row into the same floating preview the components use', async () => {
  const screen = render(DraggableFixture)
  const release = drag(rows(screen)[0]!, 40, 12)
  const preview = document.querySelector<HTMLElement>('[data-sortable-preview]')
  expect(preview).not.toBeNull()
  expect(getComputedStyle(preview!).position).toBe('fixed')
  expect(getComputedStyle(preview!).pointerEvents).toBe('none')
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
})

test('a movement under the threshold is a click, not a drag', async () => {
  const screen = render(DraggableFixture)
  const release = drag(rows(screen)[0]!, 3, 13)
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  release()
  expect(order(screen)).toBe('a,b,c')
})

test('a handle selector restricts where the drag can start', async () => {
  const screen = render(DraggableFixture, { props: { handle: '[data-grip]' } })
  // Pressing the row body (not the grip) must not start a drag.
  const row = rows(screen)[0]!
  const label = row.querySelectorAll('span')[1] as HTMLElement
  const box = label.getBoundingClientRect()
  label.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 14,
      button: 0,
      clientX: box.left + 2,
      clientY: box.top + 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 14,
      clientX: box.left + 2,
      clientY: box.top + 60,
    }),
  )
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 14 }))
  expect(order(screen)).toBe('a,b,c')
})

test('a sibling reactive change mid-drag does not tear down the drag', async () => {
  const screen = render(DraggableFixture)
  const release = drag(rows(screen)[0]!, 40, 16)
  screen.container.querySelector<HTMLElement>('[data-testid="touch"]')!.click()
  await nextTick()
  release()
  await vi.waitFor(() => expect(order(screen)).not.toBe('a,b,c'))
})

test('a real drag suppresses the browser trailing click on the dropped row', async () => {
  const screen = render(DraggableFixture)
  const release = drag(rows(screen)[0]!, 40, 17)
  release()
  await vi.waitFor(() => expect(order(screen)).not.toBe('a,b,c'))
  const dropped = rows(screen).find((row) => row.dataset.value === 'a')!
  const evt = new MouseEvent('click', { bubbles: true, cancelable: true })
  dropped.dispatchEvent(evt)
  expect(evt.defaultPrevented).toBe(true)
})

test('a click with no preceding drag reaches the row normally', async () => {
  const screen = render(DraggableFixture)
  rows(screen)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(clicked(screen)).toBe('b'))
})

test('Escape aborts a directive drag too', async () => {
  const screen = render(DraggableFixture)
  drag(rows(screen)[0]!, 45, 15)
  expect(document.querySelector('[data-sortable-preview]')).not.toBeNull()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen)).toBe('a,b,c')
})
