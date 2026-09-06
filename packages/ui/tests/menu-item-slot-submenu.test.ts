import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import MenuSubmenuItemSlotFixture from './fixtures/MenuSubmenuItemSlotFixture.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function rowByText(text: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === text,
    ) ?? null
  )
}

function focusedText(): string | undefined {
  return document.activeElement?.textContent?.trim()
}

// A custom #item slot must keep rendering its own markup inside nested submenus,
// not silently fall back to the default row past the first level. Under the Vapor
// compiler a naive `<slot name="item">` forwarded into the child <Menu> resolves
// against the child and calls itself forever; this is the regression guard for
// both the fallback-to-default bug and that recursion.
test('a custom #item slot keeps applying at every submenu depth', async () => {
  const screen = render(MenuSubmenuItemSlotFixture)
  await screen.getByTestId('trigger').click()

  // Level 0 — the root list.
  await vi.waitFor(() => expect(focusedText()).toBe('mark:Cut'))
  expect(rowByText('mark:Share')).not.toBeNull()

  // Level 1 — open "Share".
  await userEvent.keyboard('{ArrowDown}') // -> Share
  await vi.waitFor(() => expect(focusedText()).toBe('mark:Share'))
  await userEvent.keyboard('{ArrowRight}') // open its submenu
  await vi.waitFor(() => expect(focusedText()).toBe('mark:Copy Link'))
  expect(rowByText('mark:Social')).not.toBeNull()

  // Level 2 — open "Social". This is the depth the old build reverted to the
  // default row (or, in Vapor, blew the stack).
  await userEvent.keyboard('{ArrowDown}') // -> Social
  await vi.waitFor(() => expect(focusedText()).toBe('mark:Social'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(rowByText('mark:Twitter')).not.toBeNull())
  expect(rowByText('mark:Mastodon')).not.toBeNull()
})

test('selecting a deep custom row still bubbles its value and closes the chain', async () => {
  const screen = render(MenuSubmenuItemSlotFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('mark:Cut'))

  await userEvent.keyboard('{ArrowDown}') // -> Share
  await userEvent.keyboard('{ArrowRight}') // open Share
  await vi.waitFor(() => expect(focusedText()).toBe('mark:Copy Link'))
  await userEvent.keyboard('{ArrowDown}') // -> Social
  await userEvent.keyboard('{ArrowRight}') // open Social
  await vi.waitFor(() => expect(rowByText('mark:Twitter')).not.toBeNull())

  rowByText('mark:Twitter')!.click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('twitter')
  expect(rowByText('mark:Cut')).toBeNull()
})
