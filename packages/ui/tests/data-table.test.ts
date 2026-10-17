import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeAll, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import { render } from 'vitest-browser-vue'
import { loadSortableEngine } from '../src/composables/useLazySortable'
import type { RenderResult } from 'vitest-browser-vue'
import DataTableFixture from './fixtures/DataTableFixture.vue'
import DataTableReorderFixture from './fixtures/DataTableReorderFixture.vue'
import DataTableExpansionFixture from './fixtures/DataTableExpansionFixture.vue'
import DataTableVirtualizeFixture from './fixtures/DataTableVirtualizeFixture.vue'
import DataTableDateSortFixture from './fixtures/DataTableDateSortFixture.vue'
import type { UiPartValue } from '../src/classes'

// DataTable loads the drag engine on demand. Loading it up front means a test can drag as soon as
// the table renders.
beforeAll(() => loadSortableEngine())

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
  scrollFade?: boolean
  manualSort?: boolean
  lazy?: boolean
  total?: number
  motionCss?: boolean
  ui?: Partial<{
    root: UiPartValue
    toolbar: UiPartValue
    table: UiPartValue
    thead: UiPartValue
    th: UiPartValue
    sortButton: UiPartValue
    grip: UiPartValue
    resizeHandle: UiPartValue
    tbody: UiPartValue
    tr: UiPartValue
    td: UiPartValue
    expansionRow: UiPartValue
    expansionContent: UiPartValue
    footer: UiPartValue
  }>
}) {
  // Vue Test Utils auto-stubs transition-group by default (a <transition-group-stub>
  // custom element, not the real `tag`). Harmless for most components, but DataTable's
  // rows genuinely need a real <tbody> for correct table layout — disabled here so
  // these tests exercise the same DOM shape a real browser renders.
  const screen = await render(DataTableFixture, {
    props,
    global: { stubs: { 'transition-group': false } },
  })
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

test('motionCss=false disables the row-move CSS transition (not just enter/leave)', async () => {
  // Vue's TransitionGroup only gates enter/leave on the `css` prop — the move
  // (FLIP) animation is driven purely by whether `.ui-datatable-row-move`
  // resolves an actual transition, so DataTableBody has to disable that CSS
  // rule itself via data-motion="off" for motionCss="false" to have any
  // effect on a real reorder.
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false, motionCss: false })
  const tbody = screen.container.querySelector('.ui-datatable-tbody')!
  expect(tbody.getAttribute('data-motion')).toBe('off')

  // Same detection Vue's own TransitionGroup uses internally (hasCSSTransform):
  // probe the actual resolved transition for the move class, since it's only
  // ever applied transiently by Vue during a real reorder.
  const probe = document.createElement('tr')
  probe.className = 'ui-datatable-row-move'
  tbody.appendChild(probe)
  const duration = getComputedStyle(probe).transitionDuration
  probe.remove()
  expect(duration).toBe('0s')
})

