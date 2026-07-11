import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DialFixture from './fixtures/DialFixture.vue'

function dialRect(screen: RenderResult<unknown>, testId: string): DOMRect {
  const el = screen.container.querySelector(`[data-testid="${testId}"] .ui-dial-dial`)
  if (!el) throw new Error('dial not found')
  return el.getBoundingClientRect()
}

function dialEl(screen: RenderResult<unknown>, testId: string): HTMLElement {
  const el = screen.container.querySelector<HTMLElement>(`[data-testid="${testId}"] .ui-dial-dial`)
  if (!el) throw new Error('dial not found')
  return el
}

/** A point at `deg` around the dial's center — 0deg = straight up, clockwise
 * positive, the exact convention useDial.ts's angleFromPointer uses. `deg`
 * may go past +-180 (or past a full 360) freely — sin/cos wrap naturally,
 * which is exactly what lets these tests simulate a drag that spins several
 * full turns. */
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

function frame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 16))
}

/**
 * Drags from `fromDeg` to `toDeg`, dispatching an intermediate pointermove
 * every `stepDeg` — no single frame ever jumps more than 180deg (the
 * requirement for useDial's shortest-angle-delta accumulation to track
 * correctly instead of aliasing). `toDeg` may be well past 360 (or past
 * -360) to simulate multiple full rotations, the real scenario this
 * component exists to get right.
 *
 * A real ~16ms frame gap is awaited between dispatches. Firing many
 * synthetic PointerEvents back-to-back with zero yield between them is not
 * representative of a real drag (which is paced by the display's actual
 * frame rate) and this browser test environment measurably drops/aliases
 * events dispatched that way — same reason userEvent-style helpers pace
 * real interactions rather than firing every event in one microtask.
 */
async function dragSweep(
  screen: RenderResult<unknown>,
  testId: string,
  fromDeg: number,
  toDeg: number,
  stepDeg = 30,
) {
  const rect = dialRect(screen, testId)
  const dial = dialEl(screen, testId)
  const start = pointAtAngle(rect, fromDeg)
  pointerdown(dial, start.x, start.y)
  await frame()

  const direction = toDeg >= fromDeg ? 1 : -1
  let deg = fromDeg
  while ((direction > 0 && deg < toDeg) || (direction < 0 && deg > toDeg)) {
    deg += direction * stepDeg
    if ((direction > 0 && deg > toDeg) || (direction < 0 && deg < toDeg)) deg = toDeg
    const p = pointAtAngle(rect, deg)
    pointermove(p.x, p.y)
    await frame()
  }
  const end = pointAtAngle(rect, toDeg)
  pointerup(end.x, end.y)
  await frame()
}

test('dragging clockwise past a full 360deg rotation keeps increasing the value', async () => {
  const screen = render(DialFixture, {})
  // 750deg — more than two full clockwise turns — at the default
  // 15deg/step. A single-turn-only (or buggy, non-accumulating) reading
  // could reach at most ~24; this proves rotation past 360 keeps counting.
  await dragSweep(screen, 'unbounded', 0, 750)

  const value = Number(screen.getByTestId('unbounded-value').element().textContent)
  expect(value).toBeGreaterThan(40)
  expect(value).toBeLessThanOrEqual(50)
})

test('dragging counter-clockwise decreases the value, including past multiple rotations', async () => {
  const screen = render(DialFixture, {})
  await dragSweep(screen, 'unbounded', 0, -480) // 1.33 turns counter-clockwise

  const value = Number(screen.getByTestId('unbounded-value').element().textContent)
  expect(value).toBeLessThan(-20)
  expect(value).toBeGreaterThanOrEqual(-33)
})

test('unbounded dial has no ceiling — accumulates across separate drag sessions', async () => {
  const screen = render(DialFixture, {})
  await dragSweep(screen, 'unbounded', 0, 750)
  await dragSweep(screen, 'unbounded', 0, 750)

  const value = Number(screen.getByTestId('unbounded-value').element().textContent)
  // Two full sweeps stacked — well past any 0-100-shaped "bounded" range,
  // proving separate drag sessions keep accumulating rather than resetting.
  expect(value).toBeGreaterThan(80)
})

