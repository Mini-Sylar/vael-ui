import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import MenuSubmenuFixture from './fixtures/MenuSubmenuFixture.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

function menuItemByText(text: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === text,
    ) ?? null
  )
}

test('ArrowRight opens a submenu and focuses its first item; ArrowLeft returns to the parent row', async () => {
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Share'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Copy Link'))

  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Share'))
  // Collapsing removes the submenu, not just moves focus off it.
  expect(menuItemByText('Copy Link')).toBeNull()
})

test('selecting a leaf item inside a submenu closes the whole chain and bubbles the item', async () => {
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Copy Link'))

  await screen.getByRole('menuitem', { name: 'Copy Link' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('copy-link')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(menuItemByText('Cut')).toBeNull()
})

test('hover-intent opens a submenu after a delay and closes it after moving away', async () => {
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await screen.getByRole('menuitem', { name: 'Share' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Copy Link')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Cut' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Copy Link')).toBeNull(), { timeout: 1000 })
})

test('hovering into the submenu itself keeps it open, not just hovering the trigger row', async () => {
  // Regression: the trigger row and its submenu's panel are not DOM
  // siblings (the panel is teleported into positionerEl), so moving the
  // pointer from one to the other always fires a real mouseleave on the row
  // first. A close scheduled from that leave must be cancelled by entering
  // the panel, or the submenu closes out from under the pointer mid-transit.
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await screen.getByRole('menuitem', { name: 'Share' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Copy Link')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Copy Link' }).hover()
  // Longer than HOVER_CLOSE_DELAY (200ms) — if the row's own leave-timer
  // weren't cancelled, this is exactly when it would have fired.
  await new Promise((resolve) => setTimeout(resolve, 350))
  expect(menuItemByText('Copy Link')).not.toBeNull()
})

test('hovering a 3rd-level submenu keeps the whole chain open, including the grandparent', async () => {
  // Regression: Social's submenu is positioned further right than Share's
  // own panel extends, so moving from "Social" into "Twitter" necessarily
  // exits SHARE's panel bounding box along the way — firing mouseleave on
  // Share's panel, which only TOP-level's own hover tracking sees. Without
  // bubbling, top-level's own close timer for the whole Share branch fires
  // ~200ms later and tears out Social's submenu with it, even though the
  // pointer never left the cascade — it's just hovering deeper inside it.
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await screen.getByRole('menuitem', { name: 'Share' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Copy Link')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Social' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Twitter')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Twitter' }).hover()
  // Longer than HOVER_CLOSE_DELAY (200ms), twice over — enough for both
  // Share's and Social's own close timers to have fired if unguarded.
  await new Promise((resolve) => setTimeout(resolve, 500))
  expect(menuItemByText('Twitter')).not.toBeNull()
  expect(menuItemByText('Copy Link')).not.toBeNull()
})

test('hovering a 4th-level submenu keeps the entire chain open, all the way to the top', async () => {
  // Twitter is now itself a submenu trigger (Post/DM), one level past the
  // previous test's deepest case — proving the bubbling is genuinely
  // recursive (each level forwards what it hears from below) rather than a
  // fix specific to exactly 3 levels.
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await screen.getByRole('menuitem', { name: 'Share' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Copy Link')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Social' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Twitter')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Twitter' }).hover()
  await vi.waitFor(() => expect(menuItemByText('Post')).not.toBeNull(), { timeout: 1000 })

  await screen.getByRole('menuitem', { name: 'Post' }).hover()
  // Long enough for every level's own 200ms close timer to have fired at
  // least twice over, if any single hop in the chain weren't guarded.
  await new Promise((resolve) => setTimeout(resolve, 600))
  expect(menuItemByText('Post')).not.toBeNull()
  expect(menuItemByText('Twitter')).not.toBeNull()
  expect(menuItemByText('Copy Link')).not.toBeNull()

  // And selecting the deepest leaf still cascades every level closed at once.
  await screen.getByRole('menuitem', { name: 'Post' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('twitter-post')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(menuItemByText('Cut')).toBeNull()
})

test('Escape closes the submenu first, then the parent menu on a second press', async () => {
  const screen = render(MenuSubmenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Cut'))

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('Copy Link'))

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(menuItemByText('Copy Link')).toBeNull())
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})
