import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DataTableFixture from './fixtures/DataTableFixture.vue'
import DataTableReorderFixture from './fixtures/DataTableReorderFixture.vue'
import DataTableExpansionFixture from './fixtures/DataTableExpansionFixture.vue'
import DataTableVirtualizeFixture from './fixtures/DataTableVirtualizeFixture.vue'
import DataTableDateSortFixture from './fixtures/DataTableDateSortFixture.vue'

function headerCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.ui-datatable-th'))
}
// Excludes the single empty/loading placeholder row (one <td> spanning
// colCount) — real data rows always have exactly `columns.length` <td>s and
// never carry the --empty/--loading modifier.
function bodyRows(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('.ui-datatable-tbody .ui-datatable-tr'),
  ).filter((tr) => !tr.querySelector('.ui-datatable-td--empty, .ui-datatable-td--loading'))
}

// <Column> registers itself with DataTable by mounting (its setup() calls
// registerColumn synchronously) — but DataTable's OWN thead/tbody v-for
// already read `columns.value` during ITS single synchronous render call,
// which happens BEFORE any of its children (the just-declared <Column>s)
// have mounted. The registration mutates a ref DataTable's render tracked,
// which schedules a re-render on Vue's microtask scheduler — same "children
// register into a parent-owned array" tick as RadioGroup/Radio's provide,
// just newly observable here because DataTable's own template reads that
// array. Invisible in a real browser (microtasks flush before paint); every
// test below waits one tick after render() before touching column-derived
// DOM, exactly like a consumer's own `onMounted` + `await nextTick()` would.
async function renderTable(props: {
  rowCount?: number
  loading?: boolean
  selectable?: boolean
  builtinSelectable?: boolean
  selectionMode?: 'checkbox' | 'row'
  single?: boolean
  showStatusColumn?: boolean
  scrollHeight?: string
  stackedBreakpoint?: string
  rows?: number
  initialPage?: number
  size?: 'sm' | 'md' | 'lg'
  stripedRows?: boolean
  showGridlines?: boolean
  resizableColumns?: boolean
  frozenColumns?: number
  manualSort?: boolean
  lazy?: boolean
  total?: number
}) {
  const screen = render(DataTableFixture, { props })
  await nextTick()
  return screen
}

test('renders one row per data item with the right cell text', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false })
  const rows = bodyRows(screen.container)
  expect(rows.length).toBe(3)
  expect(rows[0]!.textContent).toContain('Alice')
  expect(rows[1]!.textContent).toContain('Bob')
})

test('a non-sortable column renders plain text with no sort button or aria-sort', async () => {
  const screen = await renderTable({ rowCount: 3 })
  const statusHeader = headerCells(screen.container).find((th) =>
    th.textContent?.includes('Status'),
  )!
  expect(statusHeader.querySelector('.ui-datatable-sort-button')).toBeNull()
  expect(statusHeader.getAttribute('aria-sort')).toBeNull()
})

test('clicking a sortable header cycles none -> asc -> desc -> none and reorders rows', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  expect(nameHeader.getAttribute('aria-sort')).toBe('none')

  const sortButton = nameHeader.querySelector<HTMLElement>('.ui-datatable-sort-button')!
  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(nameHeader.getAttribute('aria-sort')).toBe('ascending'))
  // Fixture data is already alphabetical (Alice, Bob, Charlie, Dana), so an
  // ascending sort doesn't visibly reorder — the aria-sort assertion above
  // is the real signal for this step; descending (next) proves reordering.
  let rows = bodyRows(screen.container)
  expect(rows[0]!.textContent).toContain('Alice')

  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(nameHeader.getAttribute('aria-sort')).toBe('descending'))
  rows = bodyRows(screen.container)
  expect(rows[0]!.textContent).toContain('Dana')
  expect(rows[3]!.textContent).toContain('Alice')

  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(nameHeader.getAttribute('aria-sort')).toBe('none'))
  rows = bodyRows(screen.container)
  expect(rows[0]!.textContent).toContain('Alice')
})

test('the sort chevron rotates via data-state as the column cycles sort directions', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const sortButton = nameHeader.querySelector<HTMLElement>('.ui-datatable-sort-button')!
  const chevron = sortButton.querySelector<HTMLElement>('.ui-datatable-sort-chevron')!
  expect(chevron.getAttribute('data-state')).toBe('none')

  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(chevron.getAttribute('data-state')).toBe('asc'))

  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(chevron.getAttribute('data-state')).toBe('desc'))
})

