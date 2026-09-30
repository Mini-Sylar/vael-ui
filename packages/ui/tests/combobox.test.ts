import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ComboboxFixture from './fixtures/ComboboxFixture.vue'
import ComboboxFormFixture from './fixtures/ComboboxFormFixture.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

test('a plain class passed to Combobox reaches the rendered root', async () => {
  const screen = await render(Combobox, {
    props: { items: [{ label: 'A', value: 'a' }] },
    attrs: { class: 'my-search-box' },
  })
  const input = screen.getByRole('combobox')
  expect(input.element().closest('.my-search-box')).not.toBeNull()
})

test('typing filters the list, diacritic- and case-insensitively', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'cran')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
      (el) => el.textContent,
    )
    expect(labels).toEqual(['Cranberry'])
  })

  await userEvent.clear(input)
  await userEvent.type(input, 'CRAN')
  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll('.ui-select-option-label')].map(
      (el) => el.textContent,
    )
    expect(labels).toEqual(['Cranberry'])
  })
})

test('filter=false never filters locally and update:query fires on every keystroke', async () => {
  const screen = await render(ComboboxFixture, { props: { filter: false } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'xyz')

  await expect.element(screen.getByTestId('query')).toHaveTextContent('xyz')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.ui-select-option-label').length).toBe(5)
  })
})

test('selecting an option commits the model and syncs query to its label', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click() // openOnFocus (now the default) opens with Apple already active
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Apple')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('maxPanelHeight caps the panel even though the viewport has room for more', async () => {
  const screen = await render(ComboboxFixture, { props: { itemCount: 100, maxPanelHeight: 160 } })
  const input = screen.getByRole('combobox')
  await input.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const panel = document.querySelector<HTMLElement>('.ui-select-panel')!
  await vi.waitFor(() => expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(160))
  const body = document.querySelector<HTMLElement>('.ui-select-body')!
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
})

test('without maxPanelHeight the panel defaults to a 320px cap', async () => {
  await page.viewport(800, 900)
  const screen = await render(ComboboxFixture, { props: { itemCount: 100 } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  const panel = document.querySelector<HTMLElement>('.ui-select-panel')!
  await vi.waitFor(() => expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(320))
  expect(panel.getBoundingClientRect().height).toBeGreaterThan(300)
})

function optionTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).map(
    (el) => el.textContent?.trim() ?? '',
  )
}
function activeOptionText(): string | undefined {
  return document.querySelector<HTMLElement>('[role="option"][data-active]')?.textContent?.trim()
}

test('allowCustom: with nothing matching, the Create row is the active option and Enter commits it', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Elderberry')
  await vi.waitFor(() => expect(optionTexts()).toEqual(['Create "Elderberry"']))
  expect(activeOptionText()).toBe('Create "Elderberry"')

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Elderberry"')
  await expect.element(screen.getByTestId('create-log')).toHaveTextContent('Elderberry')
  await expect.element(screen.getByTestId('create-reasons')).toHaveTextContent('option')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Elderberry')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('allowCustom: text that partially matches an item still gets a Create row, reachable by keyboard', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await vi.waitFor(() => expect(optionTexts()).toEqual(['Cranberry', 'Create "ran"']))
  expect(activeOptionText()).toBe('Cranberry')

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"ran"')
})

test('allowCustom: Enter on a partial match still picks the highlighted item, not the typed text', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Cranberry'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"cranberry"')
  await expect.element(screen.getByTestId('create-log')).toHaveTextContent('')
})

test('allowCustom: clicking the Create row commits it', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Kiwi')
  await screen.getByRole('option', { name: 'Create "Kiwi"' }).click()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Kiwi"')
})

test('allowCustom: no Create row when the text already is an item label (case-insensitive); that item is highlighted', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'BANANA')
  await vi.waitFor(() => expect(optionTexts()).toEqual(['Banana']))
  expect(activeOptionText()).toBe('Banana')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"banana"')
  await expect.element(screen.getByTestId('create-log')).toHaveTextContent('')
})

test('a disabled first match does not swallow Enter: the first enabled row is active', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Che')
  await vi.waitFor(() => expect(optionTexts()).toEqual(['Cherry', 'Create "Che"']))
  expect(activeOptionText()).toBe('Create "Che"')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Che"')
})

