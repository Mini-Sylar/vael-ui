import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { nextTick } from 'vue'
import TreeSelectFixture from './fixtures/TreeSelectFixture.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition —
  // same cleanup as select.test.ts, since TreeSelect reuses Select's own
  // positioner class.
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
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

test('single selection: clicking a leaf commits the value and closes the panel', async () => {
  const screen = await render(TreeSelectFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-select-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('Enter on a focused row toggles selection via the keyboard, not just a mouse click', async () => {
  const screen = await render(TreeSelectFixture)
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

test('multiple mode: a click toggles that node and keeps the panel open', async () => {
  const screen = await render(TreeSelectFixture, { props: { selectionMode: 'multiple' } })
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

test('keyboard navigation: ArrowDown/ArrowUp rove between visible rows, ArrowRight expands then descends, ArrowLeft ascends then collapses', async () => {
  const screen = await render(TreeSelectFixture)
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
  const screen = await render(TreeSelectFixture, { props: { disabled: true } })
  const trigger = screen.getByRole('combobox')
  await expect.element(trigger).toHaveAttribute('aria-disabled', 'true')
  await trigger.click({ force: true })
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('clearable shows a clear button once a leaf is selected, and it resets the model without opening the panel', async () => {
  const screen = await render(TreeSelectFixture, { props: { clearable: true } })
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

test('header and footer slots render around the tree only when provided', async () => {
  const screen = await render(TreeSelectFixture, { props: { withHeader: true, withFooter: true } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await expect.element(screen.getByTestId('tree-select-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('tree-select-footer')).toBeInTheDocument()

  await screen.unmount()

  const bare = await render(TreeSelectFixture)
  await bare.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(document.querySelector('.ui-tree-select-header')).toBeNull()
  expect(document.querySelector('.ui-tree-select-footer')).toBeNull()
})

test('expanding a folder grows the panel over several frames, not in one jump', async () => {
  const screen = await render(TreeSelectFixture, {
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  const panel = document.querySelector<HTMLElement>('.ui-tree-select-panel')!
  await new Promise((resolve) => setTimeout(resolve, 300))
  const heights: number[] = []
  const t0 = performance.now()
  const sample = () => {
    heights.push(panel.offsetHeight)
    if (performance.now() - t0 < 600) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  rowByLabel('Fruits')!.querySelector<HTMLElement>('.ui-tree-select-chevron')!.click()
  await new Promise((resolve) => setTimeout(resolve, 650))
  const start = heights[0]!
  const end = heights.at(-1)!
  expect(end).toBeGreaterThan(start)
  // Never shrinks on the way, and passes through heights in between.
  for (let i = 1; i < heights.length; i++)
    expect(heights[i]!).toBeGreaterThanOrEqual(heights[i - 1]!)
  expect(heights.filter((h) => h > start + 1 && h < end - 1).length).toBeGreaterThan(1)
})

test('search results swap at once: clearing a search starts no folder open or close animations', async () => {
  const screen = await render(TreeSelectFixture, {
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  const input = document.querySelector<HTMLInputElement>('.ui-tree-select-panel input')!
  await userEvent.type(input, 'o')
  await vi.waitFor(() => expect(rowByLabel('Orange')).toBeDefined())
  await new Promise((resolve) => setTimeout(resolve, 400))
  await userEvent.clear(input)
  await nextTick()
  // A leaving block still in layout puts the old rows on top of the new ones; an entering one fades.
  const blocks = [...document.querySelectorAll<HTMLElement>('.ui-tree-rows')].filter(
    (el) => el.getClientRects().length > 0,
  )
  expect(blocks.filter((el) => /-leave-active/.test(el.className))).toHaveLength(0)
  expect(blocks.filter((el) => Number(getComputedStyle(el).opacity) < 1)).toHaveLength(0)
  await vi.waitFor(() => expect(rowByLabel('Orange')).toBeUndefined())
})

test('clicking a folder still animates its rows open', async () => {
  const screen = await render(TreeSelectFixture, {
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  rowByLabel('Fruits')!.querySelector<HTMLElement>('.ui-tree-select-chevron')!.click()
  await nextTick()
  expect(document.querySelectorAll('.ui-tree-rows-enter-active').length).toBeGreaterThan(0)
})
