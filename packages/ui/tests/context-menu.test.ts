import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ContextMenuFixture from './fixtures/ContextMenuFixture.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition —
  // same cleanup as menu.test.ts, since ContextMenu wraps a real <Menu>.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function rightClick(el: Element, clientX: number, clientY: number) {
  el.dispatchEvent(
    new MouseEvent('contextmenu', { clientX, clientY, bubbles: true, cancelable: true }),
  )
}

test('right-click opens the menu positioned at the click point', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!

  rightClick(target, 120, 200)
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  const panel = document.querySelector<HTMLElement>('.ui-menu-panel')!
  const rect = panel.getBoundingClientRect()
  // sideOffset is 2px and align is 'start' — the panel's top-left corner
  // should land within a few px of the click point, not centered on the
  // whole target or anchored to its top-left corner.
  expect(Math.abs(rect.left - 120)).toBeLessThan(10)
  expect(Math.abs(rect.top - 200)).toBeLessThan(10)
})

test('Escape closes the menu and select fires with the right item', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  rightClick(target, 50, 50)
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await screen.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('duplicate')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('Escape dismisses without selecting', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  rightClick(target, 50, 50)
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('')
})

test('keyboard nav works once open — ArrowDown moves focus, Enter selects', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  rightClick(target, 50, 50)
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Rename'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Duplicate'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('duplicate')
})

test('right-clicking a NEW point while already open moves the menu instead of stacking a second one', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  rightClick(target, 50, 50)
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  expect(document.querySelectorAll('.ui-menu-panel').length).toBe(1)

  rightClick(target, 150, 250)
  await vi.waitFor(() => {
    const rect = document.querySelector<HTMLElement>('.ui-menu-panel')!.getBoundingClientRect()
    expect(Math.abs(rect.left - 150)).toBeLessThan(10)
  })
  expect(document.querySelectorAll('.ui-menu-panel').length).toBe(1)
})

test('disabled suppresses the contextmenu trigger entirely', async () => {
  const screen = render(ContextMenuFixture, { props: { disabled: true } })
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  rightClick(target, 50, 50)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(document.querySelector('.ui-menu-panel')).toBeNull()
})

test('header and footer slots forward through to the underlying Menu', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  rightClick(target, 50, 50)
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await expect.element(screen.getByTestId('context-menu-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('context-menu-footer')).toBeInTheDocument()
})

test('native browser context menu is suppressed (preventDefault on contextmenu)', async () => {
  const screen = render(ContextMenuFixture)
  const target = screen.container.querySelector('.ui-context-menu-trigger')!
  const event = new MouseEvent('contextmenu', {
    clientX: 50,
    clientY: 50,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
})
