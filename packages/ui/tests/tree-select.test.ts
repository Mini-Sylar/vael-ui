import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TreeSelectFixture from './fixtures/TreeSelectFixture.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition —
  // same cleanup as select.test.ts, since TreeSelect reuses Select's own
  // positioner class.
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

test('a plain class passed to TreeSelect reaches the rendered trigger', async () => {
  const screen = render(TreeSelect, { props: { items: [] }, attrs: { class: 'my-tree-select' } })
  const trigger = screen.getByRole('combobox')
  expect(trigger.element().closest('.my-tree-select')).not.toBeNull()
})

// Finds a row by its visible label text rather than accessible-name matching
// — the per-row Checkbox in checkbox mode carries its own `aria-label`
// (documented in TreeSelect.vue: it's an independently-tabbable native
// input, so it needs SOME name of its own), which can fold into the
// row's own computed accessible name too and make exact getByRole name
// matches brittle. Reading the row's own label span directly sidesteps that.
function rowByLabel(label: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.ui-tree-select-row')).find(
    (el) => el.querySelector('.ui-tree-select-label')?.textContent?.trim() === label,
  )
}
function focusedLabel(): string | undefined {
  const row = document.activeElement?.closest('[role="treeitem"]')
  return row?.querySelector('.ui-tree-select-label')?.textContent?.trim()
}

test('renders nested data: root nodes are visible, children stay hidden until expanded', async () => {
  const screen = render(TreeSelectFixture)
  await screen.getByRole('combobox').click()

  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(rowByLabel('Vegetables')).toBeDefined()
  expect(rowByLabel('Apple')).toBeUndefined()
  expect(rowByLabel('Carrot')).toBeUndefined()
})

test('clicking the chevron expands a node to reveal its children, and collapses it again', async () => {
  const screen = render(TreeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  const chevron = rowByLabel('Fruits')!.querySelector<HTMLElement>('.ui-tree-select-chevron')!
  await userEvent.click(chevron)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  expect(rowByLabel('Banana')).toBeDefined()

  await userEvent.click(chevron)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeUndefined())
})

