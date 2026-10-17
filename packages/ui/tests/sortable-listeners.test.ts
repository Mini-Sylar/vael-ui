import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SortableFixture from './fixtures/SortableFixture.vue'
import { trackListeners } from './utils/windowListeners'

// An idle list adds no window listeners; a non-passive touchmove slows every touch scroll.

const POINTER = ['pointermove', 'pointerup', 'pointercancel']
let tracker: ReturnType<typeof trackListeners> | undefined
afterEach(() => tracker?.restore())

function handles(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-sortable-handle'))
}
function order(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="order"]')!.textContent!
}
function press(handle: HTMLElement, pointerId: number, pointerType: string) {
  const box = handle.getBoundingClientRect()
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      pointerType,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    }),
  )
  return box
}

test('an idle Sortable keeps no window pointer, touch or key listeners', async () => {
  tracker = trackListeners()
  await render(SortableFixture)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(tracker.count('touchmove', 'keydown', ...POINTER)).toBe(0)
})

test('a touch press adds a non-passive touchmove only until it ends', async () => {
  tracker = trackListeners()
  const screen = await render(SortableFixture)
  press(handles(screen)[0]!, 31, 'touch')
  expect(tracker.of('touchmove')).toHaveLength(1)
  expect(tracker.of('touchmove')[0]!.passive).toBe(false)
  expect(tracker.count(...POINTER)).toBe(3)

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 31 }))
  expect(tracker.count('touchmove', ...POINTER)).toBe(0)
})

test('a mouse press never adds touchmove, and a pointer drag still reorders and releases everything', async () => {
  tracker = trackListeners()
  const screen = await render(SortableFixture)
  const box = press(handles(screen)[0]!, 32, 'mouse')
  expect(tracker.count('touchmove')).toBe(0)
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 32,
      pointerType: 'mouse',
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height * 2.6,
    }),
  )
  await vi.waitFor(() => expect(tracker!.count('keydown')).toBe(1))
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 32 }))
  await vi.waitFor(() => expect(order(screen)).toBe('b,a,c'))
  await vi.waitFor(() => expect(tracker!.count(...POINTER)).toBe(0))
  // The trailing-click guard waits for the next press, then lets go too.
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  expect(tracker.count('keydown', 'pointerdown', ...POINTER)).toBe(0)
})

test('Escape still cancels a pointer drag', async () => {
  const screen = await render(SortableFixture)
  const box = press(handles(screen)[0]!, 33, 'mouse')
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 33,
      pointerType: 'mouse',
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height * 2.6,
    }),
  )
  await userEvent.keyboard('{Escape}')
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 33 }))
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(order(screen)).toBe('a,b,c')
})