test('motionCss=true (default) leaves the row-move CSS transition active once settled', async () => {
  const screen = await renderTable({ rowCount: 4, showStatusColumn: false })
  const tbody = screen.container.querySelector('.ui-datatable-tbody')!
  expect(tbody.getAttribute('data-motion')).toBeNull()
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
  const screen = await render(DataTableDateSortFixture, {
    global: { stubs: { 'transition-group': false } },
  })
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

test('defaults: md size, one combined table, every row on one page, no select/resize/sticky/stacked/virtual extras', async () => {
  const screen = await renderTable({ rowCount: 5, showStatusColumn: false })
  const root = screen.container.querySelector('.ui-datatable')!
  expect(root.classList.contains('ui-datatable--md')).toBe(true)
  expect(root.hasAttribute('data-stacked')).toBe(false)

  expect(screen.container.querySelector('.ui-datatable-th--select')).toBeNull()
  expect(screen.container.querySelector('.ui-datatable-td--select')).toBeNull()
  expect(screen.container.querySelector('.ui-datatable-resize-handle')).toBeNull()
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  expect(getComputedStyle(nameHeader).position).not.toBe('sticky')

  expect(screen.container.querySelector('.ui-datatable-scroll-y')).toBeNull()
  expect(screen.container.querySelectorAll('.ui-datatable-table').length).toBe(1)
  // A single table means <thead> and <tbody> are siblings inside it.
  const table = screen.container.querySelector('.ui-datatable-table')!
  expect(table.querySelector(':scope > .ui-datatable-thead')).not.toBeNull()
  expect(table.querySelector(':scope > .ui-datatable-tbody')).not.toBeNull()

  expect(screen.container.querySelectorAll('.ui-datatable-tr--spacer').length).toBe(0)
  expect(bodyRows(screen.container).length).toBe(5)
  await expect.element(screen.getByTestId('footer-page')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('footer-page-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('footer-total')).toHaveTextContent('5')
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
  const screen = await render(DataTableReorderFixture, {
    props: { order: ['a', 'b', 'c'] },
    global: { stubs: { 'transition-group': false } },
  })
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
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  expect(nameHeader.getBoundingClientRect().width).toBe(settledWidth)
})

// -------------------------------------------------------------- frozenColumns (Tier 2)
test('frozenColumns freezes the first N columns (sticky-left) and leaves the rest alone', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, frozenColumns: 1 })
  const nameHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Name'))!
  const ageHeader = headerCells(screen.container).find((th) => th.textContent?.includes('Age'))!
  await vi.waitFor(() => expect(getComputedStyle(nameHeader).position).toBe('sticky'))
  expect(nameHeader.classList.contains('ui-datatable-th--frozen')).toBe(true)
  expect(getComputedStyle(ageHeader).position).not.toBe('sticky')
  expect(ageHeader.classList.contains('ui-datatable-th--frozen')).toBe(false)
})

test('scrollFade fades an overflowing table by default, and can be turned off', async () => {
  const narrow = { root: { style: 'width: 120px' } }
  const off = await renderTable({ rowCount: 2, scrollFade: false, ui: narrow })
  const offScroller = off.container.querySelector('.ui-datatable-scroll-x')!
  expect(offScroller.scrollWidth).toBeGreaterThan(offScroller.clientWidth)
  expect(offScroller.classList.contains('scroll-fade-x')).toBe(false)
  off.unmount()

  const on = await renderTable({ rowCount: 2, ui: narrow })
  const scroller = on.container.querySelector('.ui-datatable-scroll-x')!
  await vi.waitFor(() => expect(scroller.classList.contains('scroll-fade-x')).toBe(true))
})

test('scrollFade with frozen columns fades only the right edge', async () => {
  const screen = await renderTable({
    rowCount: 2,
    frozenColumns: 1,
    scrollFade: true,
    ui: { root: { style: 'width: 120px' } },
  })
  const scroller = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-x')!
  await vi.waitFor(() => expect(scroller.classList.contains('scroll-fade-x')).toBe(true))
  expect(getComputedStyle(scroller).maskImage).not.toContain('transparent 0%')
  expect(
    getComputedStyle(scroller).maskImage.startsWith('linear-gradient(to right, rgb(0, 0, 0)'),
  ).toBe(true)
})

// ------------------------------------------------- scrollHeight + overflowing columns
// 22rem of columns in a 200px table, so both split tables overflow sideways.
const narrowSplit = { scrollHeight: '160px', ui: { root: { style: 'width: 200px' } } }

function expectColumnsAligned(container: HTMLElement) {
  const ths = headerCells(container)
  const tds = Array.from(bodyRows(container)[0]!.querySelectorAll<HTMLElement>('.ui-datatable-td'))
  expect(tds.length).toBe(ths.length)
  ths.forEach((th, i) => {
    const head = th.getBoundingClientRect()
    const cell = tds[i]!.getBoundingClientRect()
    expect(Math.abs(head.left - cell.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(head.right - cell.right)).toBeLessThanOrEqual(1)
  })
}

test('scrollHeight with overflowing columns keeps head and body columns aligned while scrolling', async () => {
  const screen = await renderTable({ rowCount: 20, ...narrowSplit })
  const body = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  await vi.waitFor(() => expect(bodyRows(screen.container).length).toBe(20))
  const ths = headerCells(screen.container)
  const lastTh = ths[ths.length - 1]!
  // The outer box never scrolls itself, so it's a fixed reference.
  const left = screen.container
    .querySelector('.ui-datatable-scroll-x')!
    .getBoundingClientRect().left

  await userEvent.wheel(body, { delta: { x: 60 } })
  await vi.waitFor(() => {
    expect(ths[0]!.getBoundingClientRect().left).toBeLessThan(left - 10)
    expectColumnsAligned(screen.container)
  })

  await userEvent.wheel(body, { delta: { x: 1000 } })
  await vi.waitFor(() => {
    // Scrolled all the way: the last column ends at the body's visible edge.
    const bodyRect = body.getBoundingClientRect()
    const visibleRight = bodyRect.left + body.clientLeft + body.clientWidth
    expect(Math.abs(lastTh.getBoundingClientRect().right - visibleRight)).toBeLessThanOrEqual(1)
    expectColumnsAligned(screen.container)
  })
})

test('scrollHeight with frozen columns keeps the frozen body cells put while scrolling sideways', async () => {
  const screen = await renderTable({ rowCount: 20, frozenColumns: 1, ...narrowSplit })
  const body = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  await vi.waitFor(() => expect(bodyRows(screen.container).length).toBe(20))
  const nameTh = headerCells(screen.container)[0]!
  const nameTd = () =>
    bodyRows(screen.container)[0]!.querySelector<HTMLElement>('.ui-datatable-td')!
  const ageTh = headerCells(screen.container)[1]!
  const left = screen.container
    .querySelector('.ui-datatable-scroll-x')!
    .getBoundingClientRect().left
  const ageLeftBefore = ageTh.getBoundingClientRect().left

  // Scrolling from the header, then from the body.
  for (const target of [nameTh, body]) {
    await userEvent.wheel(target, { delta: { x: target === body ? 1000 : 50 } })
    await vi.waitFor(() => {
      expect(ageTh.getBoundingClientRect().left).toBeLessThan(ageLeftBefore - 10)
      expect(Math.abs(nameTh.getBoundingClientRect().left - left)).toBeLessThanOrEqual(1)
      expect(Math.abs(nameTd().getBoundingClientRect().left - left)).toBeLessThanOrEqual(1)
      expectColumnsAligned(screen.container)
    })
  }
})

test('scrollHeight: the header strip follows the body, and a sideways wheel on it scrolls the body', async () => {
  const screen = await renderTable({ rowCount: 20, ...narrowSplit })
  const body = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  await vi.waitFor(() => expect(bodyRows(screen.container).length).toBe(20))
  const head = screen.container.querySelector<HTMLElement>('.ui-datatable-head-scroll')!
  expect(head).not.toBeNull()

  body.scrollLeft = 40
  await vi.waitFor(() => expect(head.scrollLeft).toBe(body.scrollLeft))
  expect(body.scrollLeft).toBeGreaterThan(0)

  await userEvent.wheel(head, { delta: { x: 30 } })
  await vi.waitFor(() => expect(body.scrollLeft).toBeGreaterThan(40))
  await vi.waitFor(() => expect(head.scrollLeft).toBe(body.scrollLeft))
})

test('scrollHeight fades the body both ways and the head strip sideways', async () => {
  const screen = await renderTable({ rowCount: 20, frozenColumns: 1, ...narrowSplit })
  const body = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  const head = screen.container.querySelector<HTMLElement>('.ui-datatable-head-scroll')!
  await vi.waitFor(() => {
    expect(body.classList.contains('scroll-fade')).toBe(true)
    expect(body.classList.contains('scroll-fade-x')).toBe(true)
    expect(head.classList.contains('scroll-fade-x')).toBe(true)
  })
  const bodyMask = getComputedStyle(body).maskImage
  // The vertical fade (serialized without "to bottom") and the sideways one, under two solid
  // layers that keep the body's scrollbars out of the fade.
  expect(bodyMask).toContain('linear-gradient(rgba(0, 0, 0, 0) 0%')
  // Frozen columns: the sideways fade is right-edge only, in the body and the head.
  expect(bodyMask).toContain('linear-gradient(to right, rgb(0, 0, 0)')
  expect(
    getComputedStyle(head).maskImage.startsWith('linear-gradient(to right, rgb(0, 0, 0)'),
  ).toBe(true)
  expect(screen.container.querySelector('.ui-datatable-scroll-x')!.classList).not.toContain(
    'scroll-fade-x',
  )
})

// -------------------------------------------------------------- #expansion (Tier 2)
async function expansionScreen(props?: {
  stackedBreakpoint?: string
}): Promise<RenderResult<unknown>> {
  const screen = await render(DataTableExpansionFixture, {
    props,
    global: { stubs: { 'transition-group': false } },
  })
  await nextTick()
  return screen
}

test('row expansion: a chevron toggle reveals/hides the #expansion row for that row only', async () => {
  const screen = await expansionScreen()
  expect(screen.container.querySelector('[data-testid="expansion-p0"]')).toBeNull()

  const expandButtons = Array.from(
    screen.container.querySelectorAll<HTMLElement>('.ui-datatable-td--expand button'),
  )
  expect(expandButtons.length).toBe(3)

  await userEvent.click(expandButtons[0]!)
  await expect.element(screen.getByTestId('expansion-p0')).toMatchTextContent('Alice')
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
  const screen = await render(DataTableVirtualizeFixture, { props: { rowCount: 2000 } })
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
  const screen = await render(DataTableVirtualizeFixture, { props: { rowCount: 2000 } })
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
  const screen = await render(DataTableVirtualizeFixture, {
    props: { rowCount: 8, virtualize: true },
  })
  await nextTick()
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-end-count').element().textContent).toBe('1')
  })

  await screen.rerender({ rowCount: 10, virtualize: true })
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-end-count').element().textContent).toBe('2')
  })
})

