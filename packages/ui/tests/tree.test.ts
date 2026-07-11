import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TreeFixture from './fixtures/TreeFixture.vue'

// Same scenarios as tree-select.test.ts, adapted to the standalone component
// this logic was extracted INTO — no popover to open first, and Tree's own
// `.ui-tree-*` class names (TreeSelect keeps its own `.ui-tree-select-*`
// names as passenger classes on the same elements; see Tree.vue's own
// comment) instead of TreeSelect's.
function rowByLabel(label: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.ui-tree-row')).find(
    (el) => el.querySelector('.ui-tree-label')?.textContent?.trim() === label,
  )
}
function focusedLabel(): string | undefined {
  const row = document.activeElement?.closest('[role="treeitem"]')
  return row?.querySelector('.ui-tree-label')?.textContent?.trim()
}

test('renders nested data: root nodes are visible, children stay hidden until expanded', async () => {
  render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(rowByLabel('Vegetables')).toBeDefined()
  expect(rowByLabel('Apple')).toBeUndefined()
  expect(rowByLabel('Carrot')).toBeUndefined()
})

test('clicking the chevron expands a node to reveal its children, and collapses it again', async () => {
  render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  const chevron = rowByLabel('Fruits')!.querySelector<HTMLElement>('.ui-tree-chevron')!
  await userEvent.click(chevron)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  expect(rowByLabel('Banana')).toBeDefined()

  await userEvent.click(chevron)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeUndefined())
})

test('single selection: clicking a leaf commits the value', async () => {
  const screen = render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
})

test('a first row is tabbable as soon as the tree mounts, with no external action needed', async () => {
  render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await vi.waitFor(() => expect(rowByLabel('Fruits')!.tabIndex).toBe(0))
  expect(rowByLabel('Vegetables')!.tabIndex).toBe(-1)
})

test('Enter on a focused row toggles selection via the keyboard, not just a mouse click', async () => {
  const screen = render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  // filterable defaults to true — the search box is focused first via Tab,
  // same handoff TreeSelect's own panel relies on.
  await userEvent.tab()
  await vi.waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Vegetables'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"vegetables"')
})

test('checkbox mode: checking a leaf adds its value to the array', async () => {
  const screen = render(TreeFixture, { props: { selectionMode: 'checkbox' } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  const appleCheckbox = rowByLabel('Apple')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!
  await userEvent.click(appleCheckbox)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["apple"]')

  await userEvent.click(appleCheckbox)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
})

test('checkbox mode: a parent renders indeterminate when only some descendants are checked, and checked once every enabled descendant is', async () => {
  const screen = render(TreeFixture, { props: { selectionMode: 'checkbox' } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await userEvent.click(rowByLabel('Citrus')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Orange')).toBeDefined())

  await userEvent.click(rowByLabel('Apple')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!)
  await vi.waitFor(() => {
    expect(rowByLabel('Fruits')!.getAttribute('aria-checked')).toBe('mixed')
  })

  await userEvent.click(
    rowByLabel('Banana')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!,
  )
  await userEvent.click(
    rowByLabel('Orange')!.querySelector<HTMLInputElement>('.ui-checkbox-input')!,
  )
  await vi.waitFor(() => {
    expect(rowByLabel('Fruits')!.getAttribute('aria-checked')).toBe('true')
  })
  const model = JSON.parse(screen.getByTestId('model').element().textContent || '[]') as string[]
  expect(model).not.toContain('lemon')
  expect(model).toEqual(expect.arrayContaining(['apple', 'banana', 'orange']))
})

test('checkbox mode: a disabled leaf cannot be toggled directly', async () => {
  const screen = render(TreeFixture, { props: { selectionMode: 'checkbox' } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Citrus')).toBeDefined())
  await userEvent.click(rowByLabel('Citrus')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Lemon')).toBeDefined())

  const lemonRow = rowByLabel('Lemon')!
  expect(lemonRow.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(lemonRow.querySelector<HTMLInputElement>('.ui-checkbox-input')!, {
    force: true,
  })
  await expect.element(screen.getByTestId('model')).toHaveTextContent('[]')
})

test('multiple mode: clicking toggles just that node, with no parent/child linkage', async () => {
  const screen = render(TreeFixture, { props: { selectionMode: 'multiple' } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["fruits"]')

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["fruits","apple"]')
})

test('the search filter narrows rows to label matches and auto-expands their ancestors', async () => {
  const screen = render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(rowByLabel('Orange')).toBeUndefined()

  const filterInput = screen.container.querySelector<HTMLInputElement>('.ui-tree-filter input')!
  await userEvent.fill(filterInput, 'orange')

  await vi.waitFor(() => expect(rowByLabel('Orange')).toBeDefined())
  expect(rowByLabel('Fruits')).toBeDefined()
  expect(rowByLabel('Citrus')).toBeDefined()
  expect(rowByLabel('Vegetables')).toBeUndefined()
  expect(rowByLabel('Banana')).toBeUndefined()
})

test('keyboard navigation: ArrowDown/ArrowUp rove between visible rows, ArrowRight expands then descends, ArrowLeft ascends then collapses', async () => {
  render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.tab()
  await vi.waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Vegetables'))
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  expect(focusedLabel()).toBe('Fruits')

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Apple'))

  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeUndefined())
  expect(focusedLabel()).toBe('Fruits')
})

test('filterable=false renders no search box', async () => {
  const screen = render(TreeFixture, { props: { filterable: false } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  expect(screen.container.querySelector('.ui-tree-filter')).toBeNull()
})
