import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import PopoverFixture from './fixtures/PopoverFixture.vue'

function positioner(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ui-popover-positioner')
  if (!el) throw new Error('positioner not in DOM')
  return el
}

test('#trigger slot: click opens, panel teleports to body, attrs land on the panel', async () => {
  const screen = render(PopoverFixture)
  expect(document.querySelector('.ui-popover-positioner')).toBeNull()

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  expect(screen.container.contains(positioner())).toBe(false)
  expect(document.body.contains(positioner())).toBe(true)
  const panel = document.querySelector<HTMLElement>('.ui-popover-panel')!
  expect(panel.getAttribute('aria-label')).toBe('Test popover')
  expect(positioner().getAttribute('aria-label')).toBeNull()
})

test('resolved placement is exposed as data-side/data-align', async () => {
  const screen = render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  expect(positioner().dataset.side).toBe('bottom')
  expect(positioner().dataset.align).toBe('center')
})

test('outside click dismisses; closeOnOutside=false leaves it open', async () => {
  const screen = render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await screen.getByTestId('outside').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  screen.unmount()
  const pinned = render(PopoverFixture, { props: { closeOnOutside: false } })
  await pinned.getByTestId('trigger').click()
  await expect.element(pinned.getByTestId('content')).toBeVisible()
  await pinned.getByTestId('outside').click()
  await expect.element(pinned.getByTestId('open-state')).toHaveTextContent('open')
})

test('Escape dismisses; closeOnEsc=false leaves it open', async () => {
  const screen = render(PopoverFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  screen.unmount()
  const pinned = render(PopoverFixture, { props: { closeOnEsc: false } })
  await pinned.getByTestId('trigger').click()
  await expect.element(pinned.getByTestId('content')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await expect.element(pinned.getByTestId('open-state')).toHaveTextContent('open')
})

test('forceMount keeps the panel mounted and hidden when closed', async () => {
  const screen = render(PopoverFixture, { props: { forceMount: true } })

  expect(getComputedStyle(positioner()).display).toBe('none')

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('content')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(document.querySelector('.ui-popover-positioner')).not.toBeNull()
  expect(getComputedStyle(positioner()).display).toBe('none')
})