test('ui prop overrides root/th/td classes, same convention as every other component', async () => {
  const screen = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    ui: { root: 'custom-root', th: 'custom-th', td: 'custom-td' },
  })
  const root = screen.container.querySelector('.ui-datatable')!
  expect(root.classList.contains('custom-root')).toBe(true)
  for (const th of headerCells(screen.container)) {
    expect(th.classList.contains('custom-th')).toBe(true)
  }
  const tds = screen.container.querySelectorAll('.ui-datatable-td')
  expect(tds.length).toBeGreaterThan(0)
  for (const td of tds) {
    expect(td.classList.contains('custom-td')).toBe(true)
  }
})

// -------------------------------------------------------------- keyboard row selection
test("selectionMode 'row': the body is one Tab stop and arrows/Home/End rove focus between rows", async () => {
  const screen = await renderTable({
    rowCount: 4,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
  })
  const rows = bodyRows(screen.container)
  expect(rows.map((tr) => tr.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
  expect(rows.every((tr) => tr.getAttribute('aria-selected') === 'false')).toBe(true)

  rows[0]!.focus()
  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(rows[1])
  await vi.waitFor(() => expect(rows[1]!.getAttribute('tabindex')).toBe('0'))
  expect(rows[0]!.getAttribute('tabindex')).toBe('-1')

  await userEvent.keyboard('{End}')
  expect(document.activeElement).toBe(rows[3])
  await userEvent.keyboard('{Home}')
  expect(document.activeElement).toBe(rows[0])
  await userEvent.keyboard('{ArrowUp}')
  expect(document.activeElement).toBe(rows[0])
})

test("selectionMode 'row': Space toggles the focused row, Enter selects and fires row-click", async () => {
  const screen = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
  })
  const rows = bodyRows(screen.container)
  rows[1]!.focus()
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(rows[1]!.getAttribute('aria-selected')).toBe('true'))
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('0')
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(rows[1]!.getAttribute('aria-selected')).toBe('false'))

  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(rows[1]!.getAttribute('aria-selected')).toBe('true'))
  await expect.element(screen.getByTestId('row-click-count')).toHaveTextContent('1')
})

