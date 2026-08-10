import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SpeedDialFixture from './fixtures/SpeedDialFixture.vue'

function trigger(screen: RenderResult<unknown>): HTMLButtonElement {
  return screen.container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!
}
function actionButtons(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
}
function root(screen: RenderResult<unknown>): HTMLElement {
  return screen.container.querySelector<HTMLElement>('.ui-speed-dial')!
}

test('closed by default: trigger renders but no action items are in the DOM', async () => {
  const screen = render(SpeedDialFixture, {})
  await expect.element(trigger(screen)).toBeInTheDocument()
  expect(actionButtons(screen)).toHaveLength(0)
  expect(trigger(screen).getAttribute('aria-expanded')).toBe('false')
  expect(root(screen).getAttribute('data-state')).toBe('closed')
})

test('exposes the root element via defineExpose', async () => {
  const screen = render(SpeedDialFixture, {})
  await expect.element(screen.getByTestId('exposed-el')).toHaveTextContent('yes')
})

test('clicking the trigger opens the dial: items appear, aria-expanded/data-state flip', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))
  expect(trigger(screen).getAttribute('aria-expanded')).toBe('true')
  expect(root(screen).getAttribute('data-state')).toBe('open')
  expect(actionButtons(screen).map((b) => b.getAttribute('aria-label'))).toEqual([
    'Home',
    'Folder',
    'Message',
    'Trash',
  ])
})

test('clicking the trigger again closes it', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))
  await userEvent.click(trigger(screen))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('false')
})

test('data-direction reflects the direction prop', async () => {
  const screen = render(SpeedDialFixture, { props: { direction: 'left' } })
  expect(root(screen).getAttribute('data-direction')).toBe('left')
})

test("selecting an action fires @select with the item and the item's own onSelect", async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  await userEvent.click(actionButtons(screen)[0]!) // "Home" — carries its own onSelect
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('home')
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('home-select-count')).toHaveTextContent('1')
})

test('closeOnSelect (default true): selecting an action closes the dial and returns focus to the trigger', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  await userEvent.click(actionButtons(screen)[1]!) // "Folder"
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('false')
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger(screen)))
})

test('closeOnSelect=false keeps the dial open after selecting', async () => {
  const screen = render(SpeedDialFixture, { props: { closeOnSelect: false } })
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  await userEvent.click(actionButtons(screen)[1]!)
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('1')
  expect(root(screen).getAttribute('data-state')).toBe('open')
})

test('a disabled action is a real disabled <button> — never fires @select', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  const trash = actionButtons(screen)[3]!
  expect(trash.disabled).toBe(true)
  trash.click() // native click on a disabled button is a no-op
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('0')
})

test('disabled SpeedDial: trigger is a real disabled button and never opens', async () => {
  const screen = render(SpeedDialFixture, { props: { disabled: true } })
  expect(trigger(screen).disabled).toBe(true)
  trigger(screen).click()
  expect(actionButtons(screen)).toHaveLength(0)
})

test('openOn="hover": mouseenter opens, mouseleave closes after a short delay', async () => {
  const screen = render(SpeedDialFixture, { props: { openOn: 'hover' } })
  await userEvent.hover(root(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  await userEvent.unhover(root(screen))
  await vi.waitFor(
    () => expect(screen.getByTestId('open-state').element().textContent).toBe('false'),
    { timeout: 1000 },
  )
})

test('openOn="click" (default): hovering the root alone never opens it', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.hover(root(screen))
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(actionButtons(screen)).toHaveLength(0)
})

test('Escape closes the dial and returns focus to the trigger', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('false')
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger(screen)))
})

test('a pointerdown outside the dial closes it', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  // Dispatched directly rather than userEvent.click: the open action list's
  // layout can visually cover other fixture elements regardless of their
  // document position, which trips Playwright's real-pointer actionability
  // checks even though nothing is actually blocking THIS component's own
  // capturing document `pointerdown` listener.
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('false')
})

test('once open, ArrowDown/ArrowUp roll the roving tabindex across actions, skipping the disabled one, and wrap', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))
  const buttons = actionButtons(screen)
  await vi.waitFor(() => expect(document.activeElement).toBe(buttons[0]))

  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(buttons[1])

  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(buttons[2])

  // One more ArrowDown wraps past the disabled last item straight back to the first.
  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(buttons[0])

  await userEvent.keyboard('{ArrowUp}')
  expect(document.activeElement).toBe(buttons[2]) // wraps backward, skipping disabled again
})

test('Home/End jump to the first/last enabled action', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))
  const buttons = actionButtons(screen)
  buttons[1]!.focus()

  await userEvent.keyboard('{End}')
  expect(document.activeElement).toBe(buttons[2]) // last ENABLED action, not the disabled Trash

  await userEvent.keyboard('{Home}')
  expect(document.activeElement).toBe(buttons[0])
})

test('Enter/Space activates the focused action via a real click', async () => {
  const screen = render(SpeedDialFixture, {})
  await userEvent.click(trigger(screen))
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))
  const buttons = actionButtons(screen)
  buttons[1]!.focus() // "Folder"

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('folder')
})

test('defineExpose: open()/close()/toggle() drive the dial programmatically', async () => {
  const screen = render(SpeedDialFixture, {})

  await screen.getByTestId('call-open').click()
  await vi.waitFor(() => expect(actionButtons(screen)).toHaveLength(4))

  await screen.getByTestId('call-close').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('false')

  await screen.getByTestId('call-toggle').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('true')
})
