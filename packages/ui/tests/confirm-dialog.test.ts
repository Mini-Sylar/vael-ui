import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ConfirmDialogFixture from './fixtures/ConfirmDialogFixture.vue'
import { useConfirmAction } from '../src/composables/useConfirmAction'

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
// useConfirmAction — pure state logic, no DOM needed.
// ---------------------------------------------------------------------------

test('confirm() with no action closes immediately, synchronously', async () => {
  const { open, pending, confirm } = useConfirmAction()
  open.value = true
  await confirm()
  expect(open.value).toBe(false)
  expect(pending.value).toBe(false)
})

test('confirm(action) keeps open+pending true while the action is in flight, closes only on resolve', async () => {
  const { open, pending, confirm } = useConfirmAction()
  open.value = true
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })

  const done = confirm(() => gate)
  // Still synchronously mid-flight: open stays true, pending flips on.
  expect(open.value).toBe(true)
  expect(pending.value).toBe(true)

  release()
  await done
  expect(open.value).toBe(false)
  expect(pending.value).toBe(false)
})

test('a rejecting action clears pending and sets error, but leaves open true — nothing closes on failure', async () => {
  const { open, pending, error, confirm } = useConfirmAction()
  open.value = true
  const failure = new Error('network down')

  await confirm(() => Promise.reject(failure))

  expect(open.value).toBe(true)
  expect(pending.value).toBe(false)
  expect(error.value).toBe(failure)
})

test('error clears at the start of the next confirm() call', async () => {
  const { error, confirm } = useConfirmAction()
  await confirm(() => Promise.reject(new Error('first')))
  expect(error.value).toBeInstanceOf(Error)

  await confirm(() => Promise.resolve())
  expect(error.value).toBe(null)
})

test('cancel() always closes immediately — never runs an action, never waits on pending', () => {
  const { open, pending, cancel } = useConfirmAction()
  open.value = true
  cancel()
  expect(open.value).toBe(false)
  expect(pending.value).toBe(false)
})

// ---------------------------------------------------------------------------
// confirmDialog — built on openDialog/DialogHost; real DOM + real Button
// loading="auto" behavior.
// ---------------------------------------------------------------------------

test('renders title/description and a Cancel/Confirm footer; Cancel closes without running onConfirm and resolves false', async () => {
  const screen = render(ConfirmDialogFixture)
  await screen.getByTestId('open-sync').click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()
  await expect.element(page.getByText('Discard changes?')).toBeVisible()
  await expect.element(page.getByText('You have unsaved edits.')).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('false')
})

test('Confirm with no onConfirm closes immediately and resolves true', async () => {
  const screen = render(ConfirmDialogFixture)
  await screen.getByTestId('open-sync').click()

  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
  await expect.element(screen.getByTestId('result')).toHaveTextContent('true')
})

test('an async onConfirm keeps the dialog open (Button shows its own loading state) until it resolves, then closes', async () => {
  const screen = render(ConfirmDialogFixture)
  await screen.getByTestId('open-resolve').click()

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

test('a rejecting onConfirm fires onError and leaves the dialog open — nothing closes it out from under the failure', async () => {
  const screen = render(ConfirmDialogFixture)
  await screen.getByTestId('open-reject').click()

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