test("selectionMode 'row': Shift+Arrow extends the selection; single mode only moves focus", async () => {
  const screen = await renderTable({
    rowCount: 4,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
  })
  const rows = bodyRows(screen.container)
  rows[0]!.focus()
  await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}')
  await vi.waitFor(() =>
    expect(rows.map((tr) => tr.getAttribute('aria-selected'))).toEqual([
      'true',
      'true',
      'true',
      'false',
    ]),
  )
  expect(document.activeElement).toBe(rows[2])

  const single = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
    single: true,
  })
  const singleRows = bodyRows(single.container)
  singleRows[0]!.focus()
  await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
  expect(document.activeElement).toBe(singleRows[1])
  expect(singleRows.every((tr) => tr.getAttribute('aria-selected') === 'false')).toBe(true)
})

test("selectionMode 'row': the Tab stop lands on the selected row, and checkbox mode rows aren't focusable", async () => {
  const screen = await renderTable({
    rowCount: 3,
    showStatusColumn: false,
    builtinSelectable: true,
    selectionMode: 'row',
  })
  const rows = bodyRows(screen.container)
  await userEvent.click(rows[2]!.querySelector('.ui-datatable-td')!)
  ;(document.activeElement as HTMLElement | null)?.blur()
  await vi.waitFor(() => expect(rows[2]!.getAttribute('tabindex')).toBe('0'))

  const checkbox = await renderTable({
    rowCount: 2,
    showStatusColumn: false,
    builtinSelectable: true,
  })
  const checkboxRows = bodyRows(checkbox.container)
  expect(checkboxRows.every((tr) => !tr.hasAttribute('tabindex'))).toBe(true)
  expect(checkboxRows.every((tr) => tr.getAttribute('aria-selected') === 'false')).toBe(true)
})

