// Real layout matters here (edge anchoring, overlay hit-testing), so load the CSS
import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import DrawerFixture from './fixtures/DrawerFixture.vue'

function activeTestId() {
  return document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.className
}

test('position="right" renders a full-height panel anchored to the right edge', async () => {
  const screen = render(DrawerFixture, { props: { position: 'right' } })
  await screen.getByTestId('trigger-modal').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog--right')).not.toBeNull())
  const panel = document.querySelector<HTMLElement>('.ui-dialog--right .ui-dialog-panel')!
  const rect = panel.getBoundingClientRect()
  expect(rect.height).toBeCloseTo(window.innerHeight, 0)
  expect(rect.right).toBeCloseTo(window.innerWidth, 0)
})

test('position="left" renders a full-height panel anchored to the left edge', async () => {
  const screen = render(DrawerFixture, { props: { position: 'left' } })
  await screen.getByTestId('trigger-modal').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog--left')).not.toBeNull())
  const panel = document.querySelector<HTMLElement>('.ui-dialog--left .ui-dialog-panel')!
  const rect = panel.getBoundingClientRect()
  expect(rect.height).toBeCloseTo(window.innerHeight, 0)
  expect(rect.left).toBeCloseTo(0, 0)
})

test('modal=false renders no overlay, does not lock scroll, does not steal focus, and leaves the page clickable', async () => {
  const screen = render(DrawerFixture)
  await screen.getByTestId('trigger-pinned').click()
  await expect.element(screen.getByTestId('pinned-state')).toHaveTextContent('open')

  expect(document.querySelector('.ui-dialog-overlay')).toBeNull()
  expect(document.body.style.overflow).toBe('')
  expect(activeTestId()).toBe('trigger-pinned')

  await screen.getByTestId('outside').click()
  await expect.element(screen.getByTestId('outside-clicks')).toHaveTextContent('1')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('pinned-state')).toHaveTextContent('closed')
})

test('modal=true (default) at position="right" traps focus and locks scroll like a center dialog', async () => {
  const screen = render(DrawerFixture)
  await screen.getByTestId('trigger-modal').click()

  const dialog = page.getByRole('dialog')
  await expect.element(dialog).toBeVisible()
  await expect.element(dialog).toHaveAttribute('aria-modal', 'true')
  expect(document.querySelector('.ui-dialog-overlay')).not.toBeNull()

  await vi.waitFor(() => {
    expect(document.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true)
  })
  expect(document.body.style.overflow).toBe('hidden')

  // Focus lands on the first focusable — the built-in close button — then cycles and wraps
  expect(document.activeElement!.className).toContain('ui-dialog-close')
  await userEvent.keyboard('{Tab}')
  expect(activeTestId()).toBe('first')
  await userEvent.keyboard('{Tab}')
  expect(activeTestId()).toBe('second')
  await userEvent.keyboard('{Tab}')
  expect(activeTestId()).toBe('done')
  await userEvent.keyboard('{Tab}')
  expect(document.activeElement!.className).toContain('ui-dialog-close')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('modal-state')).toHaveTextContent('closed')
  await vi.waitFor(() => expect(activeTestId()).toBe('trigger-modal'))
  expect(document.body.style.overflow).toBe('')
})
