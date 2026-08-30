import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DataTableFixture from './fixtures/DataTableFixture.vue'

async function renderTable(props: Record<string, unknown> = {}) {
  const screen = render(DataTableFixture, {
    props: { reorderableColumns: true, showStatusColumn: false, ...props },
    global: { stubs: { 'transition-group': false } },
  })
  await nextTick()
  return screen
}
function headerFields(screen: RenderResult<unknown>): string[] {
  return Array.from(
    screen.container.querySelectorAll<HTMLElement>('.ui-datatable-th[data-column-field]'),
  ).map((th) => th.dataset.columnField!)
}

/**
 * Horizontal synthetic drag from one header to past another's midpoint.
 * Driven by real geometry — a fixed pixel delta silently under-shoots
 * whenever the columns lay out wider than assumed.
 */
function dragHeaderOver(th: HTMLElement, target: HTMLElement, pointerId = 21) {
  const box = th.getBoundingClientRect()
  const dest = target.getBoundingClientRect()
  const y = box.top + box.height / 2
  const toX = dest.left + dest.width * 0.75
  th.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 8,
      clientY: y,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId, clientX: toX, clientY: y }),
  )
  return () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
}
function headerEls(screen: RenderResult<unknown>): HTMLElement[] {
  return Array.from(
    screen.container.querySelectorAll<HTMLElement>('.ui-datatable-th[data-column-field]'),
  )
}

test('reorderableColumns marks headers as draggable for assistive tech', async () => {
  const screen = await renderTable()
  const th = screen.container.querySelector<HTMLElement>('.ui-datatable-th[data-column-field]')!
  expect(th.getAttribute('aria-roledescription')).toBe('draggable column')
})

test('columns are not draggable unless opted in', async () => {
  const screen = await renderTable({ reorderableColumns: false })
  const th = screen.container.querySelector<HTMLElement>('.ui-datatable-th[data-column-field]')!
  expect(th.getAttribute('aria-roledescription')).toBeNull()
  const release = dragHeaderOver(th, th, 22)
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  release()
})

test('dragging a header sideways reorders the columns and emits the new order', async () => {
  const screen = await renderTable()
  expect(headerFields(screen)).toEqual(['name', 'age'])

  const first = screen.container.querySelector<HTMLElement>('.ui-datatable-th[data-column-field]')!
  const [, second] = headerEls(screen)
  const release = dragHeaderOver(first, second!, 23)
  expect(document.querySelector('[data-sortable-preview]')).not.toBeNull()
  release()

  await vi.waitFor(() => expect(headerFields(screen)).toEqual(['age', 'name']))
  expect(screen.container.querySelector('[data-testid="column-order"]')!.textContent).toBe(
    'age,name',
  )
})

test('the reordered columns survive a re-render rather than snapping back to DOM order', async () => {
  const screen = await renderTable()
  const [first, second] = headerEls(screen)
  dragHeaderOver(first!, second!, 24)()
  await vi.waitFor(() => expect(headerFields(screen)).toEqual(['age', 'name']))

  // resortColumnsByDom runs on every update; a manual order must outrank it.
  await nextTick()
  await nextTick()
  expect(headerFields(screen)).toEqual(['age', 'name'])
})

test('body cells follow the reordered header, not the declaration order', async () => {
  const screen = await renderTable()
  const [firstTh, secondTh] = headerEls(screen)
  dragHeaderOver(firstTh!, secondTh!, 25)()
  await vi.waitFor(() => expect(headerFields(screen)).toEqual(['age', 'name']))

  const firstRow = screen.container.querySelector('.ui-datatable-tbody .ui-datatable-tr')!
  const cells = Array.from(firstRow.querySelectorAll('.ui-datatable-td'))
  // Age is numeric, name is text — the first cell must now be the age.
  expect(cells[0]!.textContent!.trim()).toMatch(/^\d+$/)
})

test('a grip affordance renders only on reorderable columns', async () => {
  const on = await renderTable()
  expect(on.container.querySelectorAll('.ui-datatable-th-grip').length).toBe(2)

  const off = await renderTable({ reorderableColumns: false })
  expect(off.container.querySelectorAll('.ui-datatable-th-grip').length).toBe(0)
})

