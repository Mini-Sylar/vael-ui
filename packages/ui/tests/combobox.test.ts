import '../src/style.css'
import { userEvent } from 'vitest/browser'
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
  const screen = render(Combobox, {
    props: { items: [{ label: 'A', value: 'a' }] },
    attrs: { class: 'my-search-box' },
  })
  const input = screen.getByRole('combobox')
  expect(input.element().closest('.my-search-box')).not.toBeNull()
})

test('typing filters the list, diacritic- and case-insensitively', async () => {
  const screen = render(ComboboxFixture)
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
  const screen = render(ComboboxFixture, { props: { filter: false } })
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
  const screen = render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  await input.click() // openOnFocus (now the default) opens with Apple already active
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('Apple')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('allowCustom: Enter with no active option commits the raw text and emits create', async () => {
  const screen = render(ComboboxFixture, { props: { allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Elderberry')
  // Nothing matches "Elderberry" in the list — no active option.
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.ui-select-option-label').length).toBe(0)
  })

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"Elderberry"')
  await expect.element(screen.getByTestId('create-log')).toHaveTextContent('Elderberry')
})

test('without allowCustom, blur with unmatched text reverts the query to the selected label', async () => {
  const screen = render(ComboboxFixture)
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
  const screen = render(ComboboxFixture, { props: { loading: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()

  const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!
  expect(listbox.getAttribute('aria-busy')).toBe('true')
})

test('aria-activedescendant tracks arrow navigation while focus stays in the input', async () => {
  const screen = render(ComboboxFixture)
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
  const screen = render(ComboboxFixture)
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
  const screen = render(ComboboxFixture, { props: { filter: false } })
  const input = screen.getByRole('combobox')
  ;(input.element() as HTMLElement).focus()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
})

test('openOnFocus defaults to true in local-filter mode too — focusing an empty field shows every option with nothing typed', async () => {
  const screen = render(ComboboxFixture)
  const input = screen.getByRole('combobox')
  ;(input.element() as HTMLElement).focus()
  await expect.element(screen.getByRole('listbox')).toBeInTheDocument()
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.ui-select-option-label').length).toBe(5)
  })
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')
})

test('openOnFocus="false" opts back out — focusing alone does not open the panel', async () => {
  const screen = render(ComboboxFixture, { props: { openOnFocus: false } })
  const input = screen.getByRole('combobox')
  ;(input.element() as HTMLElement).focus()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('the chevron button is a standalone open/close toggle, independent of focus/typing', async () => {
  const screen = render(ComboboxFixture, { props: { openOnFocus: false } })
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
  const screen = render(Combobox, {
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
  const screen = render(ComboboxFixture, { props: { multiple: true } })
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
  const screen = render(Combobox, {
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
  const screen = render(ComboboxFixture, { props: { multiple: true } })
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
  const screen = render(ComboboxFixture, { props: { multiple: true } })
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
  const screen = render(ComboboxFixture, { props: { multiple: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.keyboard('{Enter}') // apple

  await userEvent.type(input, 'x')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('x')
  await userEvent.keyboard('{Backspace}')
  await expect.element(screen.getByTestId('query')).toHaveTextContent('')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple"]')
})

test('multiple + allowCustom: Enter with no active option adds the raw text as a new chip and keeps the panel open', async () => {
  const screen = render(ComboboxFixture, { props: { multiple: true, allowCustom: true } })
  const input = screen.getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Elderberry')
  await vi.waitFor(() => {
    expect(document.querySelectorAll('.ui-select-option-label').length).toBe(0)
  })

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["Elderberry"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('hidden inputs carry the selection into FormData; multiple repeats the name', async () => {
  const screen = render(ComboboxFormFixture)
  const form = screen.getByTestId('form').element() as HTMLFormElement
  const trigger = form.querySelector('[role="combobox"]') as HTMLElement
  trigger.focus() // openOnFocus opens with Apple already active
  await userEvent.keyboard('{Enter}')

  await vi.waitFor(() => {
    const data = new FormData(form)
    expect(data.get('fruit')).toBe('apple')
  })

  screen.unmount()
  const multi = render(ComboboxFormFixture, { props: { multiple: true } })
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
