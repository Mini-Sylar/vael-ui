/**
 * Regression test for a bug the README documented as a known cut: two
 * simultaneously-open Dialogs each attached their own document-level Escape
 * listener, so one keypress closed BOTH instead of just the topmost. Fixed
 * by useLayerStack — only the most-recently-opened dialog reacts to Escape.
 */
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import StackedDialogsFixture from './fixtures/StackedDialogsFixture.vue'

test('Escape closes only the topmost of two stacked dialogs', async () => {
  const screen = render(StackedDialogsFixture)

  await screen.getByTestId('open-outer').click()
  await expect.element(screen.getByTestId('outer-state')).toHaveTextContent('open')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(1))

  await screen.getByTestId('open-inner').click()
  await expect.element(screen.getByTestId('inner-state')).toHaveTextContent('open')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(2))

  // One Escape press: only the inner (topmost) dialog should close.
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('inner-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('outer-state')).toHaveTextContent('open')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(1))

  // Second Escape press now correctly reaches the outer dialog.
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('outer-state')).toHaveTextContent('closed')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(0))
})

test('focus trap only cycles within the topmost dialog', async () => {
  const screen = render(StackedDialogsFixture)
  await screen.getByTestId('open-outer').click()
  await screen.getByTestId('open-inner').click()
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(2))

  const inner = document.querySelector('[aria-label="Inner"]')!
  await vi.waitFor(() => expect(inner.contains(document.activeElement)).toBe(true))

  await userEvent.keyboard('{Tab}')
  // Tab must stay trapped inside the INNER dialog, not leak into the outer one.
  expect(inner.contains(document.activeElement)).toBe(true)
  expect(document.activeElement?.getAttribute('data-testid')).toBe('inner-field')
  await userEvent.keyboard('{Tab}')
  // Wraps back to the inner close button — never reaches the outer dialog's own fields.
  expect(document.activeElement?.className).toContain('ui-dialog-close')
})

test('scroll lock is reference-counted: stays engaged until every open dialog has closed', async () => {
  const screen = render(StackedDialogsFixture)
  await screen.getByTestId('open-outer').click()
  expect(document.body.style.overflow).toBe('hidden')

  await screen.getByTestId('open-inner').click()
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(2))
  expect(document.body.style.overflow).toBe('hidden')

  // Closing the inner one must NOT release the lock — the outer is still open.
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(1))
  expect(document.body.style.overflow).toBe('hidden')

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(0))
  expect(document.body.style.overflow).toBe('')
})

test('focus returns to whatever opened the inner dialog, not just the document root', async () => {
  const screen = render(StackedDialogsFixture)
  await screen.getByTestId('open-outer').click()
  await screen.getByTestId('open-inner').click()
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(2))

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-testid')).toBe('open-inner'),
  )
})
