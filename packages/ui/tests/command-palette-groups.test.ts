import '../src/style.css'
import { h } from 'vue'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import type { CommandPaletteItem } from '../src/components/CommandPalette/CommandPalette.vue'

// Groups aren't adjacent in `items`; the palette gathers them, so keys must follow what you see.
const items: CommandPaletteItem[] = [
  { id: 'new-file', label: 'New File', group: 'Files' },
  { id: 'theme', label: 'Toggle Theme', group: 'View' },
  { id: 'open-file', label: 'Open File', group: 'Files' },
  { id: 'zoom', label: 'Zoom In', group: 'View' },
]
const activeLabel = () =>
  document.querySelector('[role="option"][data-active]')?.textContent?.trim()

test('arrow keys follow the order on screen when a group is spread through items', async () => {
  await render(CommandPalette, { props: { open: true, items } })
  await vi.waitFor(() => expect(page.getByRole('option').all()).toHaveLength(4))
  const shown = [...document.querySelectorAll('[role="option"]')].map((el) =>
    el.textContent?.trim(),
  )
  expect(shown).toEqual(['New File', 'Open File', 'Toggle Theme', 'Zoom In'])
  const seen = [activeLabel()]
  for (let i = 0; i < 3; i++) {
    await userEvent.keyboard('{ArrowDown}')
    seen.push(activeLabel())
  }
  expect(seen).toEqual(shown)
})

test('Enter picks the highlighted item, the one on screen', async () => {
  const selected: CommandPaletteItem[] = []
  await render(() =>
    h(CommandPalette as never, {
      open: true,
      items,
      onSelect: (item: CommandPaletteItem) => selected.push(item),
    }),
  )
  await vi.waitFor(() => expect(page.getByRole('option').all()).toHaveLength(4))
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  expect(selected.map((item) => item.label)).toEqual(['Open File'])
})

test('#group-label gets the name and the items still showing; #item gets its group', async () => {
  await render(() =>
    h(
      CommandPalette as never,
      { open: true, items },
      {
        'group-label': ({ group, items: shown }: { group: string; items: unknown[] }) =>
          `${group} · ${shown.length}`,
        item: ({ item, group }: { item: CommandPaletteItem; group?: string }) =>
          `${item.label} in ${group}`,
      },
    ),
  )
  await vi.waitFor(() => expect(page.getByRole('option').all()).toHaveLength(4))
  const headings = () =>
    [...document.querySelectorAll('.ui-command-palette-group-label')].map((el) =>
      el.textContent?.trim(),
    )
  expect(headings()).toEqual(['Files · 2', 'View · 2'])
  expect(page.getByRole('option').first().element().textContent).toBe('New File in Files')
  await userEvent.type(page.getByRole('combobox'), 'zoom')
  await vi.waitFor(() => expect(headings()).toEqual(['View · 1']))
})