test('single selection: clicking a leaf commits the value and closes the panel', async () => {
  const screen = render(TreeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('Enter on a focused row toggles selection via the keyboard, not just a mouse click', async () => {
  const screen = render(TreeSelectFixture)
  await screen.getByRole('combobox').click()
  // filterable defaults to true — opening focuses the search box first, not
  // a row; ArrowDown from there hands focus to the first row (see the
  // keyboard-nav test below for the same handoff).
  await vi.waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Vegetables'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"vegetables"')
})

test('checkbox mode: checking a leaf adds its value to the array', async () => {
  const screen = render(TreeSelectFixture, { props: { selectionMode: 'checkbox' } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  const appleCheckbox = rowByLabel('Apple')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!
  await userEvent.click(appleCheckbox)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple"]')

  await userEvent.click(appleCheckbox)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
})

test('checkbox mode: a parent renders indeterminate when only some descendants are checked, and checked once every enabled descendant is', async () => {
  const screen = render(TreeSelectFixture, { props: { selectionMode: 'checkbox' } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await userEvent.click(rowByLabel('Citrus')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Orange')).toBeDefined())

  // Only Apple checked so far — Fruits (its parent) must be indeterminate,
  // not checked, and definitely not left plain-unchecked.
  await userEvent.click(rowByLabel('Apple')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!)
  await vi.waitFor(() => {
    expect(rowByLabel('Fruits')!.getAttribute('aria-checked')).toBe('mixed')
  })

  // Check Banana too, and Orange (Citrus's only ENABLED leaf — Lemon is
  // disabled and must be excluded from the aggregate entirely). Every
  // participating descendant is now checked, so Fruits itself flips to
  // fully checked, not indeterminate.
  await userEvent.click(
    rowByLabel('Banana')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!,
  )
  await userEvent.click(
    rowByLabel('Orange')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!,
  )
  await vi.waitFor(() => {
    expect(rowByLabel('Fruits')!.getAttribute('aria-checked')).toBe('true')
  })
  // Lemon (disabled) never entered the model despite Citrus now reading checked.
  const model = JSON.parse(screen.getByTestId('model').element().textContent || '[]') as string[]
  expect(model).not.toContain('lemon')
  expect(model).toEqual(expect.arrayContaining(['apple', 'banana', 'orange']))
})

test('checkbox mode: a disabled leaf cannot be toggled directly', async () => {
  const screen = render(TreeSelectFixture, { props: { selectionMode: 'checkbox' } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Citrus')).toBeDefined())
  await userEvent.click(rowByLabel('Citrus')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Lemon')).toBeDefined())

  const lemonRow = rowByLabel('Lemon')!
  expect(lemonRow.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(lemonRow.querySelector<HTMLInputElement>('.ui-checkbox-input')!, {
    force: true,
  })
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
})

test('multiple mode: clicking toggles just that node, with no parent/child linkage', async () => {
  const screen = render(TreeSelectFixture, { props: { selectionMode: 'multiple' } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  // Selecting the branch node itself (not a leaf) — no checkbox exists in
  // this mode, clicking the row directly toggles it.
  await userEvent.click(rowByLabel('Fruits')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["fruits"]')

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["fruits","apple"]')
  // The panel must still be open — multiple/checkbox modes never auto-close.
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('the search filter narrows rows to label matches and auto-expands their ancestors', async () => {
  const screen = render(TreeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  // Nothing pre-expanded — Orange only exists two levels under Fruits.
  expect(rowByLabel('Orange')).toBeUndefined()

  // The panel is Teleported to <body>, outside screen.container — same
  // reason every other popover test here (select.test.ts, cascade-select.test.ts)
  // queries the teleported panel via `document`, not the render container.
  const filterInput = document.querySelector<HTMLInputElement>('.ui-tree-select-filter input')!
  await userEvent.fill(filterInput, 'orange')

  await vi.waitFor(() => expect(rowByLabel('Orange')).toBeDefined())
  // Ancestors of the match are force-shown...
  expect(rowByLabel('Fruits')).toBeDefined()
  expect(rowByLabel('Citrus')).toBeDefined()
  // ...but an unrelated sibling branch is filtered out entirely.
  expect(rowByLabel('Vegetables')).toBeUndefined()
  expect(rowByLabel('Banana')).toBeUndefined()
})

test('keyboard navigation: ArrowDown/ArrowUp rove between visible rows, ArrowRight expands then descends, ArrowLeft ascends then collapses', async () => {
  const screen = render(TreeSelectFixture)
  await screen.getByRole('combobox').click()
  // The filter input is focused first (filterable defaults to true) — an
  // initial ArrowDown from there hands focus to the first row.
  await vi.waitFor(() => {
    const active = document.activeElement
    expect(active?.tagName).toBe('INPUT')
  })
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))

  // Fruits is still collapsed — ArrowDown skips straight to its only visible
  // sibling, Vegetables, not into any (not-yet-rendered) children.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Vegetables'))
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))

  // ArrowRight on a closed branch expands it without moving focus...
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  expect(focusedLabel()).toBe('Fruits')

  // ...a second ArrowRight (now open) descends into the first child.
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Apple'))

  // ArrowLeft on a leaf ascends back to its parent...
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))
  // ...a second ArrowLeft (now the focused node itself, open) collapses it.
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeUndefined())
  expect(focusedLabel()).toBe('Fruits')
})

test('the disabled prop disables the trigger and blocks opening', async () => {
  const screen = render(TreeSelectFixture, { props: { disabled: true } })
  const trigger = screen.getByRole('combobox')
  await expect.element(trigger).toHaveAttribute('aria-disabled', 'true')
  await trigger.click({ force: true })
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('clearable shows a clear button once a leaf is selected, and it resets the model without opening the panel', async () => {
  const screen = render(TreeSelectFixture, { props: { clearable: true } })
  await expect.element(screen.getByLabelText('Clear selection')).not.toBeInTheDocument()

  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')

  const clearButton = screen.getByLabelText('Clear selection')
  await expect.element(clearButton).toBeInTheDocument()
  await clearButton.click()

  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('filterable=false renders no search box', async () => {
  const screen = render(TreeSelectFixture, { props: { filterable: false } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(screen.container.querySelector('.ui-tree-select-filter')).toBeNull()
})

test('header and footer slots render around the tree only when provided', async () => {
  const screen = render(TreeSelectFixture, { props: { withHeader: true, withFooter: true } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await expect.element(screen.getByTestId('tree-select-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('tree-select-footer')).toBeInTheDocument()

  screen.unmount()

  const bare = render(TreeSelectFixture)
  await bare.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(document.querySelector('.ui-tree-select-header')).toBeNull()
  expect(document.querySelector('.ui-tree-select-footer')).toBeNull()
})