test('rows carry no aria-selected when selection is off', async () => {
  const screen = await renderTable({ rowCount: 2, showStatusColumn: false })
  expect(bodyRows(screen.container).some((tr) => tr.hasAttribute('aria-selected'))).toBe(false)
})

test("virtualize + selectionMode 'row': End focuses the last row even though it starts outside the window", async () => {
  const screen = await render(DataTableVirtualizeFixture, {
    props: { rowCount: 500, selectable: true },
  })
  await nextTick()
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[data-virtual-index="0"]')).not.toBeNull(),
  )
  const first = screen.container.querySelector<HTMLElement>('[data-virtual-index="0"]')!
  expect(first.getAttribute('tabindex')).toBe('0')
  first.focus()
  await userEvent.keyboard('{End}')
  await vi.waitFor(() =>
    expect((document.activeElement as HTMLElement).getAttribute('data-row-key')).toBe('r499'),
  )
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() =>
    expect((document.activeElement as HTMLElement).getAttribute('data-row-key')).toBe('r498'),
  )
})

test('row expansion: the toggle carries aria-expanded and aria-controls pointing at the expansion row', async () => {
  const screen = await render(DataTableExpansionFixture, {
    global: { stubs: { 'transition-group': false } },
  })
  await nextTick()
  const button = screen.container.querySelector<HTMLElement>('.ui-datatable-td--expand button')!
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(button.hasAttribute('aria-controls')).toBe(false)
  await userEvent.click(button)
  await vi.waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('true'))
  const controls = button.getAttribute('aria-controls')!
  const target = document.getElementById(controls)!
  expect(target.tagName).toBe('TR')
  expect(target.querySelector('[data-testid="expansion-p0"]')).not.toBeNull()
})

