import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SliderFixture from './fixtures/SliderFixture.vue'

function trackRect(screen: RenderResult<unknown>, testId: string): DOMRect {
  const el = screen.container.querySelector(`[data-testid="${testId}"] .ui-slider-track`)
  if (!el) throw new Error('track not found')
  return el.getBoundingClientRect()
}

function thumbEl(screen: RenderResult<unknown>, testId: string, index = 0): HTMLElement {
  const els = screen.container.querySelectorAll<HTMLElement>(
    `[data-testid="${testId}"] .ui-slider-thumb`,
  )
  const el = els[index]
  if (!el) throw new Error('thumb not found')
  return el
}

const pointerId = 1
function pointerdown(el: Element, clientX: number, clientY = 0) {
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY, pointerId, bubbles: true }))
}
function pointermove(clientX: number, clientY = 0) {
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX, clientY, pointerId, bubbles: true }),
  )
}
function pointerup(clientX: number, clientY = 0) {
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX, clientY, pointerId, bubbles: true }),
  )
}

test('drag on the thumb sets stepped values', async () => {
  const screen = render(SliderFixture, {})
  const rect = trackRect(screen, 'single')
  const thumb = thumbEl(screen, 'single')

  pointerdown(thumb, rect.left)
  pointermove(rect.left + rect.width)
  pointerup(rect.left + rect.width)

  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('100')
})

test('track click jumps the nearest thumb to the pointer', async () => {
  const screen = render(SliderFixture, {})
  const rect = trackRect(screen, 'single')
  const track = screen.container.querySelector('[data-testid="single"] .ui-slider-track')!

  pointerdown(track, rect.left + rect.width * 0.5)
  pointerup(rect.left + rect.width * 0.5)

  await vi.waitFor(() => {
    const value = Number(screen.getByTestId('single-value').element().textContent)
    expect(value).toBeGreaterThanOrEqual(45)
    expect(value).toBeLessThanOrEqual(55)
  })
})

test('range thumbs cannot cross — dragging past the other thumb clamps at it', async () => {
  const screen = render(SliderFixture, {})
  const rect = trackRect(screen, 'range')
  const thumb0 = thumbEl(screen, 'range', 0)

  pointerdown(thumb0, rect.left + rect.width * 0.2)
  pointermove(rect.left + rect.width)
  pointerup(rect.left + rect.width)

  await vi.waitFor(() => {
    const [v0, v1] = JSON.parse(screen.getByTestId('range-value').element().textContent!) as [
      number,
      number,
    ]
    expect(v0).toBeLessThanOrEqual(v1)
    expect(v0).toBe(60)
  })
})

test('keyboard: arrows step, PageUp/Down jump by 10x, Home/End jump to bounds', async () => {
  const screen = render(SliderFixture, {})
  const thumb = thumbEl(screen, 'single')
  thumb.focus()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('25')

  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('20')

  await userEvent.keyboard('{PageUp}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('70')

  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('0')

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('100')
})

test('vertical orientation maps the block axis — top of the track is max', async () => {
  const screen = render(SliderFixture, {})
  const rect = trackRect(screen, 'vertical')
  const thumb = thumbEl(screen, 'vertical')

  pointerdown(thumb, rect.left + rect.width / 2, rect.top)
  pointerup(rect.left + rect.width / 2, rect.top)

  await vi.waitFor(() => expect(thumb.getAttribute('aria-valuenow')).toBe('100'))
})

test('data-dragging is set for the duration of a drag and cleared on release', async () => {
  const screen = render(SliderFixture, {})
  const rect = trackRect(screen, 'single')
  const thumb = thumbEl(screen, 'single')
  const root = screen.container.querySelector('[data-testid="single"]')!

  pointerdown(thumb, rect.left)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(true))

  pointermove(rect.left + 10)
  pointerup(rect.left + 10)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(false))
})

test('disabled slider ignores pointer and keyboard interaction', async () => {
  const screen = render(SliderFixture, {})
  const rect = trackRect(screen, 'disabled')
  const thumb = thumbEl(screen, 'disabled')
  expect(thumb.getAttribute('tabindex')).toBe('-1')

  pointerdown(thumb, rect.left + rect.width)
  pointerup(rect.left + rect.width)

  expect(thumb.getAttribute('aria-valuenow')).toBe('10')
})

test('form participation: hidden input carries the value under name', async () => {
  const screen = render(SliderFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('amount')).toBe('50')
})

test('valueText renders as aria-valuetext', async () => {
  const screen = render(SliderFixture, {})
  const thumb = thumbEl(screen, 'valuetext')
  expect(thumb.getAttribute('aria-valuetext')).toBe('$40')
})