test('createOption=false: no Create row, Enter with nothing matching still commits (reason "enter")', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, createOption: false },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Elderberry')
  await vi.waitFor(() => expect(optionTexts()).toEqual([]))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Elderberry"')
  await expect.element(screen.getByTestId('create-reasons')).toHaveTextContent('enter')
})

test('#create slot replaces the Create row content, the row still commits', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, withCreateSlot: true },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Kiwi')
  await expect.element(screen.getByTestId('custom-create')).toHaveTextContent('add Kiwi')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Kiwi"')
})

test('create is cancelable: details.cancel() leaves the model untouched', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, minCreateLength: 5 },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'abc')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Create "abc"'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('create-reasons')).toHaveTextContent('option')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('abc')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('allowCustom: leaving the field does not commit by default, the text reverts', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Elderberry')
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')
  await expect.element(screen.getByTestId('create-log')).toHaveTextContent('')
})

test('commitOnBlur: leaving the field commits the raw text and keeps it visible', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, commitOnBlur: true },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"ran"')
  await expect.element(screen.getByTestId('create-reasons')).toHaveTextContent('blur')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('ran')
})

test('Tab by default only moves focus: the highlighted row is not picked', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Cranberry'))
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')
})

test('tabBehavior="select": Tab picks the highlighted row after typing', async () => {
  const screen = await render(ComboboxFixture, { props: { tabBehavior: 'select' } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Cranberry'))
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"cranberry"')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Cranberry')
})

test('tabBehavior="select": Tab picks the row reached with the arrow keys', async () => {
  const screen = await render(ComboboxFixture, { props: { tabBehavior: 'select' } })
  const input = screen.getByRole('combobox')
  await input.click()
  await vi.waitFor(() => expect(activeOptionText()).toBe('Apple'))
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"banana"')
})

test('tabBehavior="select": just tabbing through the field picks nothing', async () => {
  const screen = await render(ComboboxFixture, { props: { tabBehavior: 'select' } })
  const input = screen.getByRole('combobox')
  await input.click()
  await vi.waitFor(() => expect(activeOptionText()).toBe('Apple'))
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
})

test('tabBehavior="select" on the Create row commits it with reason "tab"', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, tabBehavior: 'select' },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Cranberry'))
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"ran"')
  await expect.element(screen.getByTestId('create-reasons')).toHaveTextContent('tab')
})

test('tabBehavior="create": Tab commits the typed text even when it partially matches', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, tabBehavior: 'create' },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ran')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Cranberry'))
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"ran"')
  await expect.element(screen.getByTestId('create-reasons')).toHaveTextContent('tab')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('ran')
})

test('tabBehavior="create": text that exactly names an item picks that item instead of duplicating it', async () => {
  const screen = await render(ComboboxFixture, {
    props: { allowCustom: true, tabBehavior: 'create' },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'banana')
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"banana"')
  await expect.element(screen.getByTestId('create-log')).toHaveTextContent('')
})

test('multiple + tabBehavior="select": Tab adds the highlighted row but never removes an already-selected one', async () => {
  const screen = await render(ComboboxFixture, {
    props: { multiple: true, tabBehavior: 'select' },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ban')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Banana'))
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["banana"]')

  await input.click()
  await userEvent.type(input, 'ban')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Banana✓'))
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["banana"]')
})

for (const multiple of [false, true]) {
  test(`Tab away closes the panel (multiple=${multiple})`, async () => {
    const screen = await render(ComboboxFixture, { props: { multiple } })
    const input = screen.getByRole('combobox')
    await input.click()
    await userEvent.type(input, 'ban')
    await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
    await userEvent.tab()
    await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  })
}

test('a committed custom value stays visible after the field loses focus again', async () => {
  const screen = await render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Kiwi')
  await userEvent.keyboard('{Enter}')
  await userEvent.tab()
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Kiwi"')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Kiwi')
})

test('Escape discards uncommitted typing and restores the selected label', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{Enter}') // Apple
  await input.click()
  await userEvent.type(input, 'xyz')
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Apple')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
})

test('without allowCustom, blur with unmatched text reverts the query to the selected label', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click() // openOnFocus (now the default) opens with Apple already active
  await userEvent.keyboard('{Enter}') // commits Apple
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Apple')

  await userEvent.type(input, 'garbage')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Applegarbage')

  await userEvent.tab() // blur
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Apple')
})

