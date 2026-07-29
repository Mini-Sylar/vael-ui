import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PullToRefreshFixture from './fixtures/PullToRefreshFixture.vue'

/**
 * vueuse's `useEventListener` attaches to a computed target ref via a
 * `watch` that flushes a tick after mount, not synchronously within
 * `render()` — a pointerdown dispatched immediately after `render()` can
 * race ahead of that attachment and land on no listener at all. Real
 * pointer input always arrives well after mount, so this is purely a test
 * artifact; this tick absorbs it.
 */
async function settle() {
  await new Promise((r) => setTimeout(r, 0))
}

function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ptr-fixture')
  if (!el) throw new Error('root not in DOM')
  return el
}

function zone(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ui-pull-to-refresh-zone')
  if (!el) throw new Error('zone not in DOM')
  return el
}

function zoneHeight(): number {
  return zone().getBoundingClientRect().height
}

function state(): string | undefined {
  return zone().dataset.state
}

/** Realistic timing, matching bottom-sheet.test.ts's own drag() helper. */
async function drag(el: Element, startY: number, endY: number, ms: number) {
  const pointerId = 1
  el.dispatchEvent(new PointerEvent('pointerdown', { clientY: startY, pointerId, bubbles: true }))
  await new Promise((r) => setTimeout(r, ms))
  el.dispatchEvent(new PointerEvent('pointermove', { clientY: endY, pointerId, bubbles: true }))
  el.dispatchEvent(new PointerEvent('pointerup', { clientY: endY, pointerId, bubbles: true }))
}

test('a slow pull below threshold releases back to idle without calling onRefresh', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  render(PullToRefreshFixture, { props: { onRefresh } })
  await settle()

  // delta 30 (below the 60px threshold) over 400ms — 0.075px/ms, well under
  // the fast-flick gate, so distance is the only thing being exercised here.
  await drag(root(), 20, 50, 400)

  await vi.waitFor(() => expect(state()).toBe('idle'))
  await vi.waitFor(() => expect(zoneHeight()).toBeCloseTo(0, 0))
  expect(onRefresh).not.toHaveBeenCalled()
})

test('a fast short flick below threshold still calls onRefresh', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  render(PullToRefreshFixture, { props: { onRefresh } })
  await settle()

  // delta 35 (below the 60px threshold) over 20ms — 1.75px/ms, a decisive
  // flick that should commit despite not reaching the raw distance.
  await drag(root(), 20, 55, 20)

  await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledOnce())
})

test('a pull past threshold walks pulling -> ready -> loading -> done -> idle and calls onRefresh once', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  render(PullToRefreshFixture, { props: { onRefresh } })
  await settle()
  const pointerId = 1

  root().dispatchEvent(new PointerEvent('pointerdown', { clientY: 20, pointerId, bubbles: true }))
  await new Promise((r) => setTimeout(r, 30))
  root().dispatchEvent(
    new PointerEvent('pointermove', { clientY: 60, pointerId, bubbles: true }), // delta 40
  )
  await vi.waitFor(() => expect(state()).toBe('pulling'))

  root().dispatchEvent(
    new PointerEvent('pointermove', { clientY: 110, pointerId, bubbles: true }), // delta 90
  )
  await vi.waitFor(() => expect(state()).toBe('ready'))

  root().dispatchEvent(new PointerEvent('pointerup', { clientY: 110, pointerId, bubbles: true }))
  await vi.waitFor(() => expect(['loading', 'done']).toContain(state()))
  await vi.waitFor(() => expect(state()).toBe('idle'), { timeout: 1500 })

  expect(onRefresh).toHaveBeenCalledTimes(1)
})

test('a drag while scrollTop > 0 does nothing', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  render(PullToRefreshFixture, { props: { onRefresh } })
  await settle()

  root().scrollTop = 100
  await drag(root(), 20, 110, 50)

  expect(state()).toBe('idle')
  expect(zoneHeight()).toBeCloseTo(0, 0)
  expect(onRefresh).not.toHaveBeenCalled()
})

test('programmatic refresh() walks the same loading/done state machine', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  const screen = render(PullToRefreshFixture, { props: { onRefresh } })
  await settle()

  await screen.getByTestId('programmatic-refresh').click()
  await vi.waitFor(() => expect(['loading', 'done']).toContain(state()))
  await vi.waitFor(() => expect(state()).toBe('idle'), { timeout: 1500 })

  expect(onRefresh).toHaveBeenCalledTimes(1)
})

test('the #indicator slot receives state and progress', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  const screen = render(PullToRefreshFixture, { props: { onRefresh, customIndicator: true } })
  await settle()
  const pointerId = 1

  // Holds mid-drag (no release) so `ready` stays observable instead of
  // racing straight into `loading` the instant a release commits.
  root().dispatchEvent(new PointerEvent('pointerdown', { clientY: 20, pointerId, bubbles: true }))
  await new Promise((r) => setTimeout(r, 30))
  root().dispatchEvent(new PointerEvent('pointermove', { clientY: 110, pointerId, bubbles: true }))

  await vi.waitFor(() =>
    expect.element(screen.getByTestId('custom-indicator')).toHaveTextContent('ready:1.00'),
  )
})

test('an onRefresh that rejects still settles back to idle instead of getting stuck loading', async () => {
  const onRefresh = vi.fn().mockRejectedValue(new Error('boom'))
  const screen = render(PullToRefreshFixture, { props: { onRefresh } })
  await settle()

  await screen.getByTestId('programmatic-refresh').click()
  await vi.waitFor(() => expect(['loading', 'done']).toContain(state()))
  await vi.waitFor(() => expect(state()).toBe('idle'), { timeout: 2000 })

  expect(onRefresh).toHaveBeenCalledTimes(1)
})
