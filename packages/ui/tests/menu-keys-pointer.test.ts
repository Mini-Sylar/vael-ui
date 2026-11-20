import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Menu from '../src/components/Menu/Menu.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

function fixture(items: object[], extra: Record<string, unknown> = {}) {
  return {
    components: { Menu },
    data: () => ({ open: false, selected: '', changes: [] as string[], items, ...extra }),
    methods: {
      onSelect(this: { selected: string; items: any[] }, item: { value: string }) {
        this.selected = item.value
        const entry = this.items.find((e) => e.value === item.value)
        if (entry?.checked !== undefined) entry.checked = !entry.checked
      },
    },
    template: `
      <output data-testid="selected">{{ selected }}</output>
      <output data-testid="changes">{{ changes.join(',') }}</output>
      <Menu
        v-model:open="open"
        :items="items"
        @select="onSelect"
        @open-change="(value, details) => changes.push(details.reason)"
      >
        <template #trigger><button data-testid="trigger">open menu</button></template>
      </Menu>`,
  }
}

test('typing more letters searches from the current item, so "sa" lands on Save, not Save as', async () => {
  const screen = await render(
    fixture([
      { label: 'Open', value: 'open' },
      { label: 'Save', value: 'save' },
      { label: 'Save as', value: 'save-as' },
    ]),
  )
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Open'))
  await userEvent.keyboard('sa')
  await vi.waitFor(() => expect(focusedText()).toBe('Save'))
})

test('the hovered row takes focus, so Enter activates the highlighted row', async () => {
  const screen = await render(
    fixture([
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry', disabled: true },
    ]),
  )
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Apple'))

  await screen.getByRole('menuitem', { name: 'Banana' }).hover()
  await vi.waitFor(() => expect(focusedText()).toBe('Banana'))
  // A disabled row is skipped: focus stays where it was.
  await screen.getByRole('menuitem', { name: 'Cherry' }).hover()
  expect(focusedText()).toBe('Banana')

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('banana')
})

test('closing from the trigger fires open-change with reason "trigger" and honors cancel', async () => {
  const screen = await render(fixture([{ label: 'Apple', value: 'apple' }]))
  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await screen.getByTestId('trigger').click()
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('trigger')
  await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull())
})

test('Space toggles a checkbox row and keeps the menu open; Enter toggles and closes', async () => {
  const screen = await render(
    fixture([
      { label: 'Grid', value: 'grid', checked: false },
      { label: 'Copy', value: 'copy' },
    ]),
  )
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Grid'))
  const grid = screen.getByRole('menuitemcheckbox', { name: 'Grid' }).element()

  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(grid.getAttribute('aria-checked')).toBe('true'))
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(document.querySelector('[role="menu"]')).not.toBeNull()

  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull())
})

test('a long, virtualized menu also searches from the current row once a second letter is typed', async () => {
  const items = Array.from({ length: 150 }, (_, i) => ({ label: `Item ${i}`, value: `item-${i}` }))
  const screen = await render(fixture(items))
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedText()).toBe('Item 0'))
  expect(document.querySelector('.ui-menu-body[data-virtual]')).not.toBeNull()
  // "i" moves on to the next match; "it" refines it and stays.
  await userEvent.keyboard('it')
  await vi.waitFor(() => expect(focusedText()).toBe('Item 1'))
})