test('loading renders a loader row and aria-busy on the listbox', async () => {
  const screen = await render(ComboboxFixture, { props: { loading: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!
  expect(listbox.getAttribute('aria-busy')).toBe('true')
})

test('aria-activedescendant tracks arrow navigation while focus stays in the input', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const before = input.element().getAttribute('aria-activedescendant')
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => {
    expect(input.element().getAttribute('aria-activedescendant')).not.toBe(before)
  })
  expect(document.activeElement).toBe(input.element())
  expect(document.activeElement?.getAttribute('role')).toBe('combobox')
})

test('outside detection: a pointerdown inside the panel does not close it (focus-out containment)', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const option = document.querySelector<HTMLElement>('[role="option"]')!
  // A plain, non-focusable option row: clicking it must not blur the input
  // or register as an "outside" pointerdown (usePopover's containment
  // check treats the whole positioner subtree as "inside").
  option.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('openOnFocus defaults to true when filter=false, opening before any typing', async () => {
  const screen = await render(ComboboxFixture, { props: { filter: false } })
  const input = screen.getByRole('combobox')
  ;(input.element() as HTMLElement).focus()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
})

test('openOnFocus defaults to true in local-filter mode too — focusing an empty field shows every option with nothing typed', async () => {
  const screen = await render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  ;(input.element() as HTMLElement).focus()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.ui-select-option-label').length).toBe(5)
  })
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')
})

