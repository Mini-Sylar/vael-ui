import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import MenuFixture from './fixtures/MenuFixture.vue'
import MenuCustomFixture from './fixtures/MenuCustomFixture.vue'
import MenuHiddenTriggerFixture from './fixtures/MenuHiddenTriggerFixture.vue'
import Menu from '../src/components/Menu/Menu.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

test('trigger click opens the menu and focuses the first item; select closes it', async () => {
  const screen = await render(MenuFixture)

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await screen.getByRole('menuitem', { name: 'Banana' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('banana')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

// Regression test: `.ui-menu-trigger` is `display: contents` (so an absolutely-positioned
// trigger sizes against its real parent, not this wrapper) — but that also gives the wrapper a
// zero rect at the viewport ORIGIN specifically (not just zero-sized in place), and Menu used the
// wrapper itself as the floating-ui reference. Anchoring off that collapsed the whole panel to
// the viewport's top-left corner instead of the trigger. A spacer pushes the trigger well away
// from (0,0) so a regression can't hide behind the trigger coincidentally rendering near the
// origin in an isolated test page.
test('the panel anchors to the real trigger element, not a (0,0) fallback from its display:contents wrapper', async () => {
  const spacer = document.createElement('div')
  spacer.style.blockSize = '400px'
  document.body.prepend(spacer)
  try {
    const screen = await render(MenuFixture)
    const trigger = screen.getByTestId('trigger').element() as HTMLElement
    const triggerRect = trigger.getBoundingClientRect()
    expect(triggerRect.top).toBeGreaterThan(300) // sanity: the spacer actually pushed it down

    await screen.getByTestId('trigger').click()
    const panel = document.querySelector<HTMLElement>('.ui-menu-panel')!
    await vi.waitFor(() =>
      expect(getComputedStyle(panel.parentElement!).visibility).toBe('visible'),
    )
    const panelRect = panel.parentElement!.getBoundingClientRect()

    expect(panelRect.top).toBeGreaterThan(300)
    expect(Math.abs(panelRect.top - triggerRect.bottom)).toBeLessThan(50)
  } finally {
    spacer.remove()
  }
})

// Regression test: a trigger that is hidden when the Menu mounts (inside a closed BottomSheet) has
// a zero rect, and the resolver used to descend past it into the Button's spinning loader. The
// panel then chased that loader's rotating bounding box, repositioning on every frame.
test('a trigger hidden at mount anchors to the trigger itself and the panel settles', async () => {
  const screen = await render(MenuHiddenTriggerFixture)
  await screen.getByTestId('show').click()
  const trigger = screen.getByTestId('trigger').element() as HTMLElement
  await screen.getByTestId('trigger').click()

  const positioner = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('.ui-menu-positioner')
    expect(el && getComputedStyle(el).visibility).toBe('visible')
    return el!
  })
  // The bug repositioned on every frame, so a settled panel is one that stays quiet for a window.
  await vi.waitFor(
    async () => {
      let writes = 0
      const observer = new MutationObserver(() => writes++)
      observer.observe(positioner, { attributes: true, attributeFilter: ['style'] })
      await new Promise((resolve) => setTimeout(resolve, 100))
      observer.disconnect()
      expect(writes).toBe(0)
    },
    { timeout: 2000 },
  )
  const triggerRect = trigger.getBoundingClientRect()
  expect(positioner.getBoundingClientRect().top).toBeGreaterThanOrEqual(triggerRect.bottom)
})

test('ArrowDown/ArrowUp move focus, wrap at both ends, and skip disabled items', async () => {
  const screen = await render(MenuFixture)
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

test('ArrowDown on the focused trigger opens the menu on the first item, ArrowUp on the last (ARIA menu button)', async () => {
  const screen = await render(MenuFixture)
  const trigger = screen.getByTestId('trigger').element() as HTMLElement
  trigger.focus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger))

  await userEvent.keyboard('{ArrowUp}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  // Date is the last enabled row (the separator is skipped).
  await vi.waitFor(() => expect(focusedText()).toBe('Date'))
})

test('Home/End jump to the first and last enabled items', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(focusedText()).toBe('Date'))
  await userEvent.keyboard('{Home}')
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))
})

test('Enter activates the focused item and closes the menu', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Banana'))
  await userEvent.keyboard('{Enter}')

  await expect.element(screen.getByTestId('selected')).toHaveTextContent('banana')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('typeahead jumps to the item starting with the typed character', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await userEvent.keyboard('b')
  await vi.waitFor(() => expect(focusedText()).toBe('Banana'))
})

