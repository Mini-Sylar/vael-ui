import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import MenuFixture from './fixtures/MenuFixture.vue'
import MenuCustomFixture from './fixtures/MenuCustomFixture.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

test('trigger click opens the menu and focuses the first item; select closes it', async () => {
  const screen = render(MenuFixture)

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await screen.getByRole('menuitem', { name: 'Banana' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('banana')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('ArrowDown/ArrowUp move focus, wrap at both ends, and skip disabled items', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Banana'))

  // Cherry is disabled — skipped straight to Date.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Date'))

  // Wraps forward past the end back to Apple.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  // Wraps backward past the start to the last enabled item.
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(focusedText()).toBe('Date'))
})

test('Home/End jump to the first and last enabled items', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(focusedText()).toBe('Date'))
  await userEvent.keyboard('{Home}')
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))
})

test('Enter activates the focused item and closes the menu', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Banana'))
  await userEvent.keyboard('{Enter}')

  await expect.element(screen.getByTestId('selected')).toHaveTextContent('banana')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('typeahead jumps to the item starting with the typed character', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('b')
  await vi.waitFor(() => expect(focusedText()).toBe('Banana'))
})

test('keepOpen items emit select and run handlers without closing the menu', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await screen.getByRole('menuitem', { name: 'Date' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('date')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('Escape closes the menu', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('outside click closes the menu', async () => {
  const screen = render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await userEvent.click(document.body)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('custom default-slot markup keeps behavior: click selects/closes, keep-open stays open', async () => {
  const screen = render(MenuCustomFixture)

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  // keep-open item runs its own @click but the menu stays open
  await screen.getByTestId('item-date').click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('date')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  // a plain item closes
  await screen.getByTestId('item-apple').click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('apple')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('header and footer slots render around the item list only when provided', async () => {
  const screen = render(MenuFixture, { props: { withHeader: true, withFooter: true } })
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await expect.element(screen.getByTestId('menu-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('menu-footer')).toBeInTheDocument()

  screen.unmount()

  const bare = render(MenuFixture)
  await bare.getByTestId('trigger').click()
  await expect.element(bare.getByRole('menu')).toBeInTheDocument()
  expect(document.querySelector('.ui-menu-header')).toBeNull()
  expect(document.querySelector('.ui-menu-footer')).toBeNull()
})

test('the item list still gets a real capped height (v-scroll-mask keeps working) now that max-height lives on the panel, not the body directly', async () => {
  const screen = render(MenuFixture, { props: { itemCount: 100 } })
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => {
    const body = document.querySelector('.ui-menu-body')
    expect(body?.className).toContain('scroll-fade')
  })
  const body = document.querySelector('.ui-menu-body') as HTMLElement
  expect(body.clientHeight).toBeLessThan(body.scrollHeight)
})

test('maxPanelHeight caps the panel even though the viewport has room for more', async () => {
  const screen = render(MenuFixture, { props: { itemCount: 100, maxPanelHeight: 160 } })
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  const panel = document.querySelector<HTMLElement>('.ui-menu-panel')!
  await vi.waitFor(() => expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(160))
  const body = document.querySelector<HTMLElement>('.ui-menu-body')!
  expect(body.clientHeight).toBeLessThan(body.scrollHeight)
})

test('a fully custom #default slot gets the live maxHeight budget, so it can bound its own scroll region', async () => {
  const screen = render(MenuCustomFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(screen.getByTestId('max-height').element().textContent).not.toBe('')
  })
  const value = Number(screen.getByTestId('max-height').element().textContent)
  expect(value).toBeGreaterThan(0)
})