test('dragging through the atan2 wraparound boundary (+-180deg) does not spike the value', async () => {
  const screen = render(DialFixture, {})
  // Sweeps straight through the dial's bottom (the atan2 seam) continuing
  // in one clockwise direction — a naive raw-angle subtraction would
  // register a ~360deg jump right at the crossing instead of the true
  // 60deg of travel.
  await dragSweep(screen, 'unbounded', 150, 210, 15)

  const value = Number(screen.getByTestId('unbounded-value').element().textContent)
  // 60deg of clockwise travel at 15deg/step -> ~4, not some large spike.
  expect(value).toBeGreaterThanOrEqual(3)
  expect(value).toBeLessThanOrEqual(4)
})

test('bounded dial clamps at max even as the pointer keeps rotating past it', async () => {
  const screen = render(DialFixture, {})
  // Way more than enough rotation to blow past max=10 many times over.
  await dragSweep(screen, 'bounded', 0, 1200)

  const value = Number(screen.getByTestId('bounded-value').element().textContent)
  expect(value).toBe(10)
  const dial = dialEl(screen, 'bounded')
  expect(dial.getAttribute('aria-valuenow')).toBe('10')
})

test('bounded dial clamps at min the same way', async () => {
  const screen = render(DialFixture, {})
  await dragSweep(screen, 'bounded', 0, -1200)

  const value = Number(screen.getByTestId('bounded-value').element().textContent)
  expect(value).toBe(0)
})

test('keyboard: arrows step, PageUp/Down jump by 10x, Home/End jump to bounds', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'bounded')
  dial.focus()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('bounded-value')).toHaveTextContent('1')

  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('bounded-value')).toHaveTextContent('0')

  await userEvent.keyboard('{PageUp}')
  await expect.element(screen.getByTestId('bounded-value')).toHaveTextContent('10')

  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('bounded-value')).toHaveTextContent('0')

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('bounded-value')).toHaveTextContent('10')
})

test('Home/End no-op on the side with no bound set', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'no-min')
  dial.focus()

  await userEvent.keyboard('{Home}')
  // No min was given — Home has nothing to jump to, value is unchanged.
  expect(dial.getAttribute('aria-valuenow')).toBe('5')

  await userEvent.keyboard('{End}')
  expect(dial.getAttribute('aria-valuenow')).toBe('20')
})

test('aria-valuenow reflects the current value', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'bounded')
  dial.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(dial.getAttribute('aria-valuenow')).toBe('1'))
})

test('data-dragging is set for the duration of a drag and cleared on release', async () => {
  const screen = render(DialFixture, {})
  const rect = dialRect(screen, 'unbounded')
  const dial = dialEl(screen, 'unbounded')
  const root = screen.container.querySelector('[data-testid="unbounded"]')!

  const start = pointAtAngle(rect, 0)
  pointerdown(dial, start.x, start.y)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(true))

  const end = pointAtAngle(rect, 40)
  pointermove(end.x, end.y)
  pointerup(end.x, end.y)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(false))
})

test('disabled dial ignores pointer and keyboard interaction', async () => {
  const screen = render(DialFixture, {})
  const rect = dialRect(screen, 'disabled')
  const dial = dialEl(screen, 'disabled')
  expect(dial.getAttribute('tabindex')).toBe('-1')

  const end = pointAtAngle(rect, 90)
  pointerdown(dial, end.x, end.y)
  pointerup(end.x, end.y)

  expect(dial.getAttribute('aria-valuenow')).toBe('3')
})

test('form participation: hidden input carries the value under name', async () => {
  const screen = render(DialFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('gain')).toBe('2')
})

test('valueText renders as aria-valuetext when bounded', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'valuetext')
  expect(dial.getAttribute('aria-valuetext')).toBe('40%')
})

test('unbounded dial falls back to the raw number as aria-valuetext with no valueText prop', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'unbounded')
  expect(dial.getAttribute('aria-valuetext')).toBe('0')
})

test('bounded dial with no valueText omits aria-valuetext entirely', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'bounded')
  expect(dial.getAttribute('aria-valuetext')).toBeNull()
})

test('bounded dial omits aria-valuemin/aria-valuemax when that bound is not set', async () => {
  const screen = render(DialFixture, {})
  const dial = dialEl(screen, 'no-min')
  expect(dial.getAttribute('aria-valuemin')).toBeNull()
  expect(dial.getAttribute('aria-valuemax')).toBe('20')
})
