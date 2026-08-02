import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ConfirmActionFixture from './fixtures/ConfirmActionFixture.vue'
import { useDialogQueue } from '../src/composables/useDialogService'
import { usePopoverQueue } from '../src/composables/usePopoverService'

// The settle buttons sit behind the modal dialog's overlay by design (they're
// the test harness's gate controls, not real UI) — a real pointer click
// lands on the overlay first regardless of `force`, since force only skips
// Playwright's actionability checks, not hit-testing at the click point. The
// native DOM `.click()` synthesizes the event directly on the element,
// sidestepping z-order entirely.
function clickBehindOverlay(container: HTMLElement, testId: string) {
  container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!.click()
}

// ---------------------------------------------------------------------------
// surface: 'dialog' (the default) — built on openDialog/DialogHost.
// ---------------------------------------------------------------------------

test('dialog: renders title/description and a Cancel/Confirm footer; Cancel closes without running onConfirm and resolves false', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-dialog-sync').click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()
  await expect.element(page.getByText('Discard changes?')).toBeVisible()
  await expect.element(page.getByText('You have unsaved edits.')).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('false')
})

test('dialog: Confirm with no onConfirm closes immediately and resolves true', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-dialog-sync').click()

  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('true')
})

test('dialog: an async onConfirm keeps it open (Button shows its own loading state) until it resolves, then closes', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-dialog-resolve').click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()

  const confirmButton = page.getByRole('button', { name: 'Confirm' })
  await confirmButton.click()

  // Still in flight: dialog stays mounted, onConfirm was called exactly once.
  await expect.element(screen.getByTestId('confirm-calls')).toHaveTextContent('1')
  await expect.element(dialog).toBeVisible()
  await expect.element(confirmButton).toHaveAttribute('aria-disabled', 'true')

  clickBehindOverlay(screen.container, 'settle-resolve')

  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('true')
})

test('dialog: a rejecting onConfirm fires onError and leaves it open — nothing closes it out from under the failure', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-dialog-reject').click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()

  clickBehindOverlay(screen.container, 'settle-reject')

  await expect.element(screen.getByTestId('error-calls')).toHaveTextContent('1')
  // Still open — rejection must not have closed it.
  await expect.element(dialog).toBeVisible()

  // Clean up so this dialog doesn't leak into the next test's shared queue.
  await page.getByRole('button', { name: 'Cancel' }).click()
  await vi.waitFor(async () => {
    await expect.element(dialog).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// surface: 'popover' — built on openPopover/PopoverHost, anchored to a real
// trigger element instead of centered.
// ---------------------------------------------------------------------------

test('popover: anchors to triggerEl, renders title, Cancel closes and resolves false', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-popover-sync').click()

  const popover = page.getByText('Remove tag?')
  await expect.element(popover).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect.element(popover).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('false')
})

test('popover: Confirm with no onConfirm closes immediately and resolves true', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-popover-sync').click()

  await expect.element(page.getByText('Remove tag?')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect.element(page.getByText('Remove tag?')).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('true')
})

test('popover: an async onConfirm keeps it open until it resolves, then closes — same gating as dialog', async () => {
  const screen = render(ConfirmActionFixture)
  await screen.getByTestId('open-popover-resolve').click()

  const popover = page.getByText('Remove tag?')
  await expect.element(popover).toBeVisible()

  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect.element(screen.getByTestId('confirm-calls')).toHaveTextContent('1')
  await expect.element(popover).toBeVisible()

  clickBehindOverlay(screen.container, 'settle-resolve')

  await expect.element(popover).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('true')
})

test('dialog and popover queues are independent — one open does not affect the other', async () => {
  const screen = render(ConfirmActionFixture)
  const dialogQueue = useDialogQueue()
  const popoverQueue = usePopoverQueue()

  // Popover first, and pinned (closeOnOutside: false) — otherwise the very
  // click that opens the dialog next would count as an outside click and
  // close the popover on its own, which is correct Popover behavior but
  // not what this test is isolating (queue independence, not dismissal
  // rules). Dialog is also modal, marking background content inert while
  // open, so DOM visibility isn't a meaningful check here either way.
  await screen.getByTestId('open-popover-pinned').click()
  await expect.poll(() => popoverQueue.length).toBe(1)

  await screen.getByTestId('open-dialog-sync').click()
  await expect.poll(() => dialogQueue.length).toBe(1)

  // Closing the dialog leaves the popover's own queue entry untouched.
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect.poll(() => dialogQueue.length).toBe(0)
  expect(popoverQueue.length).toBe(1)

  // Clean up: close the popover too (scoped to its own content via a
  // direct DOM query, not any other identically-labeled Cancel button).
  document
    .querySelector('.ui-confirm-popover')
    ?.querySelectorAll('button')
    .forEach((button) => {
      if (button.textContent?.trim() === 'Cancel') button.click()
    })
  await expect.poll(() => popoverQueue.length).toBe(0)
})
