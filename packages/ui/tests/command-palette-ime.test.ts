import '../src/style.css'
import { h } from 'vue'
import { page } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import type { CommandPaletteItem } from '../src/components/CommandPalette/CommandPalette.vue'

const items: CommandPaletteItem[] = [{ id: 'new-file', label: 'New File' }]

test('Enter that commits an IME composition does not run the active command', async () => {
  const selected: Array<string | number> = []
  await render({
    render: () =>
      h(CommandPalette as any, {
        items,
        open: true,
        onSelect: (item: CommandPaletteItem) => selected.push(item.id),
      }),
  })
  const input = page.getByRole('combobox').element() as HTMLInputElement
  input.focus()
  const enter = { key: 'Enter', bubbles: true, cancelable: true }
  input.dispatchEvent(new KeyboardEvent('keydown', { ...enter, isComposing: true }))
  // Safari reports the committing Enter as keyCode 229 after compositionend.
  input.dispatchEvent(new KeyboardEvent('keydown', { ...enter, keyCode: 229 }))
  expect(selected).toEqual([])

  input.dispatchEvent(new KeyboardEvent('keydown', enter))
  expect(selected).toEqual(['new-file'])
})