test('without a box-sizing reset, a column width includes its cells padding', async () => {
  // The test page has no app-wide box-sizing reset. In a table too narrow for its columns, each
  // column sits at its declared width, which must include the cells' padding, as with a reset.
  const screen = await renderTable({ rowCount: 3, ui: { root: { style: 'width: 120px' } } })
  await vi.waitFor(() => expect(bodyRows(screen.container).length).toBe(3))
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
  const name = bodyRows(screen.container)[0]!.querySelector<HTMLElement>('.ui-datatable-td')!
  expect(name.getBoundingClientRect().width).toBeCloseTo(8 * rem, 0)
})

test('scrollHeight: a column without a width keeps a minimum instead of shrinking to nothing', async () => {
  const { h } = await import('vue')
  const { default: DataTable } = await import('../src/components/DataTable/DataTable.vue')
  const data = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Row ${i}`, note: 'A note' }))
  const screen = await render(
    () =>
      h(
        DataTable as never,
        { data, rowKey: 'id', ...narrowSplit },
        {
          columns: ({ Column }: { Column: never }) => [
            h(Column, { field: 'name', label: 'Name', width: '8rem' }),
            h(Column, { field: 'note', label: 'Note' }),
          ],
        },
      ),
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
  await vi.waitFor(() => expect(bodyRows(screen.container).length).toBe(5))
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
  await vi.waitFor(() => {
    expect(headerCells(screen.container)[1]!.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      8 * rem - 1,
    )
    expectColumnsAligned(screen.container)
  })
})

test('a scrollHeight body with nothing focusable in it is reachable by keyboard', async () => {
  const screen = await renderTable({ rowCount: 12, showStatusColumn: false, scrollHeight: '120px' })
  const body = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  await vi.waitFor(() => expect(body.getAttribute('tabindex')).toBe('0'))
})

test('the single-select column header still has a name for screen readers', async () => {
  const screen = await renderTable({
    rowCount: 2,
    builtinSelectable: true,
    selectionMode: 'checkbox',
    single: true,
  })
  const th = screen.container.querySelector<HTMLElement>('.ui-datatable-th--select')!
  expect(th.textContent?.trim()).toBe('Select row')
})

test('the expand column header has a name, so its toggle cells have a header', async () => {
  const screen = await expansionScreen()
  const th = screen.container.querySelector<HTMLElement>('.ui-datatable-th--expand')!
  expect(th.hasAttribute('aria-hidden')).toBe(false)
  expect(th.textContent?.trim()).toBe('Expand row')
})

test('scrollHeight still reads as one table: body cells sit under the head row', async () => {
  const screen = await renderTable({ rowCount: 3, showStatusColumn: false, scrollHeight: '200px' })
  // The two <table> elements are layout only; the wrapper is the table assistive tech sees.
  expect(screen.container.querySelectorAll('[role="table"]')).toHaveLength(1)
  for (const table of screen.container.querySelectorAll('table'))
    expect(table.getAttribute('role')).toBe('presentation')
  await expect.element(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
  await expect.element(screen.getByRole('cell', { name: 'Alice' })).toBeInTheDocument()
  expect(screen.getByRole('row').all().length).toBeGreaterThanOrEqual(4)
})

test('a focusable scroll strip in the split layout is a rowgroup, not a stray child of the table', async () => {
  const screen = await renderTable({ rowCount: 12, showStatusColumn: false, scrollHeight: '120px' })
  const body = screen.container.querySelector<HTMLElement>('.ui-datatable-scroll-y')!
  await vi.waitFor(() => expect(body.getAttribute('tabindex')).toBe('0'))
  expect(body.getAttribute('role')).toBe('rowgroup')
  expect(screen.container.querySelector('.ui-datatable-head-scroll')!.getAttribute('role')).toBe(
    'rowgroup',
  )
})