test('sorting a Date column orders chronologically, not by weekday name', async () => {
  const screen = render(DataTableDateSortFixture, {})
  await nextTick()
  const container = screen.container

  const idOf = (index: number) => bodyRows(container)[index]!.querySelector('td')!.textContent

  const header = headerCells(container).find((th) => th.textContent?.includes('Joined'))!
  const sortButton = header.querySelector<HTMLElement>('.ui-datatable-sort-button')!
  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(header.getAttribute('aria-sort')).toBe('ascending'))

  // A naive string-coerced sort ('Tue' < 'Mon') would put 'later' first.
  expect(idOf(0)).toBe('earlier')
  expect(idOf(1)).toBe('later')
})

test('sorting by Age (a different column) resets Name back to unsorted', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false })
  const [nameHeader, ageHeader] = headerCells(screen.container).filter((th) =>
    th.querySelector('.ui-datatable-sort-button'),
  )
  await userEvent.click(nameHeader!.querySelector('.ui-datatable-sort-button')!)
  await vi.waitFor(() => expect(nameHeader!.getAttribute('aria-sort')).toBe('ascending'))

  await userEvent.click(ageHeader!.querySelector('.ui-datatable-sort-button')!)
  await vi.waitFor(() => expect(ageHeader!.getAttribute('aria-sort')).toBe('ascending'))
  expect(nameHeader!.getAttribute('aria-sort')).toBe('none')
})

test('Enter on a focused sort button toggles sort the same as a click', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const sortButton = nameHeader.querySelector<HTMLElement>('.ui-datatable-sort-button')!
  sortButton.focus()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(nameHeader.getAttribute('aria-sort')).toBe('ascending'))
})

test('a #cell slot override renders custom content instead of the raw value', async () => {
  const screen = await renderTable({ rowCount: 2 })
  const cells = screen.container.querySelectorAll('[data-testid="status-cell"]')
  expect(cells.length).toBe(2)
  expect(cells[0]!.textContent).toBe('ACTIVE')
  expect(cells[1]!.textContent).toBe('INACTIVE')
})

test('a #header slot override renders custom header content instead of the label', async () => {
  const screen = await renderTable({ rowCount: 2 })
  await expect.element(screen.getByTestId('status-header')).toHaveTextContent('Status*')
})

test('empty state renders the #empty slot when data sorts to zero rows', async () => {
  const screen = await renderTable({ rowCount: 0 })
  await expect.element(screen.getByTestId('empty-slot')).toBeInTheDocument()
  expect(bodyRows(screen.container).length).toBe(0)
})

test('loading renders the #loading slot instead of rows, even with data present', async () => {
  const screen = await renderTable({ rowCount: 3, loading: true })
  await expect.element(screen.getByTestId('loading-slot')).toBeInTheDocument()
  expect(bodyRows(screen.container).length).toBe(0)
})

test('loading takes priority over the empty state when there is no data yet', async () => {
  const screen = await renderTable({ rowCount: 0, loading: true })
  await expect.element(screen.getByTestId('loading-slot')).toBeInTheDocument()
  expect(screen.container.querySelector('[data-testid="empty-slot"]')).toBeNull()
})

test('#toolbar scoped slot receives live selected/count and #footer receives sorted data', async () => {
  const screen = await renderTable({ rowCount: 3, selectable: true })
  await expect.element(screen.getByTestId('toolbar-count')).toHaveTextContent('3')
  await expect.element(screen.getByTestId('footer-count')).toHaveTextContent('3')
  await expect.element(screen.getByTestId('toolbar-selected')).toHaveTextContent('0')

  const firstCheckbox = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="select-p0"]',
  )!
  await userEvent.click(firstCheckbox)
  await expect.element(screen.getByTestId('toolbar-selected')).toHaveTextContent('1')
})

test('selection composed via useDataTableContext: toggling a row sets data-selected and emits resolved rows', async () => {
  const screen = await renderTable({ rowCount: 3, selectable: true })
  const rows = bodyRows(screen.container)
  const firstCheckbox = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="select-p0"]',
  )!
  expect(firstCheckbox.checked).toBe(false)

  await userEvent.click(firstCheckbox)
  await vi.waitFor(() => expect(rows[0]!.getAttribute('data-selected')).not.toBeNull())
  expect(firstCheckbox.checked).toBe(true)
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('1')

  // Toggling again deselects.
  await userEvent.click(firstCheckbox)
  await vi.waitFor(() => expect(rows[0]!.getAttribute('data-selected')).toBeNull())
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('0')
})

