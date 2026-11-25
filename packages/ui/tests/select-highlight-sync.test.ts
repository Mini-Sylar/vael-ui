// The highlighted option is marked on its element, not through a re-render: the mark has to follow
// the highlight wherever it goes, including onto a row that scrolls into a windowed list later.
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

const items = Array.from({ length: 600 }, (_, i) => ({ value: i, label: `Option ${i}` }))
const marked = () => [...document.querySelectorAll('[role="option"][data-active]')]

for (const [name, Component] of [
  ['Select', Select],
  ['Combobox', Combobox],
] as const) {
  test(`${name}: exactly one option is marked, and it is the one aria-activedescendant names`, async () => {
    const screen = await render(() =>
      h(Component as never, { items, motion: false, 'aria-label': 'x' }),
    )
    const control = screen.getByRole('combobox').element() as HTMLElement
    await screen.getByRole('combobox').click()
    await vi.waitFor(() => expect(marked()).toHaveLength(1))
    for (const key of ['{ArrowDown}', '{ArrowDown}', '{ArrowUp}']) {
      await userEvent.keyboard(key)
      await vi.waitFor(() => {
        expect(marked()).toHaveLength(1)
        expect(marked()[0]!.id).toBe(control.getAttribute('aria-activedescendant'))
      })
    }
  })

  test(`${name}: a jump to a row that is not drawn yet marks it once it is`, async () => {
    const screen = await render(() =>
      h(Component as never, { items, motion: false, 'aria-label': 'x' }),
    )
    const control = screen.getByRole('combobox').element() as HTMLElement
    await screen.getByRole('combobox').click()
    await vi.waitFor(() => expect(marked()).toHaveLength(1))
    const first = marked()[0]!.textContent
    await userEvent.keyboard('{End}')
    await vi.waitFor(() => {
      expect(marked()).toHaveLength(1)
      expect(marked()[0]!.textContent).toContain('Option 599')
      expect(marked()[0]!.textContent).not.toBe(first)
      expect(marked()[0]!.id).toBe(control.getAttribute('aria-activedescendant'))
    })
  })
}

test('Select: closing clears the active descendant and the mark', async () => {
  const screen = await render(() => h(Select as never, { items, motion: false, 'aria-label': 'x' }))
  const control = screen.getByRole('combobox').element() as HTMLElement
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(control.getAttribute('aria-activedescendant')).toBeTruthy())
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(control.hasAttribute('aria-activedescendant')).toBe(false))
})

test('Select: the marked row stays marked after it scrolls out of the window and back', async () => {
  const screen = await render(() => h(Select as never, { items, motion: false, 'aria-label': 'x' }))
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(marked()).toHaveLength(1))
  const list = document.querySelector<HTMLElement>('[role="listbox"]')!
  list.scrollTop = list.scrollHeight
  await vi.waitFor(() => expect(marked()).toHaveLength(0))
  list.scrollTop = 0
  await vi.waitFor(() => expect(marked()).toHaveLength(1))
})
