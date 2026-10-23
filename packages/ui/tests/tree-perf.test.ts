import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import TreeFixture from './fixtures/TreeFixture.vue'
import type { TreeNode } from '../src/components/Tree/Tree.vue'

// 12 x 30 = 372 rows expanded: the most a tree keeps as nested rows (past 500 it's a flat list
// that renders only what's in view; see tree-virtual.test.ts). Counts are the main assertion;
// times get wide headroom.
function bigItems(folders = 12, perFolder = 30): TreeNode[] {
  return Array.from({ length: folders }, (_, f) => ({
    label: `Folder ${f}`,
    value: `f${f}`,
    children: Array.from({ length: perFolder }, (_, c) => ({
      label: `Item ${f}-${c}`,
      value: `f${f}-${c}`,
    })),
  }))
}

let rowUpdates = 0
let componentMounts = 0
const countRowUpdates = {
  updated(this: ComponentPublicInstance) {
    if ((this.$options as { __name?: string }).__name === 'TreeNodeRow') rowUpdates++
  },
  mounted() {
    componentMounts++
  },
}

function rowEl(value: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-tree-value="${value}"]`)!
}
function rowCount(): number {
  return document.querySelectorAll('[role="treeitem"]').length
}

async function renderExpanded(
  props: Record<string, unknown> = {},
  items: TreeNode[] = bigItems(),
  expectedRows = 372,
  transitions = false,
) {
  const screen = await render(TreeFixture, {
    props: { items, ...props },
    global: {
      mixins: [countRowUpdates],
      ...(transitions && { stubs: { transition: false, 'transition-group': false } }),
    },
  })
  await vi.waitFor(() => expect(rowCount()).toBe(items.length))
  screen.container.querySelector<HTMLButtonElement>('[data-testid="call-expand-all"]')!.click()
  await vi.waitFor(() => expect(rowCount()).toBe(expectedRows))
  // Let the expand-all motion finish before measuring anything else.
  await new Promise((resolve) => setTimeout(resolve, 400))
  return screen
}

async function measure(action: () => void) {
  rowUpdates = 0
  const start = performance.now()
  action()
  await nextTick()
  return { ms: performance.now() - start, updates: rowUpdates }
}

// Logs each rect read with the count of rows already transformed, to catch read/write interleaving.
const SLIDING_ROWS = '[data-tree-value][style*="translateY"]'
const restorers: (() => void)[] = []
afterEach(() => {
  while (restorers.length) restorers.pop()!()
})
function recordLayoutReads() {
  const reads: number[] = []
  const originalRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function (this: Element) {
    reads.push(document.querySelectorAll(SLIDING_ROWS).length)
    return originalRect.call(this)
  }
  restorers.push(() => {
    Element.prototype.getBoundingClientRect = originalRect
  })
  return reads
}
function slidingRowCount(): number {
  return document.querySelectorAll(SLIDING_ROWS).length
}

test('selecting one row re-renders only the rows whose selection changed', async () => {
  await renderExpanded()

  const first = await measure(() => rowEl('f5-5').click())
  expect(rowEl('f5-5').getAttribute('aria-selected')).toBe('true')
  const second = await measure(() => rowEl('f7-7').click())
  expect(rowEl('f5-5').getAttribute('aria-selected')).toBe('false')
  expect(rowEl('f7-7').getAttribute('aria-selected')).toBe('true')
  console.log(`select: ${first.ms.toFixed(1)}ms / ${second.ms.toFixed(1)}ms`)

  expect(first.updates).toBeLessThanOrEqual(1)
  expect(second.updates).toBeLessThanOrEqual(2)
  expect(second.ms).toBeLessThan(100)
})

test('checkbox mode: checking one leaf re-renders only that leaf and its folder', async () => {
  await renderExpanded({ selectionMode: 'checkbox' })

  const result = await measure(() => rowEl('f3-3').click())
  expect(rowEl('f3-3').getAttribute('aria-checked')).toBe('true')
  expect(rowEl('f3').getAttribute('aria-checked')).toBe('mixed')
  console.log(`checkbox toggle: ${result.ms.toFixed(1)}ms`)
  expect(result.updates).toBeLessThanOrEqual(2)
})

test('past 150 visible rows the row checkboxes drop their press layer, and folders still fold', async () => {
  await renderExpanded({ selectionMode: 'checkbox' })
  const root = document.querySelector<HTMLElement>('.ui-tree-root')!
  expect(root.dataset.rows).toBe('many')
  expect(getComputedStyle(root.querySelector<HTMLElement>('.ui-checkbox-box')!).willChange).toBe(
    'auto',
  )
})

test('collapsing one folder re-renders only that folder row', async () => {
  await renderExpanded({}, bigItems())

  const result = await measure(() =>
    rowEl('f10').querySelector<HTMLElement>('.ui-tree-chevron')!.click(),
  )
  expect(rowEl('f10').getAttribute('aria-expanded')).toBe('false')
  console.log(`collapse: ${result.ms.toFixed(1)}ms`)
  expect(result.updates).toBeLessThanOrEqual(1)
})

test('a large tree collapses without transforming any row', async () => {
  await renderExpanded()
  const reads = recordLayoutReads()

  const result = await measure(() =>
    rowEl('f0').querySelector<HTMLElement>('.ui-tree-chevron')!.click(),
  )
  console.log(`collapse with motion: ${result.ms.toFixed(1)}ms, ${reads.length} rect reads`)
  expect(slidingRowCount()).toBe(0)
  expect(reads.length).toBeLessThan(20)
})

test('a mid-sized tree animates the folder itself and moves no other row with a transform', async () => {
  // 12 x 10 = 132 rows: under the motion limit, in a list that shows ~9.
  await renderExpanded({ height: '300px' }, bigItems(12, 10), 132, true)
  await measure(() => rowEl('f0').querySelector<HTMLElement>('.ui-tree-chevron')!.click())
  const block = document.querySelector<HTMLElement>('.ui-tree-rows[data-folding]')
  expect(block).toBeTruthy()
  // The rows below follow it in layout, so none of them is transformed.
  expect(slidingRowCount()).toBe(0)
})

test('a 300-row tree, past the checkbox limit, still folds with its animation', async () => {
  // 30 x 9 = 300 rows: past 150 (static checkboxes) but under the 500-row fold limit.
  await renderExpanded({ height: '300px', selectionMode: 'checkbox' }, bigItems(30, 9), 300, true)
  expect(document.querySelector<HTMLElement>('.ui-tree-root')!.dataset.rows).toBe('many')
  await measure(() => rowEl('f0').querySelector<HTMLElement>('.ui-tree-chevron')!.click())
  expect(document.querySelector('.ui-tree-rows[data-folding]')).toBeTruthy()
})

test('a small tree grows the opening folder in flow, and the row below moves with it', async () => {
  await render(TreeFixture, { global: { stubs: { transition: false, 'transition-group': false } } })
  await vi.waitFor(() => expect(rowCount()).toBe(2))
  const vegetables = rowEl('vegetables')
  const before = vegetables.getBoundingClientRect().top

  rowEl('fruits').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await nextTick()
  const block = rowEl('fruits').nextElementSibling as HTMLElement
  expect(block.dataset.folding).toBe('')
  expect(block.style.blockSize).toMatch(/px$/)
  expect(vegetables.style.transform).toBe('')
  // Partway there a few frames in, then all the way.
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
  const partway = vegetables.getBoundingClientRect().top
  expect(partway).toBeGreaterThan(before)
  await vi.waitFor(() => expect(block.dataset.folding).toBeUndefined())
  expect(block.style.blockSize).toBe('')
  expect(vegetables.getBoundingClientRect().top).toBeGreaterThan(partway)
})

test('filter keystrokes re-render only rows whose visibility changed, and clearing mounts one component per row', async () => {
  const screen = await renderExpanded()
  const input = screen.container.querySelector<HTMLInputElement>('.ui-tree-filter input')!
  function type(value: string) {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // Every row still matches, so nothing visible changes.
  await measure(() => type('I'))
  const allVisible = await measure(() => type('It'))
  expect(rowCount()).toBe(372)
  const narrow = await measure(() => type('Item 3-4'))
  await vi.waitFor(() => expect(rowCount()).toBe(2))

  componentMounts = 0
  const clear = await measure(() => type(''))
  await vi.waitFor(() => expect(rowCount()).toBe(372))
  console.log(
    `filter: all-visible keystroke ${allVisible.ms.toFixed(1)}ms (${allVisible.updates} rows), narrow ${narrow.ms.toFixed(1)}ms, clear ${clear.ms.toFixed(1)}ms (${componentMounts} components mounted)`,
  )
  expect(allVisible.updates).toBeLessThanOrEqual(1)
  // 370 rows come back without a Transition per leaf.
  expect(componentMounts).toBeLessThan(372 + 100)
})