test('clicking a row cell fires row-click with the row', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false })
  const rows = bodyRows(screen.container)
  await userEvent.click(rows[1]!.querySelector('.ui-datatable-td')!)
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('last-clicked')).toHaveTextContent('Bob')
})

test('clicking the selection checkbox does not also fire row-click', async () => {
  const screen = await renderTable({ rowCount: 3, selectable: true })
  const firstCheckbox = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="select-p0"]',
  )!
  await userEvent.click(firstCheckbox)
  await vi.waitFor(() => expect(firstCheckbox.checked).toBe(true))
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('0')
})

test('column registration/unregistration: toggling a <Column> v-if adds/removes its header and cells live', async () => {
  const screen = await renderTable({ rowCount: 2, showStatusColumn: true })
  expect(headerCells(screen.container).some((th) => th.textContent?.includes('Status'))).toBe(true)
  expect(screen.container.querySelectorAll('[data-testid="status-cell"]').length).toBe(2)

  await screen.rerender({ rowCount: 2, showStatusColumn: false })
  await vi.waitFor(() => {
    expect(headerCells(screen.container).some((th) => th.textContent?.includes('Status'))).toBe(
      false,
    )
  })
  expect(screen.container.querySelectorAll('[data-testid="status-cell"]').length).toBe(0)

  await screen.rerender({ rowCount: 2, showStatusColumn: true })
  await vi.waitFor(() => {
    expect(headerCells(screen.container).some((th) => th.textContent?.includes('Status'))).toBe(
      true,
    )
  })
})

test('selectable renders a built-in leading checkbox column', async () => {
  const screen = await renderTable({
    rowCount: 3,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  expect(
    screen.container.querySelector('.ui-datatable-th--select .ui-checkbox-input'),
  ).not.toBeNull()
  expect(
    screen.container.querySelectorAll('.ui-datatable-td--select .ui-checkbox-input').length,
  ).toBe(3)
})

test('selectable is off by default: no built-in checkbox column renders', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false })
  expect(screen.container.querySelector('.ui-datatable-th--select')).toBeNull()
  expect(screen.container.querySelector('.ui-datatable-td--select')).toBeNull()
})

