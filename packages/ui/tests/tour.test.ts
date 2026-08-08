// Real layout matters here (spotlight clip-path, positioning), so load the CSS
import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TourFixture from './fixtures/TourFixture.vue'
import TourTeleportFixture from './fixtures/TourTeleportFixture.vue'

test('opens on the first step, target stays interactive by default, page scroll-locks', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()

  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')
  await expect.element(page.getByText('Step A')).toBeVisible()
  expect(document.getElementById('target-a')!.inert).toBe(false)
  expect(document.documentElement.style.overflow).toBe('hidden')
})

test('next/prev navigate steps and re-target the spotlight', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('1')
  await expect.element(page.getByText('Step B')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('0')
  await expect.element(page.getByText('Step A')).toBeVisible()
})

test('disableInteraction makes the target inert too, unlike the default', async () => {
  // `inert` inherits from an ancestor, so check effective inertness (closest([inert])),
  // not the element's own attribute — Tour may mark a shared container inert rather than
  // the target itself, depending on what else is (or isn't) protected at that moment.
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()
  expect(document.getElementById('target-a')!.closest('[inert]')).toBeNull()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Step B')).toBeVisible()
  await vi.waitFor(() =>
    expect(document.getElementById('target-b')!.closest('[inert]')).not.toBeNull(),
  )
})

test('onBeforeEnter runs before the target is resolved — the "open a drawer first" case', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  expect(document.getElementById('target-d')).toBeNull() // not mounted yet

  await page.getByRole('button', { name: 'Next' }).click() // -> B
  await page.getByRole('button', { name: 'Next' }).click() // -> C
  await page.getByRole('button', { name: 'Next' }).click() // -> D, behind onBeforeEnter
  await expect.element(page.getByText('Step D')).toBeVisible()
  expect(document.getElementById('target-d')).not.toBeNull() // onBeforeEnter mounted it in time
})

test('onBeforeEnter resolves and positions correctly regardless of which teleported component the target lives behind', async () => {
  // Each of these steps' target only exists once its own onBeforeEnter opens a DIFFERENT
  // teleported component (Dialog, then Drawer, then Popover, then BottomSheet, then
  // CommandPalette) — all five teleport to body independently of Tour's own
  // Popover/TourSpotlight teleports. Checking that focus (via Tour's own focus-management)
  // lands inside Tour's panel each time is the strictest available proof that useDOMTarget
  // re-resolved AND floating-ui actually positioned against the new target — a stale/null
  // reference would leave positionerStyle stuck at `visibility: hidden`, and a hidden
  // element can never receive focus (see this file's git history for exactly that bug,
  // caught by this same check).
  const screen = render(TourTeleportFixture)
  await screen.getByTestId('trigger').click()

  const expectTourPanelFocused = (text: string) =>
    vi.waitFor(() => {
      const panels = document.querySelectorAll('.ui-popover-panel')
      const tourPanel = Array.from(panels).find((p) => p.textContent?.includes(text))
      expect(tourPanel?.contains(document.activeElement)).toBe(true)
    })

  await expect.element(page.getByText('Behind a Dialog')).toBeVisible()
  await expectTourPanelFocused('Behind a Dialog')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a Drawer')).toBeVisible()
  await expectTourPanelFocused('Behind a Drawer')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a Popover')).toBeVisible()
  await expectTourPanelFocused('Behind a Popover')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a BottomSheet')).toBeVisible()
  await expectTourPanelFocused('Behind a BottomSheet')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a CommandPalette')).toBeVisible()
  await expectTourPanelFocused('Behind a CommandPalette')
})

test('advancing past the last step finishes and closes; skip closes early', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  await page.getByRole('button', { name: 'Next' }).click() // -> B
  await page.getByRole('button', { name: 'Next' }).click() // -> C
  await page.getByRole('button', { name: 'Next' }).click() // -> D (last)
  await expect.element(page.getByText('Step D')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await expect.element(screen.getByTestId('finished')).toHaveTextContent('finished')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  expect(document.documentElement.style.overflow).toBe('')

  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible() // reopening resets to first step
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect.element(screen.getByTestId('skipped')).toHaveTextContent('skipped')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
})

test('ArrowRight/ArrowLeft step forward and back', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('1')
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('0')
})

test('progress text reflects total step count across groups', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step 1 of 4')).toBeVisible()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(page.getByText('Step 2 of 4')).toBeVisible()
})

test('Escape closes the tour and releases the scroll lock', async () => {
  const screen = render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await vi.waitFor(() => expect(document.documentElement.style.overflow).toBe(''))
})
