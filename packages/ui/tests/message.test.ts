import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import MessageFixture from './fixtures/MessageFixture.vue'
import Message from '../src/components/Message/Message.vue'

test('default variant gets role="status"', async () => {
  render(Message, { slots: { default: 'Heads up' } })
  await expect.element(page.getByRole('status')).toBeVisible()
})

test('error variant gets role="alert"', async () => {
  const screen = render(Message, { props: { variant: 'error' }, slots: { default: 'Failed' } })
  const el = screen.container.querySelector('.ui-message')!
  expect(el.getAttribute('role')).toBe('alert')
})

test('warning variant gets role="alert"', async () => {
  const screen = render(Message, { props: { variant: 'warning' }, slots: { default: 'Careful' } })
  expect(screen.container.querySelector('.ui-message')!.getAttribute('role')).toBe('alert')
})

test('explicit role prop overrides the variant-based default', async () => {
  const screen = render(Message, {
    props: { variant: 'error', role: 'status' },
    slots: { default: 'Failed but calm' },
  })
  expect(screen.container.querySelector('.ui-message')!.getAttribute('role')).toBe('status')
})

test('showIcon renders StatusIcon for the variant; false omits the icon wrapper', async () => {
  const withIcon = render(Message, { props: { variant: 'success' }, slots: { default: 'x' } })
  expect(withIcon.container.querySelector('.ui-message-icon svg')).not.toBeNull()

  const withoutIcon = render(Message, {
    props: { variant: 'success', showIcon: false },
    slots: { default: 'x' },
  })
  expect(withoutIcon.container.querySelector('.ui-message-icon')).toBeNull()
})

test('closable renders a localized dismiss button that flips the model closed', async () => {
  const screen = render(Message, { props: { closable: true }, slots: { default: 'Bye' } })
  const button = page.getByRole('button', { name: 'Dismiss' })
  await expect.element(button).toBeVisible()
  await button.click()
  await vi.waitFor(() => expect(screen.container.querySelector('.ui-message')).toBeNull())
})

test('beforeClose defers the close: data-state="closing" until done() runs', async () => {
  const captured: Array<() => void> = []
  const screen = render(MessageFixture, {
    props: { beforeClose: (done: () => void) => captured.push(done) },
  })

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await page.getByRole('button', { name: 'Dismiss' }).click()
  expect(captured.length).toBe(1)
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('closing')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  expect(document.querySelector<HTMLElement>('.ui-message')!.dataset.state).toBe('closing')

  captured[0]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('cancelClose reverses a pending close and voids the stale done()', async () => {
  const captured: Array<() => void> = []
  const screen = render(MessageFixture, {
    props: { beforeClose: (done: () => void) => captured.push(done) },
  })

  await screen.getByTestId('trigger').click()
  await page.getByRole('button', { name: 'Dismiss' }).click()
  expect(captured.length).toBe(1)
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('closing')

  await screen.getByTestId('cancel-close').click()
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  captured[0]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('details.cancel() on open-change vetoes the close', async () => {
  const screen = render(MessageFixture, { props: { veto: true } })
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('programmatic close() via the exposed instance works the same as the dismiss button', async () => {
  const screen = render(MessageFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await screen.getByTestId('programmatic-close').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('forceMount keeps the node mounted (display:none) instead of removing it', async () => {
  const screen = render(Message, {
    props: { forceMount: true, open: false },
    slots: { default: 'Always mounted' },
  })
  const el = screen.container.querySelector<HTMLElement>('.ui-message')
  expect(el).not.toBeNull()
  expect(getComputedStyle(el!).display).toBe('none')
})

test('escape hatch: keyboard-only dismiss is unaffected — no Escape handling of its own (stationary, not floating)', async () => {
  const screen = render(Message, { props: { closable: true }, slots: { default: 'x' } })
  await userEvent.keyboard('{Escape}')
  expect(screen.container.querySelector('.ui-message')).not.toBeNull()
})

test('appearance="bare" drops the box, keeps variant/role/icon behavior', async () => {
  const screen = render(Message, {
    props: { variant: 'error', appearance: 'bare' },
    slots: { default: 'Required' },
  })
  const el = screen.container.querySelector('.ui-message')!
  expect(el).toHaveClass('ui-message--bare')
  expect(el.getAttribute('role')).toBe('alert')
  expect(el.querySelector('.ui-message-icon svg')).not.toBeNull()
})
