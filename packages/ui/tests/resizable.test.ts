import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import ResizableFixture from './fixtures/ResizableFixture.vue'

function rootEl(screen: RenderResult<unknown>, testId: string): HTMLElement {
  const el = screen.container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  if (!el) throw new Error('root not found')
  return el
}

function handleEl(screen: RenderResult<unknown>, testId: string): HTMLElement {
  const el = rootEl(screen, testId).querySelector<HTMLElement>('.ui-resizable-handle')
  if (!el) throw new Error('handle not found')
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

test('dragging the handle updates the bound size (horizontal, edge="end" grows rightward)', async () => {
  const screen = render(ResizableFixture, {})
  const handle = handleEl(screen, 'single')

  pointerdown(handle, 0)
  pointermove(40)
  pointerup(40)

  await expect.element(screen.getByTestId('single-size')).toHaveTextContent('190')
})

test('dragging past max rubber-bands (overshoot stays below the raw drag distance) then snaps to max on release', async () => {
  const screen = render(ResizableFixture, {})
  const handle = handleEl(screen, 'single')
  const output = screen.getByTestId('single-size')

  pointerdown(handle, 0)
  pointermove(1000) // way past max (300) from the starting size (150)
  await vi.waitFor(() => {
    const value = Number(output.element().textContent)
    // Rubber-banded: past max, but resisted well short of a 1:1 follow
    // (the raw, unclamped drag would land at 150 + 1000 = 1150).
    expect(value).toBeGreaterThan(300)
    expect(value).toBeLessThan(1150)
  })

  pointerup(1000)
  await expect.element(output).toHaveTextContent('300')
})

test('dragging past min rubber-bands then snaps to min on release', async () => {
  const screen = render(ResizableFixture, {})
  const handle = handleEl(screen, 'single')
  const output = screen.getByTestId('single-size')

  pointerdown(handle, 0)
  pointermove(-1000) // way past min (100) from the starting size (150)
  await vi.waitFor(() => {
    const value = Number(output.element().textContent)
    // Rubber-banded: past min, but resisted well short of a 1:1 follow
    // (the raw, unclamped drag would land at 150 - 1000 = -850).
    expect(value).toBeLessThan(100)
    expect(value).toBeGreaterThan(-850)
  })

  pointerup(-1000)
  await expect.element(output).toHaveTextContent('100')
})

test('external v-model changes update the rendered inline-size', async () => {
  const screen = render(ResizableFixture, {})
  const root = rootEl(screen, 'single')
  expect(root.style.inlineSize).toBe('150px')

  // Drive the model from OUTSIDE a drag, same channel a "reset" button would use.
  await userEvent.click(screen.getByTestId('set-external'))

  expect(root.style.inlineSize).toBe('220px')
  await expect.element(screen.getByTestId('single-size')).toHaveTextContent('220')
})

test('vertical direction resizes block-size off the pointer Y axis', async () => {
  const screen = render(ResizableFixture, {})
  const root = rootEl(screen, 'vertical')
  const handle = handleEl(screen, 'vertical')

  expect(root.style.blockSize).toBe('100px')
  pointerdown(handle, 0, 0)
  pointermove(0, 30)
  pointerup(0, 30)

  await expect.element(screen.getByTestId('vertical-size')).toHaveTextContent('130')
  expect(root.style.blockSize).toBe('130px')
})

test('disabled resizable ignores pointer and keyboard interaction', async () => {
  const screen = render(ResizableFixture, {})
  const handle = handleEl(screen, 'disabled')
  expect(handle.getAttribute('tabindex')).toBe('-1')

  pointerdown(handle, 0)
  pointermove(50)
  pointerup(50)

  await expect.element(screen.getByTestId('disabled-size')).toHaveTextContent('150')
})

test('keyboard: arrows step by 16px, Home/End jump to bounds', async () => {
  const screen = render(ResizableFixture, {})
  const handle = handleEl(screen, 'single')
  handle.focus()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('single-size')).toHaveTextContent('166')

  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('single-size')).toHaveTextContent('150')

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('single-size')).toHaveTextContent('300')

  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('single-size')).toHaveTextContent('100')
})

test('data-resizing is set for the duration of a drag and cleared on release', async () => {
  const screen = render(ResizableFixture, {})
  const root = rootEl(screen, 'single')
  const handle = handleEl(screen, 'single')

  pointerdown(handle, 0)
  await vi.waitFor(() => expect(root.hasAttribute('data-resizing')).toBe(true))

  pointermove(10)
  pointerup(10)
  await vi.waitFor(() => expect(root.hasAttribute('data-resizing')).toBe(false))
})