test('the built-in select-all header checkbox computes checked/indeterminate/none from sortedData vs selected', async () => {
  const screen = await renderTable({
    rowCount: 3,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  const headerCheckbox = screen.container.querySelector<HTMLInputElement>(
    '.ui-datatable-th--select .ui-checkbox-input',
  )!
  const rowCheckboxes = Array.from(
    screen.container.querySelectorAll<HTMLInputElement>(
      '.ui-datatable-td--select .ui-checkbox-input',
    ),
  )
  expect(headerCheckbox.checked).toBe(false)
  expect(headerCheckbox.indeterminate).toBe(false)

  await userEvent.click(rowCheckboxes[0]!)
  await vi.waitFor(() => expect(headerCheckbox.indeterminate).toBe(true))
  expect(headerCheckbox.checked).toBe(false)

  await userEvent.click(rowCheckboxes[1]!)
  await userEvent.click(rowCheckboxes[2]!)
  await vi.waitFor(() => expect(headerCheckbox.checked).toBe(true))
  expect(headerCheckbox.indeterminate).toBe(false)

  await userEvent.click(headerCheckbox)
  await vi.waitFor(() => expect(headerCheckbox.checked).toBe(false))
  expect(rowCheckboxes.every((cb) => !cb.checked)).toBe(true)
})

test('clicking the built-in select-all header checkbox selects/deselects every sortedData row and emits update:selection', async () => {
  const screen = await renderTable({
    rowCount: 3,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  const headerCheckbox = screen.container.querySelector<HTMLInputElement>(
    '.ui-datatable-th--select .ui-checkbox-input',
  )!
  await userEvent.click(headerCheckbox)
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('3')

  await userEvent.click(headerCheckbox)
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('0')
})

test('clicking a built-in row checkbox emits the SAME update:selection event the toggleSelect path emits', async () => {
  const screen = await renderTable({
    rowCount: 3,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  const rows = bodyRows(screen.container)
  const rowCheckbox = rows[0]!.querySelector<HTMLInputElement>('.ui-checkbox-input')!

  await userEvent.click(rowCheckbox)
  await vi.waitFor(() => expect(rows[0]!.getAttribute('data-selected')).not.toBeNull())
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('1')

  await userEvent.click(rowCheckbox)
  await vi.waitFor(() => expect(rows[0]!.getAttribute('data-selected')).toBeNull())
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('0')
})

test('clicking a built-in row checkbox does not also fire row-click (same interactive-target guard)', async () => {
  const screen = await renderTable({
    rowCount: 3,
    builtinSelectable: true,
    showStatusColumn: false,
  })
  const rowCheckbox = screen.container.querySelector<HTMLInputElement>(
    '.ui-datatable-td--select .ui-checkbox-input',
  )!
  await userEvent.click(rowCheckbox)
  await vi.waitFor(() => expect(rowCheckbox.checked).toBe(true))
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('0')
})

test('scrollHeight is unset by default: a single combined table, no body-scroll wrapper', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false })
  expect(screen.container.querySelector('.ui-datatable-scroll-y')).toBeNull()
  expect(screen.container.querySelectorAll('.ui-datatable-table').length).toBe(1)
  // A single table means <thead> and <tbody> are siblings inside it.
  const table = screen.container.querySelector('.ui-datatable-table')!
  expect(table.querySelector(':scope > .ui-datatable-thead')).not.toBeNull()
  expect(table.querySelector(':scope > .ui-datatable-tbody')).not.toBeNull()
})

test('scrollHeight splits into a non-scrolling head table + a separately scrollable body table', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, scrollHeight: '200px' })
  // Two real tables now: a head-only one and a body-only one.
  const tables = screen.container.querySelectorAll('.ui-datatable-table')
  expect(tables.length).toBe(2)
  expect(tables[0]!.querySelector('.ui-datatable-thead')).not.toBeNull()
  expect(tables[0]!.querySelector('.ui-datatable-tbody')).toBeNull()
  expect(tables[1]!.querySelector('.ui-datatable-tbody')).not.toBeNull()
  expect(tables[1]!.querySelector('.ui-datatable-thead')).toBeNull()

  // The body table's own scrolling ancestor is `.ui-datatable-scroll-y`, and
  // the header lives OUTSIDE it — this is what actually keeps the native
  // scrollbar's track starting at the body, not overlapping the header, the
  // way a single sticky-<th>-inside-one-scroll-container never quite can.
  const scrollY = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  expect(scrollY).not.toBeNull()
  expect(getComputedStyle(scrollY).overflowY).toBe('auto')
  expect(scrollY.querySelector('.ui-datatable-thead')).toBeNull()
  expect(scrollY.querySelector('.ui-datatable-tbody')).not.toBeNull()
})

test('stackedBreakpoint is unset by default: no data-stacked attribute regardless of viewport', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false })
  expect(screen.container.querySelector('.ui-datatable')!.hasAttribute('data-stacked')).toBe(false)
})

test('stackedBreakpoint wider than the viewport activates the stacked layout with data-label content', async () => {
  const screen = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    stackedBreakpoint: '99999px',
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-datatable')!
  await vi.waitFor(() => expect(root.hasAttribute('data-stacked')).toBe(true))
  const td = screen.container.querySelector<HTMLElement>('.ui-datatable-td')!
  expect(td.getAttribute('data-label')).toBe('Name')
  expect(getComputedStyle(root.querySelector('.ui-datatable-thead')!).display).toBe('none')
})

test('stackedBreakpoint narrower than the viewport leaves the normal table layout active', async () => {
  const screen = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    stackedBreakpoint: '1px',
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-datatable')!
  expect(root.hasAttribute('data-stacked')).toBe(false)
})

test('column order tracks a reactive v-for reorder, not just initial registration order', async () => {
  const screen = render(DataTableReorderFixture, { props: { order: ['a', 'b', 'c'] } })
  await nextTick()
  expect(headerCells(screen.container).map((th) => th.textContent?.trim())).toEqual(['A', 'B', 'C'])
  expect(
    Array.from(screen.container.querySelectorAll<HTMLElement>('.ui-datatable-td')).map((td) =>
      td.textContent?.trim(),
    ),
  ).toEqual(['1', '2', '3'])

  // Same <Column> instances (matched by :key), just patched into new DOM
  // positions — the exact case registerColumn's one-shot push doesn't see.
  await screen.rerender({ order: ['c', 'b', 'a'] })
  await vi.waitFor(() => {
    expect(headerCells(screen.container).map((th) => th.textContent?.trim())).toEqual([
      'C',
      'B',
      'A',
    ])
  })
  expect(
    Array.from(screen.container.querySelectorAll<HTMLElement>('.ui-datatable-td')).map((td) =>
      td.textContent?.trim(),
    ),
  ).toEqual(['3', '2', '1'])

  await screen.rerender({ order: ['b', 'a', 'c'] })
  await vi.waitFor(() => {
    expect(headerCells(screen.container).map((th) => th.textContent?.trim())).toEqual([
      'B',
      'A',
      'C',
    ])
  })
})

