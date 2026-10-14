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
  await render(CommandPalette, { props: { open: true, items } })
  await expect.element(page.getByRole('dialog')).toBeVisible()
  await expect.element(page.getByRole('combobox')).toBeVisible()
  expect(page.getByRole('option').all()).toHaveLength(3)
})

test('typing filters the list by label and keywords', async () => {
  await render(CommandPalette, { props: { open: true, items } })
  await userEvent.type(page.getByRole('combobox'), 'folder')
  const options = page.getByRole('option')
  expect(options.all()).toHaveLength(1)
  await expect.element(options.first()).toHaveTextContent('New Folder')
})

test('no matches shows the empty message', async () => {
  await render(CommandPalette, { props: { open: true, items } })
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
  await render(Wrapper)
  const input = page.getByRole('combobox')
  await userEvent.click(input)
  await userEvent.keyboard('{ArrowDown}{Enter}')
  expect(selected.map((i) => i.id)).toEqual(['new-folder'])
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('a disabled item is never the active/selected one', async () => {
  await render(CommandPalette, { props: { open: true, items } })
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
  await render(Wrapper)
  expect(open.value).toBe(false)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
  await vi.waitFor(() => expect(open.value).toBe(true))
})

// Real transitions, not Vue Test Utils' TransitionGroup stub.
const realTransitions = { global: { stubs: { 'transition-group': false } } }

test('rows change at once while typing, and the list eases to its new height', async () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, label: `Item ${i}` }))
  await render(CommandPalette, { props: { open: true, items: many }, ...realTransitions })
  const list = document.querySelector<HTMLElement>('.ui-command-palette-list')!
  const heights: number[] = []
  const start = performance.now()
  const sample = () => {
    heights.push(Math.round(list.getBoundingClientRect().height))
    if (performance.now() - start < 400) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  await userEvent.type(page.getByRole('combobox'), 'Item 1')

  expect(document.querySelector('.ui-command-palette-row-enter-active')).toBeNull()
  for (const leaving of document.querySelectorAll('.ui-command-palette-row-leave-active')) {
    expect(getComputedStyle(leaving).display).toBe('none')
  }
  await new Promise((resolve) => setTimeout(resolve, 450))
  expect(new Set(heights).size).toBeGreaterThan(2)
  expect(list.style.blockSize).toBe('')
  expect(list.hasAttribute('data-resizing')).toBe(false)
})

test('motionCss false hands appearing and disappearing rows to @item-enter/@item-leave', async () => {
  const entered: Element[] = []
  const pendingLeaves: (() => void)[] = []
  await render(CommandPalette, {
    props: {
      open: true,
      items,
      motionCss: false,
      'onItem-enter': (el: Element, done: () => void) => {
        entered.push(el)
        done()
      },
      'onItem-leave': (_el: Element, done: () => void) => pendingLeaves.push(done),
    },
    ...realTransitions,
  })
  const input = page.getByRole('combobox')
  await userEvent.type(input, 'folder')
  await vi.waitFor(() => expect(pendingLeaves.length).toBe(2))
  expect(page.getByText('New File').query()).not.toBeNull()
  pendingLeaves.forEach((done) => done())
  await vi.waitFor(() => expect(page.getByText('New File').query()).toBeNull())

  await userEvent.clear(input)
  await vi.waitFor(() => expect(entered.length).toBe(2))
  expect(document.querySelector('.ui-command-palette-row-enter-active')).toBeNull()
})
