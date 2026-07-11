import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import KnobFixture from './fixtures/KnobFixture.vue'

function dialRect(screen: RenderResult<unknown>, testId: string): DOMRect {
  const el = screen.container.querySelector(`[data-testid="${testId}"] .ui-knob-dial`)
  if (!el) throw new Error('dial not found')
  return el.getBoundingClientRect()
}

function dialEl(screen: RenderResult<unknown>, testId: string): HTMLElement {
  const el = screen.container.querySelector<HTMLElement>(`[data-testid="${testId}"] .ui-knob-dial`)
  if (!el) throw new Error('dial not found')
  return el
}

/** A point at `deg` around the dial's center — 0deg = straight up, clockwise
 * positive, the exact convention useKnob.ts's `angleFromPointer` uses. */
function pointAtAngle(rect: DOMRect, deg: number, radiusFraction = 0.4): { x: number; y: number } {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const radius = Math.min(rect.width, rect.height) * radiusFraction
  const rad = (deg * Math.PI) / 180
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) }
}

const pointerId = 1
function pointerdown(el: Element, x: number, y: number) {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId, bubbles: true }),
  )
}
function pointermove(x: number, y: number) {
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId, bubbles: true }),
  )
}
function pointerup(x: number, y: number) {
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId, bubbles: true }),
  )
}

test('drag from the min angle to the max angle sets the value to max', async () => {
  const screen = render(KnobFixture, {})
  const rect = dialRect(screen, 'basic')
  const dial = dialEl(screen, 'basic')

  const start = pointAtAngle(rect, -135)
  const end = pointAtAngle(rect, 135)
  pointerdown(dial, start.x, start.y)
  pointermove(end.x, end.y)
  pointerup(end.x, end.y)

  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('100')
})

test('pointerdown anywhere on the dial jumps the value to that angle (absolute tracking)', async () => {
  const screen = render(KnobFixture, {})
  const rect = dialRect(screen, 'basic')
  const dial = dialEl(screen, 'basic')

  const mid = pointAtAngle(rect, 0) // straight up = the sweep's midpoint
  pointerdown(dial, mid.x, mid.y)
  pointerup(mid.x, mid.y)

  await vi.waitFor(() => {
    const value = Number(screen.getByTestId('basic-value').element().textContent)
    expect(value).toBeGreaterThanOrEqual(45)
    expect(value).toBeLessThanOrEqual(55)
  })
})

test('dragging into the bottom dead zone clamps to the nearer endpoint', async () => {
  const screen = render(KnobFixture, {})
  const rect = dialRect(screen, 'basic')
  const dial = dialEl(screen, 'basic')

  const start = pointAtAngle(rect, 0)
  const gap = pointAtAngle(rect, 160) // past +135deg, into the 90deg bottom gap
  pointerdown(dial, start.x, start.y)
  pointermove(gap.x, gap.y)
  pointerup(gap.x, gap.y)

  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('100')
})

test('keyboard: arrows step, PageUp/Down jump by 10x, Home/End jump to bounds', async () => {
  const screen = render(KnobFixture, {})
  const dial = dialEl(screen, 'basic')
  dial.focus()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('25')

  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('20')

  await userEvent.keyboard('{PageUp}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('70')

  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('0')

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('100')
})

test('aria-valuenow reflects the current value', async () => {
  const screen = render(KnobFixture, {})
  const dial = dialEl(screen, 'basic')
  dial.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(dial.getAttribute('aria-valuenow')).toBe('25'))
})

test('data-dragging is set for the duration of a drag and cleared on release', async () => {
  const screen = render(KnobFixture, {})
  const rect = dialRect(screen, 'basic')
  const dial = dialEl(screen, 'basic')
  const root = screen.container.querySelector('[data-testid="basic"]')!

  const start = pointAtAngle(rect, -135)
  pointerdown(dial, start.x, start.y)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(true))

  const end = pointAtAngle(rect, -100)
  pointermove(end.x, end.y)
  pointerup(end.x, end.y)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(false))
})

test('disabled knob ignores pointer and keyboard interaction', async () => {
  const screen = render(KnobFixture, {})
  const rect = dialRect(screen, 'disabled')
  const dial = dialEl(screen, 'disabled')
  expect(dial.getAttribute('tabindex')).toBe('-1')

  const end = pointAtAngle(rect, 135)
  pointerdown(dial, end.x, end.y)
  pointerup(end.x, end.y)

  expect(dial.getAttribute('aria-valuenow')).toBe('10')
})

test('form participation: hidden input carries the value under name', async () => {
  const screen = render(KnobFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('gain')).toBe('5')
})

test('valueText renders as aria-valuetext', async () => {
  const screen = render(KnobFixture, {})
  const dial = dialEl(screen, 'valuetext')
  expect(dial.getAttribute('aria-valuetext')).toBe('40%')
})