test('exposes the root element via defineExpose', async () => {
  const screen = await renderTable({ rowCount: 2 })
  await expect.element(screen.getByTestId('exposed-el')).toHaveTextContent('yes')
})

// -------------------------------------------------------------- Pagination
test('rows unset (default): footer reports page 1/pageCount 1/the full row count, every row renders', async () => {
  const screen = await renderTable({ rowCount: 5, showStatusColumn: false })
  await expect.element(screen.getByTestId('footer-page')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('footer-page-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('footer-total')).toHaveTextContent('5')
  expect(bodyRows(screen.container).length).toBe(5)
})

test('rows set: slices sortedData into pages and the footer reports the real page count/total', async () => {
  const screen = await renderTable({ rowCount: 5, showStatusColumn: false, rows: 2 })
  expect(bodyRows(screen.container).length).toBe(2)
  const rows = bodyRows(screen.container)
  expect(rows[0]!.textContent).toContain('Alice')
  expect(rows[1]!.textContent).toContain('Bob')
  await expect.element(screen.getByTestId('footer-page')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('footer-page-count')).toHaveTextContent('3')
  await expect.element(screen.getByTestId('footer-total')).toHaveTextContent('5')
})

test('rows set: a middle v-model:page shows that slice of rows', async () => {
  const screen = await renderTable({
    rowCount: 5,
    showStatusColumn: false,
    rows: 2,
    initialPage: 2,
  })
  const rows = bodyRows(screen.container)
  expect(rows.length).toBe(2)
  expect(rows[0]!.textContent).toContain('Charlie')
  expect(rows[1]!.textContent).toContain('Dana')
})

test('rows set: the last page renders the remainder, fewer than a full page', async () => {
  const screen = await renderTable({
    rowCount: 5,
    showStatusColumn: false,
    rows: 2,
    initialPage: 3,
  })
  const rows = bodyRows(screen.container)
  expect(rows.length).toBe(1)
  expect(rows[0]!.textContent).toContain('Eve')
})

// -------------------------------------------------------------- size
test('size defaults to md; sm/lg add the corresponding modifier class to the root', async () => {
  const md = await renderTable({ rowCount: 2, showStatusColumn: false })
  expect(md.container.querySelector('.ui-datatable')!.classList.contains('ui-datatable--md')).toBe(
    true,
  )
  const sm = await renderTable({ rowCount: 2, showStatusColumn: false, size: 'sm' })
  expect(sm.container.querySelector('.ui-datatable')!.classList.contains('ui-datatable--sm')).toBe(
    true,
  )
  const lg = await renderTable({ rowCount: 2, showStatusColumn: false, size: 'lg' })
  expect(lg.container.querySelector('.ui-datatable')!.classList.contains('ui-datatable--lg')).toBe(
    true,
  )
})

test('size changes real cell padding density: sm is tighter than lg', async () => {
  const sm = await renderTable({ rowCount: 2, showStatusColumn: false, size: 'sm' })
  const lg = await renderTable({ rowCount: 2, showStatusColumn: false, size: 'lg' })
  const smPadding = parseFloat(
    getComputedStyle(bodyRows(sm.container)[0]!.querySelector('.ui-datatable-td')!).paddingTop,
  )
  const lgPadding = parseFloat(
    getComputedStyle(bodyRows(lg.container)[0]!.querySelector('.ui-datatable-td')!).paddingTop,
  )
  expect(smPadding).toBeLessThan(lgPadding)
})

// -------------------------------------------------------------- stripedRows
test('stripedRows adds the modifier class and tints alternating rows; selected still wins over the stripe', async () => {
  const screen = await renderTable({
    rowCount: 4,
    showStatusColumn: false,
    stripedRows: true,
    builtinSelectable: true,
  })
  expect(
    screen.container.querySelector('.ui-datatable')!.classList.contains('ui-datatable--striped'),
  ).toBe(true)
  const rows = bodyRows(screen.container)
  const oddBg = getComputedStyle(rows[0]!.querySelector('.ui-datatable-td')!).backgroundColor
  const evenBg = getComputedStyle(rows[1]!.querySelector('.ui-datatable-td')!).backgroundColor
  expect(evenBg).not.toBe(oddBg)

  // Selecting the un-striped row swaps its background to the selected tint —
  // still distinct from the plain background it started with.
  const checkbox = rows[0]!.querySelector<HTMLInputElement>('.ui-checkbox-input')!
  await userEvent.click(checkbox)
  await vi.waitFor(() => {
    const selectedBg = getComputedStyle(rows[0]!.querySelector('.ui-datatable-td')!).backgroundColor
    expect(selectedBg).not.toBe(oddBg)
  })
})

// -------------------------------------------------------------- showGridlines
test('showGridlines adds a visible column (inline-end) border between cells', async () => {
  const off = await renderTable({ rowCount: 2, showStatusColumn: false })
  const on = await renderTable({ rowCount: 2, showStatusColumn: false, showGridlines: true })
  expect(
    off.container.querySelector('.ui-datatable')!.classList.contains('ui-datatable--gridlines'),
  ).toBe(false)
  expect(
    on.container.querySelector('.ui-datatable')!.classList.contains('ui-datatable--gridlines'),
  ).toBe(true)
  const tdOff = bodyRows(off.container)[0]!.querySelector('.ui-datatable-td')!
  const tdOn = bodyRows(on.container)[0]!.querySelector('.ui-datatable-td')!
  expect(getComputedStyle(tdOff).borderInlineEndStyle).toBe('none')
  expect(getComputedStyle(tdOn).borderInlineEndStyle).toBe('solid')
})

// -------------------------------------------------------------- selectionMode / single
test("selectionMode 'row': clicking anywhere on a row selects it, with no checkbox column at all", async () => {
  const screen = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
  })
  expect(screen.container.querySelector('.ui-datatable-th--select')).toBeNull()
  const rows = bodyRows(screen.container)
  await userEvent.click(rows[0]!.querySelector('.ui-datatable-td')!)
  await vi.waitFor(() => expect(rows[0]!.getAttribute('data-selected')).not.toBeNull())
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('1')
  // Same click still fires row-click too — reusing onRowClick's one guard,
  // not inventing a second interaction path.
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('1')
})

