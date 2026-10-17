import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import { render } from 'vitest-browser-vue'
import { classMergerKey } from '../src/classes'
import DataTableFixture from './fixtures/DataTableFixture.vue'
import DataTableVirtualizeFixture from './fixtures/DataTableVirtualizeFixture.vue'

// Budgets carry wide headroom so a slow CI box doesn't flake.

// Every part class goes through the class merger, so its call count is a render counter.
let mergeCalls = 0
let headMerges = 0
const countingMerger = (classes: string) => {
  mergeCalls++
  if (classes.startsWith('ui-datatable-th')) headMerges++
  return classes
}
const global = {
  stubs: { transition: false, 'transition-group': false },
  provide: { [classMergerKey as symbol]: countingMerger },
}

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderTable(props: Record<string, unknown>) {
  const screen = await render(DataTableFixture, { props, global })
  await nextTick()
  await nextTick()
  return screen
}

function frames(count = 2) {
  return new Promise<void>((resolve) => {
    const step = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })
}

async function timeUpdate(screen: { container: HTMLElement }, action: () => void) {
  const start = performance.now()
  action()
  await nextTick()
  // Reading layout includes any style and layout work the update left behind.
  void screen.container.getBoundingClientRect()
  return performance.now() - start
}

test('sorting 1000 rows with the default row motion stays fast', async () => {
  const screen = await renderTable({ rowCount: 1000, showStatusColumn: false })
  await frames()
  const ageSort = screen.container.querySelectorAll<HTMLElement>('.ui-datatable-sort-button')[1]!
  const elapsed = await timeUpdate(screen, () => ageSort.click())
  const ages = Array.from(
    screen.container.querySelectorAll('.ui-datatable-tbody .ui-datatable-tr'),
    (tr) => Number(tr.children[1]!.textContent),
  )
  expect(ages).toEqual([...ages].sort((a, b) => a - b))
  expect(elapsed).toBeLessThan(200)
})

test('a large table turns row motion off; a small one keeps it', async () => {
  const large = await renderTable({ rowCount: 200, showStatusColumn: false })
  await frames()
  expect(large.container.querySelector('.ui-datatable-tbody')!.getAttribute('data-motion')).toBe(
    'off',
  )
  const small = await renderTable({ rowCount: 20, showStatusColumn: false })
  await frames()
  expect(
    small.container.querySelector('.ui-datatable-tbody')!.getAttribute('data-motion'),
  ).toBeNull()
})

test('select-all on 1000 rows builds the selection once and emits once', async () => {
  const screen = await renderTable({
    rowCount: 1000,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  await frames()
  const selectAll = screen.container.querySelector<HTMLInputElement>(
    '.ui-datatable-th--select .ui-checkbox-input',
  )!
  const elapsed = await timeUpdate(screen, () => selectAll.click())
  expect(screen.getByTestId('selection-emit-count').element().textContent).toBe('1')
  expect(screen.getByTestId('selection-change-count').element().textContent).toBe('1000')
  expect(selectAll.checked).toBe(true)
  expect(elapsed).toBeLessThan(250)

  await timeUpdate(screen, () => selectAll.click())
  expect(screen.getByTestId('selection-emit-count').element().textContent).toBe('2')
  expect(screen.getByTestId('selection-change-count').element().textContent).toBe('0')
})

test('toggling one row leaves the header alone while the select-all state is unchanged', async () => {
  const screen = await renderTable({
    rowCount: 50,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  await frames()
  const rowBoxes = screen.container.querySelectorAll<HTMLInputElement>(
    '.ui-datatable-td--select .ui-checkbox-input',
  )
  rowBoxes[0]!.click()
  await nextTick()
  // Already indeterminate, so a second row keeps it indeterminate.
  headMerges = 0
  rowBoxes[1]!.click()
  await nextTick()
  expect(screen.getByTestId('selection-change-count').element().textContent).toBe('2')
  expect(headMerges).toBe(0)
})

test('dragging a column resize handle does not re-render every body cell per move', async () => {
  const screen = await renderTable({
    rowCount: 1000,
    showStatusColumn: false,
    resizableColumns: true,
  })
  await frames()
  const nameHeader = screen.container.querySelector<HTMLElement>('.ui-datatable-th')!
  const handle = nameHeader.querySelector<HTMLElement>('.ui-datatable-resize-handle')!
  const rect = handle.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const init = { clientY: rect.top, pointerId: 1, bubbles: true }
  handle.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: x }))
  window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + 5 }))
  await frames()

  mergeCalls = 0
  let slowest = 0
  for (let i = 2; i <= 10; i++) {
    const start = performance.now()
    window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + i * 5 }))
    await frames(1)
    void screen.container.getBoundingClientRect()
    slowest = Math.max(slowest, performance.now() - start)
  }
  window.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: x + 50 }))
  await frames()

  // One body render is about 2000 merges here (two cells per row).
  expect(mergeCalls).toBeLessThan(500)
  const firstCell = screen.container.querySelector<HTMLElement>(
    '.ui-datatable-tbody .ui-datatable-td',
  )!
  expect(Math.round(firstCell.getBoundingClientRect().width)).toBe(
    Math.round(nameHeader.getBoundingClientRect().width),
  )
  expect(nameHeader.getBoundingClientRect().width).toBeGreaterThan(rect.width + 100)
  expect(slowest).toBeLessThan(150)
})