test('canDrop rejecting a target blocks the reorder, on top of the built-in pinned-column check', async () => {
  const screen = await renderTable({ canDrop: () => false })
  const [first, second] = headerEls(screen)
  dragHeaderOver(first!, second!, 26)()
  await new Promise((r) => setTimeout(r, 50))
  expect(headerFields(screen)).toEqual(['name', 'age'])
})

test('beforeDrop resolving false cancels the reorder without an error', async () => {
  const screen = await renderTable({ beforeDrop: () => Promise.resolve(false) })
  const [first, second] = headerEls(screen)
  dragHeaderOver(first!, second!, 27)()
  await new Promise((r) => setTimeout(r, 50))
  expect(headerFields(screen)).toEqual(['name', 'age'])
  expect(screen.container.querySelector('[data-testid="drop-error-count"]')!.textContent).toBe('0')
})

test('beforeDrop rejecting cancels the reorder and fires drop-error', async () => {
  const screen = await renderTable({ beforeDrop: () => Promise.reject(new Error('boom')) })
  const [first, second] = headerEls(screen)
  dragHeaderOver(first!, second!, 29)()
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[data-testid="drop-error-count"]')!.textContent).toBe(
      '1',
    ),
  )
  expect(headerFields(screen)).toEqual(['name', 'age'])
})

test('previewMode "clone" (the default) floats a separate copy, real header hidden until drop', async () => {
  const screen = await renderTable({ previewMode: 'clone' })
  const [first, second] = headerEls(screen)
  const release = dragHeaderOver(first!, second!, 30)
  const preview = document.querySelector<HTMLElement>('[data-sortable-preview]')
  expect(preview).not.toBeNull()
  expect(getComputedStyle(preview!).position).toBe('fixed')
  expect(getComputedStyle(first!).visibility).toBe('hidden')
  release()
})

// Not a recommended combination (see previewMode's own doc comment on this
// prop) — only asserting the one thing that's actually safe about it: the
// real header does lift mid-drag, same as it would on Sortable/Tree.
test('previewMode "element" lifts the real header itself mid-drag', async () => {
  const screen = await renderTable({ previewMode: 'element' })
  const [first, second] = headerEls(screen)
  const release = dragHeaderOver(first!, second!, 28)
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  expect(getComputedStyle(first!).position).toBe('fixed')
  release()
})

test('dragging the middle of three columns shifts the far one by the dragged width, not double it', async () => {
  // Regression: dragging a column that originally sat between the two other
  // remaining columns used to double-count its width in the shift, sliding
  // the far column's text into its neighbour's.
  const screen = await renderTable({ showStatusColumn: true })
  const [name, age, status] = headerEls(screen)
  expect(headerFields(screen)).toEqual(['name', 'age', 'status'])

  const nameRectBefore = name!.getBoundingClientRect()
  const ageWidth = age!.getBoundingClientRect().width
  const release = dragHeaderOver(age!, status!, 26)
  await vi.waitFor(() => expect(status!.style.translate).not.toBe(''))
  // The shift is spring-driven, not instant — let it settle before reading it.
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Untouched — must not have moved at all.
  expect(name!.getBoundingClientRect().left).toBeCloseTo(nameRectBefore.left, 0)
  // Status closes the gap age left behind — by age's own width (plus a
  // near-zero border gap), never by roughly double that.
  const shifted = -parseFloat(status!.style.translate)
  expect(shifted).toBeGreaterThan(ageWidth - 5)
  expect(shifted).toBeLessThan(ageWidth + 5)

  release()
})

test('columnGripVisibility defaults to always — visible at rest', async () => {
  const always = await renderTable()
  const grip = always.container.querySelector<HTMLElement>('.ui-datatable-th-grip')!
  expect(getComputedStyle(grip).opacity).toBe('1')
})

test('columnGripVisibility="hover" is invisible until interacted with', async () => {
  const hover = await renderTable({ columnGripVisibility: 'hover' })
  const grip = hover.container.querySelector<HTMLElement>('.ui-datatable-th-grip')!
  expect(getComputedStyle(grip).opacity).toBe('0')
})