test('keepOpen items emit select and run handlers without closing the menu', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await screen.getByRole('menuitem', { name: 'Date' }).click()
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('date')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('Escape closes the menu', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('outside click closes the menu', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await userEvent.click(document.body)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('custom default-slot markup keeps behavior: click selects/closes, keep-open stays open', async () => {
  const screen = await render(MenuCustomFixture)

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
  const screen = await render(MenuFixture, { props: { withHeader: true, withFooter: true } })
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await expect.element(screen.getByTestId('menu-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('menu-footer')).toBeInTheDocument()

  await screen.unmount()

  const bare = await render(MenuFixture)
  await bare.getByTestId('trigger').click()
  await expect.element(bare.getByRole('menu')).toBeInTheDocument()
  expect(document.querySelector('.ui-menu-header')).toBeNull()
  expect(document.querySelector('.ui-menu-footer')).toBeNull()
})

test('a fully custom #default slot gets the live maxHeight budget, so it can bound its own scroll region', async () => {
  const screen = await render(MenuCustomFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(screen.getByTestId('max-height').element().textContent).not.toBe('')
  })
  const value = Number(screen.getByTestId('max-height').element().textContent)
  expect(value).toBeGreaterThan(0)
})

test('Escape returns focus to the trigger', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(screen.getByTestId('trigger').element()),
  )
})

test('Tab from an open menu closes it without dropping focus to the page', async () => {
  const screen = await render(MenuFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))
  await userEvent.keyboard('{Tab}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  expect(document.activeElement).not.toBe(document.body)
})

const toggleTemplate = `
  <output data-testid="selected">{{ selected }}</output>
  <Menu v-model:open="open" :items="items" @select="onSelect">
    <template #trigger><button data-testid="trigger">open menu</button></template>
  </Menu>`

function toggleMenu(count = 0) {
  return {
    components: { Menu },
    data: () => ({
      open: false,
      selected: '',
      items: count
        ? Array.from({ length: count }, (_, i) => ({
            label: `Item ${i}`,
            value: `item-${i}`,
            checked: i % 2 === 0,
            keepOpen: true,
          }))
        : [
            { label: 'Bold', value: 'bold', checked: true, keepOpen: true },
            { label: 'Italic', value: 'italic', checked: false, keepOpen: true },
            { label: 'Copy', value: 'copy' },
          ],
    }),
    methods: {
      onSelect(
        this: { items: { value: string; checked?: boolean }[]; selected: string },
        item: {
          value: string
        },
      ) {
        this.selected = item.value
        const entry = this.items.find((e) => e.value === item.value)!
        if (entry.checked !== undefined) entry.checked = !entry.checked
      },
    },
    template: toggleTemplate,
  }
}

test('`checked` renders a menuitemcheckbox with aria-checked and a check mark; rows without it are unchanged', async () => {
  const screen = await render(toggleMenu())
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Bold'))

  const bold = screen.getByRole('menuitemcheckbox', { name: 'Bold' }).element()
  const italic = screen.getByRole('menuitemcheckbox', { name: 'Italic' }).element()
  const copy = screen.getByRole('menuitem', { name: 'Copy' }).element()
  expect(bold.getAttribute('aria-checked')).toBe('true')
  expect(bold.querySelector('.ui-menu-item-check')).not.toBeNull()
  expect(italic.getAttribute('aria-checked')).toBe('false')
  expect(italic.querySelector('.ui-menu-item-check')).toBeNull()
  expect(copy.hasAttribute('aria-checked')).toBe(false)
  expect(copy.querySelector('.ui-menu-item-check')).toBeNull()

  // Arrow keys reach checkbox rows, and Enter toggles one without closing (keepOpen).
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('Italic'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('italic')
  await vi.waitFor(() => expect(italic.getAttribute('aria-checked')).toBe('true'))
  expect(focusedText()).toBe('Italic')

  // A click toggles too.
  await screen.getByRole('menuitemcheckbox', { name: 'Bold' }).click()
  await vi.waitFor(() => expect(bold.getAttribute('aria-checked')).toBe('false'))
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
})

test('a virtualized menu renders checked rows and keeps End/Space working on them', async () => {
  const screen = await render(toggleMenu(150))
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Item 0'))
  expect(document.querySelector('.ui-menu-body[data-virtual]')).not.toBeNull()

  const first = screen.getByRole('menuitemcheckbox', { name: 'Item 0' }).element()
  expect(first.getAttribute('aria-checked')).toBe('true')
  expect(first.querySelector('.ui-menu-item-check')).not.toBeNull()

  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(focusedText()).toBe('Item 149'))
  const last = screen.getByRole('menuitemcheckbox', { name: 'Item 149' }).element()
  expect(last.getAttribute('aria-checked')).toBe('false')
  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('item-149')
  await vi.waitFor(() => expect(last.getAttribute('aria-checked')).toBe('true'))
})