test('a resize applies the last pointer position even when pointerup lands in the same frame', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, resizableColumns: true })
  const nameHeader = screen.container.querySelector<HTMLElement>('.ui-datatable-th')!
  const handle = nameHeader.querySelector<HTMLElement>('.ui-datatable-resize-handle')!
  const startWidth = nameHeader.getBoundingClientRect().width
  const rect = handle.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const init = { clientY: rect.top, pointerId: 1, bubbles: true }
  handle.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: x }))
  window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + 30 }))
  window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + 80 }))
  window.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: x + 80 }))
  await vi.waitFor(() =>
    expect(Math.abs(nameHeader.getBoundingClientRect().width - startWidth - 80)).toBeLessThan(1.5),
  )
  // A move after pointerup must not keep resizing.
  window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + 200 }))
  await frames()
  expect(Math.abs(nameHeader.getBoundingClientRect().width - startWidth - 80)).toBeLessThan(1.5)
})

test('window pointer listeners attach only while a column resize is in progress', async () => {
  const added = vi.spyOn(window, 'addEventListener')
  const removed = vi.spyOn(window, 'removeEventListener')
  const pointerTypes = (spy: typeof added) =>
    spy.mock.calls.map(([type]) => type).filter((type) => String(type).startsWith('pointer'))

  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, resizableColumns: true })
  expect(pointerTypes(added)).toEqual([])

  const handle = screen.container.querySelector<HTMLElement>('.ui-datatable-resize-handle')!
  const rect = handle.getBoundingClientRect()
  const init = { clientX: rect.left, clientY: rect.top, pointerId: 1, bubbles: true }
  handle.dispatchEvent(new PointerEvent('pointerdown', init))
  expect(pointerTypes(added).sort()).toEqual(['pointercancel', 'pointermove', 'pointerup'])
  window.dispatchEvent(new PointerEvent('pointerup', init))
  expect(pointerTypes(removed).sort()).toEqual(['pointercancel', 'pointermove', 'pointerup'])
})

test('loading marks the table busy and announces it through a persistent live region', async () => {
  const screen = await renderTable({ rowCount: 3, loading: true })
  const table = screen.container.querySelector('table')!
  const status = screen.container.querySelector<HTMLElement>('[role="status"]')!
  expect(table.getAttribute('aria-busy')).toBe('true')
  expect(status.getAttribute('aria-live')).toBe('polite')
  expect(status.textContent).toBe('Loading…')
  // Visually hidden, not display:none, so screen readers still read it.
  expect(status.getBoundingClientRect().width).toBeLessThanOrEqual(1)
  expect(getComputedStyle(status).display).not.toBe('none')

  await screen.rerender({ rowCount: 3, loading: false })
  expect(table.getAttribute('aria-busy')).toBeNull()
  expect(screen.container.querySelector('[role="status"]')).toBe(status)
  expect(status.textContent).toBe('')
})

test('virtualize: scrolling within the same rendered window does not re-render the body', async () => {
  const screen = await render(DataTableVirtualizeFixture, {
    props: { rowCount: 2000, virtualize: { itemSize: 40 } },
    global,
  })
  await nextTick()
  await frames()
  const scrollEl = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  mergeCalls = 0
  for (let top = 1; top <= 10; top++) {
    scrollEl.scrollTop = top
    scrollEl.dispatchEvent(new Event('scroll'))
    await nextTick()
  }
  expect(mergeCalls).toBe(0)

  // A scroll that does move the window still updates it.
  scrollEl.scrollTop = 4000
  scrollEl.dispatchEvent(new Event('scroll'))
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[data-virtual-index="100"]')).not.toBeNull(),
  )
})
