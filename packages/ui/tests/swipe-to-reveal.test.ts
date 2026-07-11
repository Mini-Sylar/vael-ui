import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SwipeToRevealFixture from './fixtures/SwipeToRevealFixture.vue'
import { resolveSwipeCommit } from '../src/composables/useSwipeReveal'

function testId(screen: RenderResult<unknown>, id: string): HTMLElement {
  const el = screen.container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!el) throw new Error(`${id} not found`)
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

// ---------------------------------------------------------------------------
// useSwipeReveal.ts — pure commit decision, driven with known velocity/
// distance inputs rather than through real pointer timing (unreliable to
// simulate — see resizable.test.ts's own composable-vs-DOM split convention).
// ---------------------------------------------------------------------------

test('resolveSwipeCommit: a fast flick commits toward its direction regardless of distance', () => {
  expect(resolveSwipeCommit({ velocity: 0.5, towardOpen: true, openFraction: 0.1 })).toBe(true)
  expect(resolveSwipeCommit({ velocity: 0.5, towardOpen: false, openFraction: 0.9 })).toBe(false)
})

test('resolveSwipeCommit: a slow drag falls back to distance — crossing the midpoint commits open', () => {
  expect(resolveSwipeCommit({ velocity: 0.01, towardOpen: true, openFraction: 0.6 })).toBe(true)
  expect(resolveSwipeCommit({ velocity: 0.01, towardOpen: true, openFraction: 0.4 })).toBe(false)
})

// ---------------------------------------------------------------------------
// SwipeToReveal.vue — rendering, drag, accessibility, programmatic control.
// ---------------------------------------------------------------------------

test('closed by default, actions clipped but present in the DOM', async () => {
  const screen = render(SwipeToRevealFixture, {})
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(testId(screen, 'archive')).not.toBeNull()
  expect(testId(screen, 'delete')).not.toBeNull()
})

test('a real drag past the midpoint commits open, updates v-model, and fires change', async () => {
  const screen = render(SwipeToRevealFixture, {})
  const content = testId(screen, 'content')
  const rect = content.getBoundingClientRect()

  pointerdown(content, rect.right - 5, rect.top + 10)
  pointermove(rect.right - 15, rect.top + 10) // cross DRAG_THRESHOLD
  pointermove(rect.right - 80, rect.top + 10) // well past the actions width's midpoint
  pointerup(rect.right - 80, rect.top + 10)

  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('change-count')).toHaveTextContent('1')
})

test('a short, slow drag springs back closed', async () => {
  const screen = render(SwipeToRevealFixture, {})
  const content = testId(screen, 'content')
  const rect = content.getBoundingClientRect()

  pointerdown(content, rect.right - 5, rect.top + 10)
  pointermove(rect.right - 15, rect.top + 10)
  // Real time must actually elapse before releasing — dispatched events fire
  // synchronously, so back-to-back calls with no delay collapse `elapsed` to
  // ~1ms, making even a few px of movement compute as an enormous velocity
  // (px / ~1ms) that crosses VELOCITY_THRESHOLD regardless of real intent.
  // Total travel here is 15px (pointerdown at right-5 to release at
  // right-20) — needs elapsed > 15/0.11 ≈ 136ms to genuinely read as
  // "slow"; 200ms clears that with real margin.
  await new Promise((resolve) => setTimeout(resolve, 200))
  pointermove(rect.right - 20, rect.top + 10) // barely past threshold, well under the actions width
  pointerup(rect.right - 20, rect.top + 10)

  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('programmatic reveal() opens without any drag', async () => {
  const screen = render(SwipeToRevealFixture, {})
  await userEvent.click(testId(screen, 'reveal-btn'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test("tapping the content while open closes it, without firing the content's own click handler", async () => {
  const screen = render(SwipeToRevealFixture, {})
  await userEvent.click(testId(screen, 'reveal-btn'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await userEvent.click(testId(screen, 'content'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('content-click-count')).toHaveTextContent('0')
})

test("a plain tap while closed passes through to the content's own click handler untouched", async () => {
  const screen = render(SwipeToRevealFixture, {})
  await userEvent.click(testId(screen, 'content'))
  await expect.element(screen.getByTestId('content-click-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test("clicking an action button closes the row via the slot's own close() helper", async () => {
  const screen = render(SwipeToRevealFixture, {})
  await userEvent.click(testId(screen, 'reveal-btn'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await userEvent.click(testId(screen, 'archive'))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('action buttons stay reachable via Tab regardless of visual open state', async () => {
  const screen = render(SwipeToRevealFixture, {})
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  testId(screen, 'before').focus()
  await userEvent.keyboard('{Tab}')
  // Whatever the exact tab order (actions sit before content in the DOM),
  // an action button must be reachable without ever performing a drag.
  await userEvent.keyboard('{Tab}')
  const reachedAnAction =
    document.activeElement === testId(screen, 'archive') ||
    document.activeElement === testId(screen, 'delete')
  expect(reachedAnAction).toBe(true)
})

test('disabled blocks the drag gesture but leaves plain clicks working', async () => {
  const screen = render(SwipeToRevealFixture, { props: { disabled: true } })
  const content = testId(screen, 'content')
  const rect = content.getBoundingClientRect()

  pointerdown(content, rect.right - 5, rect.top + 10)
  pointermove(rect.right - 80, rect.top + 10)
  pointerup(rect.right - 80, rect.top + 10)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  await userEvent.click(content)
  await expect.element(screen.getByTestId('content-click-count')).toHaveTextContent('1')
})

test('side="leading" reveals from the left — a rightward drag opens it', async () => {
  const screen = render(SwipeToRevealFixture, { props: { side: 'leading' } })
  const content = testId(screen, 'content')
  const rect = content.getBoundingClientRect()

  pointerdown(content, rect.left + 5, rect.top + 10)
  pointermove(rect.left + 15, rect.top + 10)
  pointermove(rect.left + 80, rect.top + 10)
  pointerup(rect.left + 80, rect.top + 10)

  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})