test("selectionMode 'checkbox' (default): a row click alone does not select it", async () => {
  const screen = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
  })
  const rows = bodyRows(screen.container)
  await userEvent.click(rows[0]!.querySelector('.ui-datatable-td')!)
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('1')
  expect(rows[0]!.getAttribute('data-selected')).toBeNull()
})

test("selectionMode 'row' puts a pointer cursor on every row; 'checkbox' mode doesn't", async () => {
  const rowMode = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
  })
  const rowModeRows = bodyRows(rowMode.container)
  expect(rowModeRows.every((tr) => tr.classList.contains('ui-datatable-tr--clickable'))).toBe(true)
  expect(getComputedStyle(rowModeRows[0]!).cursor).toBe('pointer')

  const checkboxMode = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    builtinSelectable: true,
  })
  expect(
    bodyRows(checkboxMode.container).some((tr) =>
      tr.classList.contains('ui-datatable-tr--clickable'),
    ),
  ).toBe(false)
})

test('single: renders a real Radio per row instead of a Checkbox, with no header select-all control', async () => {
  const screen = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
    single: true,
  })
  const radios = screen.container.querySelectorAll<HTMLInputElement>(
    '.ui-datatable-td--select .ui-radio-input',
  )
  expect(radios.length).toBe(3)
  expect(screen.container.querySelector('.ui-datatable-th--select .ui-checkbox-input')).toBeNull()
})

test('single: at most one row is ever selected — picking a new row deselects the previous one', async () => {
  const screen = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
    single: true,
  })
  const rows = bodyRows(screen.container)
  const radios = screen.container.querySelectorAll<HTMLInputElement>(
    '.ui-datatable-td--select .ui-radio-input',
  )

  await userEvent.click(radios[0]!)
  await vi.waitFor(() => expect(rows[0]!.getAttribute('data-selected')).not.toBeNull())
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('1')

  await userEvent.click(radios[1]!)
  await vi.waitFor(() => expect(rows[1]!.getAttribute('data-selected')).not.toBeNull())
  expect(rows[0]!.getAttribute('data-selected')).toBeNull()
  await expect.element(screen.getByTestId('selection-change-count')).toHaveTextContent('1')
})