test('openOnFocus="false" opts back out — focusing alone does not open the panel', async () => {
  const screen = await render(ComboboxFixture, { props: { openOnFocus: false } })
  const input = screen.getByRole('combobox')
  ;(input.element() as HTMLElement).focus()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('the chevron button is a standalone open/close toggle, independent of focus/typing', async () => {
  const screen = await render(ComboboxFixture, { props: { openOnFocus: false } })
  const chevron = screen.getByRole('button', { name: 'Toggle options' })

  await chevron.click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.ui-select-option-label').length).toBe(5)
  })

  await chevron.click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('a preselected value deep in a long list opens centered, not flush against the panel edge — matching Select', async () => {
  const items = Array.from({ length: 200 }, (_, i) => ({ label: `Item ${i}`, value: i }))
  const screen = await render(Combobox, {
    props: { items, modelValue: 100, virtualize: { itemSize: 32 } },
  })
  const input = screen.getByRole('combobox')
  await input.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await vi.waitFor(() => {
    const active = document.querySelector('[role="option"][data-active]')
    expect(active?.textContent).toContain('Item 100')
  })

  // Rows are positioned via `translate` (useVirtualizer.ts), not `top` —
  // `offsetTop` never reflects that, only getBoundingClientRect() does.
  await vi.waitFor(() => {
    const list = document.querySelector<HTMLElement>('.ui-select-body')!
    const activeRow = document.querySelector<HTMLElement>('[role="option"][data-active]')!
    const listRect = list.getBoundingClientRect()
    const rowRect = activeRow.getBoundingClientRect()
    const rowMidpoint = rowRect.top + rowRect.height / 2 - listRect.top
    // Flush against an edge ('nearest', the bug) puts the row within a row-
    // height of 0 or the panel's own height; centered leaves real margin on
    // both sides.
    expect(rowMidpoint).toBeGreaterThan(40)
    expect(rowMidpoint).toBeLessThan(listRect.height - 40)
  })
})

test('multiple: selecting options renders removable chips in the input area; the × removes just that one, and the panel stays open the whole time', async () => {
  const screen = await render(ComboboxFixture, { props: { multiple: true } })
  const input = screen.getByRole('combobox')
  await input.click() // openOnFocus opens with Apple already active
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await userEvent.keyboard('{Enter}') // apple
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}') // banana
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple","banana"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  // Query clears after each pick so the next keystroke starts a fresh search.
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')

  const chips = document.querySelectorAll('.ui-chip')
  expect(chips.length).toBe(2)
  expect(chips[0]!.textContent).toContain('Apple')

  const removeApple = chips[0]!.querySelector<HTMLButtonElement>('.ui-chip-remove')!
  await userEvent.click(removeApple)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["banana"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('motionCss=false disables the chip transition, including its move (reflow) animation', async () => {
  const screen = await render(Combobox, {
    props: {
      items: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
      ],
      multiple: true,
      modelValue: ['apple', 'banana'],
      motionCss: false,
    },
    global: { stubs: { 'transition-group': false } },
  })
  const chips = screen.container.querySelector<HTMLElement>('.ui-combobox-chips')!
  expect(chips.getAttribute('data-motion')).toBe('off')

  const probe = document.createElement('span')
  probe.className = 'ui-chip-item-move'
  chips.appendChild(probe)
  const duration = getComputedStyle(probe).transitionDuration
  probe.remove()
  expect(duration).toBe('0s')
})

test('multiple: clicking an already-selected row in the panel toggles it back off (filterable and re-toggleable, matching Select)', async () => {
  const screen = await render(ComboboxFixture, { props: { multiple: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await userEvent.keyboard('{Enter}') // apple
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple"]')

  const appleOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((el) =>
    el.textContent?.includes('Apple'),
  )!
  expect(appleOption.getAttribute('aria-selected')).toBe('true')
  await userEvent.click(appleOption)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('multiple: Backspace on an empty query removes the last chip', async () => {
  const screen = await render(ComboboxFixture, { props: { multiple: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{Enter}') // apple
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}') // banana
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple","banana"]')

  await userEvent.keyboard('{Backspace}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple"]')
})

test('multiple: Backspace with text still in the query edits the text, not the chips', async () => {
  const screen = await render(ComboboxFixture, { props: { multiple: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{Enter}') // apple

  await userEvent.type(input, 'x')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('x')
  await userEvent.keyboard('{Backspace}')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple"]')
})

test('multiple + allowCustom: Enter on the Create row adds the raw text as a new chip and keeps the panel open', async () => {
  const screen = await render(ComboboxFixture, { props: { multiple: true, allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Elderberry')
  await vi.waitFor(() => expect(activeOptionText()).toBe('Create "Elderberry"'))

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["Elderberry"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('header and footer slots render around the listbox only when provided, with a live count in header', async () => {
  const screen = await render(ComboboxFixture, { props: { withHeader: true, withFooter: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await expect.element(screen.getByTestId('combobox-header')).toHaveTextContent('5 of 5')
  await expect.element(screen.getByTestId('combobox-footer')).toBeInTheDocument()

  await userEvent.type(input, 'ban')
  await expect.element(screen.getByTestId('combobox-header')).toHaveTextContent('1 of 5')

  await screen.unmount()

  const bare = await render(ComboboxFixture)
  await bare.getByRole('combobox').click()
  await expect.element(bare.getByRole('listbox')).toBeInTheDocument()
  expect(document.querySelector('.ui-select-header')).toBeNull()
  expect(document.querySelector('.ui-select-footer')).toBeNull()
})

test('the listbox body still gets a real capped height (v-scroll-mask keeps working) now that max-height lives on the panel, not the body directly', async () => {
  const screen = await render(ComboboxFixture, { props: { itemCount: 1000 } })
  const input = screen.getByRole('combobox')
  await input.click()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    const body = document.querySelector('.ui-select-body')
    expect(body?.className).toContain('scroll-fade')
  })
  const body = document.querySelector('.ui-select-body') as HTMLElement
  expect(body.clientHeight).toBeLessThan(body.scrollHeight)
})

test('hidden inputs carry the selection into FormData; multiple repeats the name', async () => {
  const screen = await render(ComboboxFormFixture)
  const form = screen.getByTestId('form').element() as HTMLFormElement
  const trigger = form.querySelector('[role="combobox"]') as HTMLElement
  trigger.focus() // openOnFocus opens with Apple already active
  await userEvent.keyboard('{Enter}')

  await vi.waitFor(() => {
    const data = new FormData(form)
    expect(data.get('fruit')).toBe('apple')
  })

  await screen.unmount()
  const multi = await render(ComboboxFormFixture, { props: { multiple: true } })
  const multiForm = multi.getByTestId('form').element() as HTMLFormElement
  const multiTrigger = multiForm.querySelector('[role="combobox"]') as HTMLElement
  multiTrigger.focus()
  await userEvent.keyboard('{Enter}') // apple
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}') // banana
  await vi.waitFor(() => {
    const data = new FormData(multiForm)
    expect(data.getAll('fruit')).toEqual(['apple', 'banana'])
  })
})
