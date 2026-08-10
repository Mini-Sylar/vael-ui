import '../src/style.css'
import { h, ref } from 'vue'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import type { CommandPaletteItem } from '../src/components/CommandPalette/CommandPalette.vue'

const items: CommandPaletteItem[] = [
  { id: 'new-file', label: 'New File', keywords: ['create'] },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'settings', label: 'Open Settings', disabled: true },
]

test('open renders a dialog with the search input and every item as an option', async () => {
  render(CommandPalette, { props: { open: true, items } })
  await expect.element(page.getByRole('dialog')).toBeVisible()
  await expect.element(page.getByRole('combobox')).toBeVisible()
  expect(page.getByRole('option').all()).toHaveLength(3)
})

test('typing filters the list by label and keywords', async () => {
  render(CommandPalette, { props: { open: true, items } })
  await userEvent.type(page.getByRole('combobox'), 'folder')
  const options = page.getByRole('option')
  expect(options.all()).toHaveLength(1)
  await expect.element(options.first()).toHaveTextContent('New Folder')
})

test('no matches shows the empty message', async () => {
  render(CommandPalette, { props: { open: true, items } })
  await userEvent.type(page.getByRole('combobox'), 'zzz-nothing-matches')
  await expect.element(page.getByText('No results')).toBeVisible()
})

test('ArrowDown then Enter selects the active item and closes (closeOnSelect default)', async () => {
  const open = ref(true)
  const selected: CommandPaletteItem[] = []
  const Wrapper = {
    render: () =>
      h(CommandPalette as any, {
        items,
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
        onSelect: (item: CommandPaletteItem) => selected.push(item),
      }),
  }
  render(Wrapper)
  const input = page.getByRole('combobox')
  await userEvent.click(input)
  await userEvent.keyboard('{ArrowDown}{Enter}')
  expect(selected.map((i) => i.id)).toEqual(['new-folder'])
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('a disabled item is never the active/selected one', async () => {
  render(CommandPalette, { props: { open: true, items } })
  const input = page.getByRole('combobox')
  await userEvent.click(input)
  // 3 ArrowDown presses would land on "settings" if it were selectable; it's
  // disabled, so activeIndex should never advance onto it.
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
  const settingsOption = document.querySelector('[data-disabled]')!
  expect(settingsOption.hasAttribute('data-active')).toBe(false)
})

test('shortcut prop toggles open on the configured global hotkey', async () => {
  const open = ref(false)
  const Wrapper = {
    render: () =>
      h(CommandPalette as any, {
        items,
        shortcut: 'mod+k',
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
      }),
  }
  render(Wrapper)
  expect(open.value).toBe(false)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
  await vi.waitFor(() => expect(open.value).toBe(true))
})