// -------------------------------------------------------------- resizableColumns
test('resizable is off by default: no resize handle renders on any header', async () => {
  const screen = await renderTable({ rowCount: 2, showStatusColumn: false })
  expect(screen.container.querySelector('.ui-datatable-resize-handle')).toBeNull()
})

test('resizableColumns: dragging the trailing handle changes and keeps the column width', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, resizableColumns: true })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const handle = nameHeader.querySelector<HTMLElement>('.ui-datatable-resize-handle')!
  expect(handle).not.toBeNull()
  const startWidth = nameHeader.getBoundingClientRect().width

  const rect = handle.getBoundingClientRect()
  const startX = rect.left + rect.width / 2
  const pointerId = 1
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: rect.top,
      pointerId,
      bubbles: true,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: startX + 60,
      clientY: rect.top,
      pointerId,
      bubbles: true,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointerup', {
      clientX: startX + 60,
      clientY: rect.top,
      pointerId,
      bubbles: true,
    }),
  )

  await vi.waitFor(() => {
    expect(nameHeader.getBoundingClientRect().width).toBeGreaterThan(startWidth + 40)
  })
  const settledWidth = nameHeader.getBoundingClientRect().width
  // Stays put after the drag ends — not reset by some later render pass.
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(nameHeader.getBoundingClientRect().width).toBe(settledWidth)
})

// -------------------------------------------------------------- frozenColumns (Tier 2)
test('frozenColumns is 0 by default: no column is sticky', async () => {
  const screen = await renderTable({ rowCount: 2, showStatusColumn: false })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  expect(getComputedStyle(nameHeader).position).not.toBe('sticky')
})

test('frozenColumns freezes the first N columns (sticky-left) and leaves the rest alone', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, frozenColumns: 1 })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const ageHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Age'))!
  await vi.waitFor(() => expect(getComputedStyle(nameHeader).position).toBe('sticky'))
  expect(nameHeader.classList.contains('ui-datatable-th--frozen')).toBe(true)
  expect(getComputedStyle(ageHeader).position).not.toBe('sticky')
  expect(ageHeader.classList.contains('ui-datatable-th--frozen')).toBe(false)
})

// -------------------------------------------------------------- #expansion (Tier 2)
function expansionScreen(props?: { stackedBreakpoint?: string }): Promise<RenderResult<unknown>> {
  const screen = render(DataTableExpansionFixture, { props })
  return nextTick().then(() => screen)
}

test('row expansion: a chevron toggle reveals/hides the #expansion row for that row only', async () => {
  const screen = await expansionScreen()
  expect(screen.container.querySelector('[data-testid="expansion-p0"]')).toBeNull()

  const expandButtons = Array.from(
    screen.container.querySelectorAll<HTMLElement>('.ui-datatable-td--expand button'),
  )
  expect(expandButtons.length).toBe(3)

  await userEvent.click(expandButtons[0]!)
  await expect.element(screen.getByTestId('expansion-p0')).toHaveTextContent('Alice')
  expect(screen.container.querySelector('[data-testid="expansion-p1"]')).toBeNull()

  await userEvent.click(expandButtons[0]!)
  await vi.waitFor(() => {
    expect(screen.container.querySelector('[data-testid="expansion-p0"]')).toBeNull()
  })
})

test('row expansion: stacked mode always shows expansion content inline, with no toggle column', async () => {
  const screen = await expansionScreen({ stackedBreakpoint: '99999px' })
  await vi.waitFor(() => {
    expect(screen.container.querySelector('.ui-datatable')!.hasAttribute('data-stacked')).toBe(true)
  })
  expect(screen.container.querySelector('.ui-datatable-td--expand')).toBeNull()
  expect(screen.container.querySelector('[data-testid="expansion-p0"]')).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="expansion-p1"]')).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="expansion-p2"]')).not.toBeNull()
})

