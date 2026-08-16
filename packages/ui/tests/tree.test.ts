import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TreeFixture from './fixtures/TreeFixture.vue'
import { findTreeNode, findTreeParent, removeTreeNode } from '../src/components/Tree/Tree.vue'
import type { TreeNode } from '../src/components/Tree/Tree.vue'

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

test('expandOnRowClick: clicking a folder row both expands it and selects it', async () => {
  const screen = render(TreeFixture, { props: { expandOnRowClick: true } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"fruits"')

  await userEvent.click(rowByLabel('Fruits')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeUndefined())
})

test('expandOnRowClick: a leaf row still selects normally on click', async () => {
  const screen = render(TreeFixture, { props: { expandOnRowClick: true } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
})

test('expandOnRowClick off (default): clicking a folder row selects it, same as any other node', async () => {
  const screen = render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"fruits"')
})

const deepItems: TreeNode[] = [
  {
    label: 'Root',
    value: 'root',
    children: [
      {
        label: 'Branch',
        value: 'branch',
        children: [
          { label: 'LeafA', value: 'leafA' },
          { label: 'LeafB', value: 'leafB' },
          { label: 'LeafC', value: 'leafC' },
        ],
      },
      { label: 'Sibling', value: 'sibling' },
    ],
  },
]

async function expandRootAndBranch() {
  await userEvent.click(rowByLabel('Root')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Branch')).toBeDefined())
  await userEvent.click(rowByLabel('Branch')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('LeafA')).toBeDefined())
}

test('stickyScroll: expanded folder rows get native position: sticky, stacked by depth', async () => {
  render(TreeFixture, { props: { items: deepItems, stickyScroll: true, height: '120px' } })
  await vi.waitFor(() => expect(rowByLabel('Root')).toBeDefined())
  await expandRootAndBranch()

  const rootRow = rowByLabel('Root')!
  const branchRow = rowByLabel('Branch')!
  expect(getComputedStyle(rootRow).position).toBe('sticky')
  expect(getComputedStyle(branchRow).position).toBe('sticky')
  expect(rootRow.style.top).toBe('calc(var(--ui-tree-row-height) * 0)')
  expect(branchRow.style.top).toBe('calc(var(--ui-tree-row-height) * 1)')
  expect(getComputedStyle(rowByLabel('LeafA')!).position).not.toBe('sticky')
})

test('stickyScroll off (default): folder rows stay in normal flow even when expanded', async () => {
  render(TreeFixture, { props: { items: deepItems, height: '120px' } })
  await vi.waitFor(() => expect(rowByLabel('Root')).toBeDefined())
  await expandRootAndBranch()

  expect(getComputedStyle(rowByLabel('Root')!).position).not.toBe('sticky')
  expect(getComputedStyle(rowByLabel('Branch')!).position).not.toBe('sticky')
})

test('stickyScroll + expandOnRowClick: a pinned row still collapses normally on click', async () => {
  render(TreeFixture, {
    props: { items: deepItems, stickyScroll: true, expandOnRowClick: true, height: '120px' },
  })
  await vi.waitFor(() => expect(rowByLabel('Root')).toBeDefined())
  await expandRootAndBranch()

  await userEvent.click(rowByLabel('Branch')!)
  await vi.waitFor(() => expect(rowByLabel('LeafA')).toBeUndefined())
})

test('exposed expandNode/collapseNode toggle a specific node by value', async () => {
  const screen = render(TreeFixture, { props: { items: deepItems } })
  await vi.waitFor(() => expect(rowByLabel('Root')).toBeDefined())
  expect(rowByLabel('Branch')).toBeUndefined()

  await userEvent.click(screen.getByTestId('call-expand-root'))
  await vi.waitFor(() => expect(rowByLabel('Branch')).toBeDefined())

  await userEvent.click(screen.getByTestId('call-collapse-root'))
  await vi.waitFor(() => expect(rowByLabel('Branch')).toBeUndefined())
})

test('exposed expandAll/collapseAll toggle every branch at once', async () => {
  const screen = render(TreeFixture, { props: { items: deepItems } })
  await vi.waitFor(() => expect(rowByLabel('Root')).toBeDefined())

  await userEvent.click(screen.getByTestId('call-expand-all'))
  await vi.waitFor(() => expect(rowByLabel('LeafA')).toBeDefined())
  expect(rowByLabel('Sibling')).toBeDefined()

  await userEvent.click(screen.getByTestId('call-collapse-all'))
  await vi.waitFor(() => expect(rowByLabel('Branch')).toBeUndefined())
})

test('selectableFolders=false: clicking a folder never selects it, even with expandOnRowClick', async () => {
  const screen = render(TreeFixture, {
    props: { selectableFolders: false, expandOnRowClick: true },
  })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
  expect(rowByLabel('Fruits')!.getAttribute('aria-selected')).toBe('false')
})

test('selectableFolders=false: a leaf still selects normally', async () => {
  const screen = render(TreeFixture, { props: { selectableFolders: false } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('"apple"')
})

test('selectableFolders=false: keyboard Enter on a focused folder does not select it either', async () => {
  const screen = render(TreeFixture, { props: { selectableFolders: false } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.tab()
  await vi.waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Fruits'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
})

test('selectableFolders=false: checkbox mode is unaffected (folders never carry their own value anyway)', async () => {
  const screen = render(TreeFixture, {
    props: { selectableFolders: false, selectionMode: 'checkbox' },
  })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await userEvent.click(rowByLabel('Fruits')!.querySelector('.ui-tree-chevron')!)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())

  await userEvent.click(rowByLabel('Fruits')!)
  await vi.waitFor(() => {
    expect(rowByLabel('Fruits')!.getAttribute('aria-checked')).toBe('true')
  })
  const model = JSON.parse(screen.getByTestId('model').element().textContent || '[]') as string[]
  expect(model).toEqual(expect.arrayContaining(['apple', 'banana']))
})

const traversalItems: TreeNode[] = [
  {
    label: 'Root',
    value: 'root',
    children: [
      { label: 'Branch', value: 'branch', children: [{ label: 'Leaf', value: 'leaf' }] },
      { label: 'Sibling', value: 'sibling' },
    ],
  },
]

test('findTreeNode finds a node at any depth, or undefined if missing', () => {
  expect(findTreeNode(traversalItems, 'leaf')?.label).toBe('Leaf')
  expect(findTreeNode(traversalItems, 'root')?.label).toBe('Root')
  expect(findTreeNode(traversalItems, 'missing')).toBeUndefined()
})

test('findTreeParent finds the immediate parent at any depth, or null for a root node/missing value', () => {
  expect(findTreeParent(traversalItems, 'leaf')?.value).toBe('branch')
  expect(findTreeParent(traversalItems, 'sibling')?.value).toBe('root')
  expect(findTreeParent(traversalItems, 'root')).toBeNull()
  expect(findTreeParent(traversalItems, 'missing')).toBeNull()
})

test('removeTreeNode removes a node at any depth in place and reports whether it found one', () => {
  const items = structuredClone(traversalItems)
  expect(removeTreeNode(items, 'leaf')).toBe(true)
  expect(findTreeNode(items, 'leaf')).toBeUndefined()
  expect(findTreeNode(items, 'branch')?.children).toEqual([])
  expect(removeTreeNode(items, 'missing')).toBe(false)
})

test("exposed findNode/findParent/removeNode are bound to this instance's own items", async () => {
  const screen = render(TreeFixture, { props: { items: deepItems } })
  await vi.waitFor(() => expect(rowByLabel('Root')).toBeDefined())

  await userEvent.click(screen.getByTestId('call-find-leaf-a'))
  await expect.element(screen.getByTestId('find-result')).toHaveTextContent('LeafA')

  await userEvent.click(screen.getByTestId('call-find-parent-leaf-a'))
  await expect.element(screen.getByTestId('find-result')).toHaveTextContent('branch')

  await userEvent.click(screen.getByTestId('call-remove-leaf-a'))
  await expect.element(screen.getByTestId('find-result')).toHaveTextContent('true')
  await userEvent.click(screen.getByTestId('call-expand-all'))
  await vi.waitFor(() => expect(rowByLabel('LeafB')).toBeDefined())
  expect(rowByLabel('LeafA')).toBeUndefined()
})

test('v-model:node mirrors the selected node object, not just its value', async () => {
  const screen = render(TreeFixture)
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())
  await expect.element(screen.getByTestId('node-model')).toHaveTextContent('null')

  const chevron = rowByLabel('Fruits')!.querySelector<HTMLElement>('.ui-tree-chevron')!
  await userEvent.click(chevron)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await userEvent.click(rowByLabel('Apple')!)
  await expect.element(screen.getByTestId('node-model')).toHaveTextContent('Apple')
})

test('v-model:node holds an array of node objects in multiple mode', async () => {
  const screen = render(TreeFixture, { props: { selectionMode: 'multiple' } })
  await vi.waitFor(() => expect(rowByLabel('Fruits')).toBeDefined())

  const chevron = rowByLabel('Fruits')!.querySelector<HTMLElement>('.ui-tree-chevron')!
  await userEvent.click(chevron)
  await vi.waitFor(() => expect(rowByLabel('Apple')).toBeDefined())
  await userEvent.click(rowByLabel('Apple')!)
  await userEvent.click(rowByLabel('Banana')!)
  await expect.element(screen.getByTestId('node-model')).toHaveTextContent('Apple,Banana')
})
