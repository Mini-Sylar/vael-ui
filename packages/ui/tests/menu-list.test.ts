import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import MenuListFixture from './fixtures/MenuListFixture.vue'
import MenuListItemSlotFixture from './fixtures/MenuListItemSlotFixture.vue'
import MenuListInCollapsibleFixture from './fixtures/MenuListInCollapsibleFixture.vue'

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

test('renders rows from items, including a flattened group and a separator', async () => {
  const screen = render(MenuListFixture)

  await expect.element(screen.getByRole('menuitem', { name: 'Dashboard' })).toBeInTheDocument()
  await expect.element(screen.getByRole('menuitem', { name: 'Reports' })).toBeInTheDocument()
  await expect.element(screen.getByRole('menuitem', { name: 'Members' })).toBeInTheDocument()
  await expect.element(screen.getByRole('menuitem', { name: 'Billing' })).toBeInTheDocument()
  // The group label itself ("Team") is non-interactive — not a menuitem.
  await expect.element(screen.getByRole('menuitem', { name: 'Team' })).not.toBeInTheDocument()
  await expect.element(screen.getByText('Team')).toBeInTheDocument()
})

test('renders in-flow from mount without stealing focus', async () => {
  render(MenuListFixture)
  // Nothing auto-focused just because the list is on-screen.
  expect(document.activeElement).not.toBe(document.querySelector('[role="menuitem"]'))
})

test('click fires @select with the item', async () => {
  const screen = render(MenuListFixture)

  await screen.getByRole('menuitem', { name: 'Billing' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('billing')
})

test('Enter/Space activate the focused row and fire @select', async () => {
  const screen = render(MenuListFixture)

  screen.getByRole('menuitem', { name: 'Reports' }).element().focus()
  await vi.waitFor(() => expect(focusedText()).toBe('Reports'))

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('reports')
})

test('ArrowDown/ArrowUp move roving focus and wrap at both ends, skipping disabled rows and non-interactive group labels', async () => {
  const screen = render(MenuListFixture)

  screen.getByRole('menuitem', { name: 'Dashboard' }).element().focus()
  await vi.waitFor(() => expect(focusedText()).toBe('Dashboard'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Reports'))

  // Settings is disabled, and "Team" is a group label (no role="menuitem")
  // — both are skipped straight through to Members.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Members'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Roles'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Billing'))

  // Wraps forward past the end back to Dashboard.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Dashboard'))

  // Wraps backward past the start to the last enabled item.
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(focusedText()).toBe('Billing'))
})

test('active renders aria-current="page" on the matching row only', async () => {
  const screen = render(MenuListFixture)

  await expect
    .element(screen.getByRole('menuitem', { name: 'Reports' }))
    .toHaveAttribute('aria-current', 'page')
  await expect
    .element(screen.getByRole('menuitem', { name: 'Dashboard' }))
    .not.toHaveAttribute('aria-current')
})

test('#item slot override replaces row content but keeps click behavior', async () => {
  const screen = render(MenuListItemSlotFixture)

  await expect.element(screen.getByTestId('custom-row').first()).toBeInTheDocument()
  await screen.getByRole('menuitem', { name: '★ Profile' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('profile')
})

// Regression coverage for the dashboard's sidebar shape: a MenuList nested
// inside a Collapsible's always-in-DOM panel, sitting alongside a second,
// independent top-level MenuList — the exact structure the "keyboard nav
// doesn't work in sub-menus" bug report described. Each of the three leads
// in that report is asserted individually so a future regression in any one
// of them fails here instead of just "arrow keys are broken" with no clue
// which assumption gave out.
test('MenuList nested in an already-open Collapsible seeds roving tabindex on mount', async () => {
  render(MenuListInCollapsibleFixture)

  const general = document.querySelector('[role="menuitem"]:not([tabindex="-1"])')
  expect(general?.textContent?.trim()).toBe('Overview')
  // The sub-list is a SEPARATE roving-focus scope from the top-level list —
  // it seeds its own tabindex="0" independently, not by inheriting/sharing
  // the top-level list's one Tab stop.
  const subItems = Array.from(document.querySelectorAll('.ui-collapsible-panel [role="menuitem"]'))
  expect(subItems.map((el) => el.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
})

test('ArrowDown/ArrowUp move roving focus within a Collapsible-nested MenuList, independent of the sibling top-level list', async () => {
  const screen = render(MenuListInCollapsibleFixture)

  screen.getByRole('menuitem', { name: 'General' }).element().focus()
  await vi.waitFor(() => expect(focusedText()).toBe('General'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Notifications'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Security'))

  // Wraps within the sub-list's own three rows — never leaks into the
  // top-level list's "Overview"/"Orders".
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('General'))
})

test('selecting a row inside a Collapsible-nested MenuList updates aria-current on that row only', async () => {
  const screen = render(MenuListInCollapsibleFixture)

  await screen.getByRole('menuitem', { name: 'Notifications' }).click()
  await expect
    .element(screen.getByRole('menuitem', { name: 'Notifications' }))
    .toHaveAttribute('aria-current', 'page')
  await expect
    .element(screen.getByRole('menuitem', { name: 'General' }))
    .not.toHaveAttribute('aria-current')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('notifications')
})
