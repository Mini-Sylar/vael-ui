import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import SelectFixture from './fixtures/SelectFixture.vue'
import MenuListFixture from './fixtures/MenuListFixture.vue'

// `.ui-indicator` transitions `translate`, so every list that uses it must move it that way.
const movesByTranslate = (el: HTMLElement) => {
  expect(el.style.translate).toMatch(/px/)
  expect(el.style.insetBlockStart).toBe('')
}

test('the Select highlight moves with translate', async () => {
  const screen = await render(SelectFixture)
  await screen.getByRole('combobox').click()
  await userEvent.keyboard('{ArrowDown}')
  const indicator = document.querySelector<HTMLElement>('.ui-select-indicator')!
  await vi.waitFor(() => movesByTranslate(indicator))
})

test('the CommandPalette highlight moves with translate', async () => {
  await render(CommandPalette, {
    props: {
      open: true,
      items: [
        { id: 'a', label: 'New File' },
        { id: 'b', label: 'New Folder' },
      ],
    },
  })
  await expect.element(page.getByRole('dialog')).toBeVisible()
  await userEvent.keyboard('{ArrowDown}')
  const indicator = document.querySelector<HTMLElement>('.ui-command-palette-indicator')!
  await vi.waitFor(() => movesByTranslate(indicator))
})

test('the MenuList current-page indicator moves with translate', async () => {
  const screen = await render(MenuListFixture)
  await screen.getByRole('button', { name: 'Reports' }).click()
  const indicator = document.querySelector<HTMLElement>('.ui-menu-list-indicator')!
  await vi.waitFor(() => movesByTranslate(indicator))
})