// -------------------------------------------------------------- v-model:sort
test('v-model:sort reflects every header click: field/dir update in the parent, not just internal aria-sort', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const sortButton = nameHeader.querySelector<HTMLElement>('.ui-datatable-sort-button')!

  await expect.element(screen.getByTestId('sort-field')).toHaveTextContent('')
  await userEvent.click(sortButton)
  await expect.element(screen.getByTestId('sort-field')).toHaveTextContent('name')
  await expect.element(screen.getByTestId('sort-dir')).toHaveTextContent('asc')

  await userEvent.click(sortButton)
  await expect.element(screen.getByTestId('sort-dir')).toHaveTextContent('desc')

  await userEvent.click(sortButton)
  await expect.element(screen.getByTestId('sort-field')).toHaveTextContent('')
})

// -------------------------------------------------------------- manualSort
test('manualSort: a header click updates v-model:sort/aria-sort but never reorders the given data itself', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false, manualSort: true })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const sortButton = nameHeader.querySelector<HTMLElement>('.ui-datatable-sort-button')!
  const originalOrder = bodyRows(screen.container).map((tr) => tr.textContent)

  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(nameHeader.getAttribute('aria-sort')).toBe('ascending'))
  await expect.element(screen.getByTestId('sort-dir')).toHaveTextContent('asc')
  // The consumer owns re-fetching sorted data under manualSort — DataTable
  // must not silently sort what it was handed.
  expect(bodyRows(screen.container).map((tr) => tr.textContent)).toEqual(originalOrder)

  await userEvent.click(sortButton)
  await vi.waitFor(() => expect(nameHeader.getAttribute('aria-sort')).toBe('descending'))
  expect(bodyRows(screen.container).map((tr) => tr.textContent)).toEqual(originalOrder)
})

// -------------------------------------------------------------- lazy
test('lazy: data is rendered as-is (no client slicing) and the footer total/page-count come from `total`, not data.length', async () => {
  const screen = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    lazy: true,
    rows: 10,
    total: 47,
  })
  // Only the 2 rows actually handed to `data` render — lazy never slices further.
  expect(bodyRows(screen.container).length).toBe(2)
  await expect.element(screen.getByTestId('footer-total')).toHaveTextContent('47')
  await expect.element(screen.getByTestId('footer-page-count')).toHaveTextContent('5')
})

test('lazy without total falls back to data.length for the footer total', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, lazy: true, rows: 10 })
  await expect.element(screen.getByTestId('footer-total')).toHaveTextContent('3')
  await expect.element(screen.getByTestId('footer-page-count')).toHaveTextContent('1')
})

// -------------------------------------------------------------- virtualize
test('virtualize: renders only a window of rows (+ spacers) for a large dataset, not every row', async () => {
  const screen = render(DataTableVirtualizeFixture, { props: { rowCount: 2000 } })
  await nextTick()
  await vi.waitFor(() => {
    const rendered = screen.container.querySelectorAll('[data-virtual-index]').length
    expect(rendered).toBeGreaterThan(0)
    expect(rendered).toBeLessThan(100)
  })
  // Two spacer rows (top + bottom) bound the rendered window.
  expect(screen.container.querySelectorAll('.ui-datatable-tr--spacer').length).toBe(2)
})

test('virtualize: scrolling the container windows in later rows', async () => {
  const screen = render(DataTableVirtualizeFixture, { props: { rowCount: 2000 } })
  await nextTick()
  await expect.element(screen.getByTestId('exposed-el')).toBeInTheDocument()

  const scrollEl = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  scrollEl.scrollTop = 20000
  scrollEl.dispatchEvent(new Event('scroll'))

  await vi.waitFor(() => {
    const indices = Array.from(
      screen.container.querySelectorAll<HTMLElement>('[data-virtual-index]'),
    ).map((el) => Number(el.getAttribute('data-virtual-index')))
    expect(Math.max(...indices)).toBeGreaterThan(200)
  })
})

test('virtualize: reach-end fires once the window nears the last row, then re-arms only when data grows', async () => {
  const screen = render(DataTableVirtualizeFixture, { props: { rowCount: 8, virtualize: true } })
  await nextTick()
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-end-count').element().textContent).toBe('1')
  })

  await screen.rerender({ rowCount: 10, virtualize: true })
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-end-count').element().textContent).toBe('2')
  })
})

test('virtualize is off by default: every row renders with no spacer rows', async () => {
  const screen = await renderTable({ rowCount: 5, showStatusColumn: false })
  expect(screen.container.querySelectorAll('.ui-datatable-tr--spacer').length).toBe(0)
  expect(bodyRows(screen.container).length).toBe(5)
})
