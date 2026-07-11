import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import PopoverClosingFixture from './fixtures/PopoverClosingFixture.vue'
import DialogClosingFixture from './fixtures/DialogClosingFixture.vue'

test('popover: deferred close exposes isClosing, dedupes dismissals, and done() completes it', async () => {
  const captured: Array<() => void> = []
  const screen = render(PopoverClosingFixture, {
    props: { beforeClose: (done: () => void) => captured.push(done) },
  })

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('open')

  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(1)
  // Model still true, state exposed as closing — the third state made visible
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('closing')
  expect(document.querySelector<HTMLElement>('.ui-popover-positioner')!.dataset.state).toBe(
    'closing',
  )

  // Repeated dismissals while pending are no-ops — beforeClose runs once
  await userEvent.keyboard('{Escape}')
  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(1)

  captured[0]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('popover: cancelClose reverses a pending close and voids the stale done()', async () => {
  const captured: Array<() => void> = []
  const screen = render(PopoverClosingFixture, {
    props: { beforeClose: (done: () => void) => captured.push(done) },
  })

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(1)
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('closing')

  await screen.getByTestId('cancel-close').click()
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  // The cancelled close's done() must not close the popover later
  captured[0]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  // A fresh close still works end to end
  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(2)
  captured[1]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('dialog: same deferred-close contract — isClosing, dedupe, cancelClose, stale done voided', async () => {
  const captured: Array<() => void> = []
  const screen = render(DialogClosingFixture, {
    props: { beforeClose: (done: () => void) => captured.push(done) },
  })

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(1)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('closing')
  expect(document.querySelector<HTMLElement>('.ui-dialog')!.dataset.state).toBe('closing')

  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(1)

  await screen.getByTestId('cancel-close').click()
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('open')
  captured[0]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await userEvent.keyboard('{Escape}')
  expect(captured.length).toBe(2)
  captured[1]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})
