import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DataTableFixture from './fixtures/DataTableFixture.vue'
import SortableFixture from './fixtures/SortableFixture.vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'
import Separator from '../src/components/Separator/Separator.vue'
import Resizable from '../src/components/Resizable/Resizable.vue'
import SwipeToReveal from '../src/components/SwipeToReveal/SwipeToReveal.vue'
import PullToRefresh from '../src/components/PullToRefresh/PullToRefresh.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

const tableGlobal = { stubs: { 'transition-group': false } }

async function renderTable(props: Record<string, unknown>, dir: 'ltr' | 'rtl' = 'ltr') {
  const screen = await render(
    { render: () => h('div', { dir }, [h(DataTableFixture, props)]) },
    { global: tableGlobal },
  )
  await nextTick()
  await nextTick()
  return screen
}
function status(container: HTMLElement): string {
  return container.querySelector('.ui-datatable-status')!.textContent!
}
function header(container: HTMLElement, label: string): HTMLElement {
  return Array.from(container.querySelectorAll<HTMLElement>('.ui-datatable-th')).find((th) =>
    th.textContent?.includes(label),
  )!
}

// 1. Selectable tables are grids; row checkboxes are named after their row.
test('DataTable: a selectable table is a grid, and each row checkbox is named after its row', async () => {
  const screen = await renderTable({ builtinSelectable: true, showStatusColumn: false })
  const grid = screen.getByRole('grid')
  await expect.element(grid).toBeInTheDocument()
  expect(grid.element().getAttribute('aria-multiselectable')).toBe('true')
  await expect
    .element(screen.getByRole('checkbox', { name: 'Select row Alice', exact: true }))
    .toBeInTheDocument()
  await expect
    .element(screen.getByRole('checkbox', { name: 'Select row Bob', exact: true }))
    .toBeInTheDocument()
  // aria-selected sits on rows of the grid.
  expect(grid.element().querySelectorAll('tbody tr[aria-selected="false"]')).toHaveLength(4)
})

test('DataTable: the split layout is a grid of gridcells when rows select', async () => {
  const split = await renderTable({
    builtinSelectable: true,
    selectionMode: 'row',
    single: true,
    showStatusColumn: false,
    scrollHeight: '200px',
  })
  const splitGrid = split.getByRole('grid')
  await expect.element(splitGrid).toBeInTheDocument()
  expect(splitGrid.element().hasAttribute('aria-multiselectable')).toBe(false)
  await expect.element(split.getByRole('gridcell', { name: 'Alice' })).toBeInTheDocument()
})

test('DataTable: a table without selection stays a table', async () => {
  const plain = await renderTable({ showStatusColumn: false })
  expect(plain.container.querySelector('[role="grid"]')).toBeNull()
})

// 2a. Keyboard column resize.
test('DataTable: the resize handle is a focusable separator that ArrowLeft and ArrowRight resize', async () => {
  const screen = await renderTable({ resizableColumns: true, showStatusColumn: false })
  const nameHeader = header(screen.container, 'Name')
  const handle = screen.getByRole('separator', { name: 'Resize Name' })
  await expect.element(handle).toBeInTheDocument()
  const start = Math.round(nameHeader.getBoundingClientRect().width)
  await vi.waitFor(() => expect(handle.element().getAttribute('aria-valuenow')).toBe(String(start)))

  ;(handle.element() as HTMLElement).focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() =>
    expect(handle.element().getAttribute('aria-valuenow')).toBe(String(start + 16)),
  )
  expect(nameHeader.getBoundingClientRect().width).toBeGreaterThan(start)
  expect(status(screen.container)).toBe(`Name: ${start + 16} pixels`)
  expect(document.activeElement).toBe(handle.element())

  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
  await vi.waitFor(() =>
    expect(handle.element().getAttribute('aria-valuenow')).toBe(String(start - 16)),
  )
})

test('DataTable: right to left, ArrowLeft grows a column from its resize handle', async () => {
  const screen = await renderTable({ resizableColumns: true, showStatusColumn: false }, 'rtl')
  const nameHeader = header(screen.container, 'Name')
  const handle = screen.getByRole('separator', { name: 'Resize Name' }).element() as HTMLElement
  const start = Math.round(nameHeader.getBoundingClientRect().width)
  handle.focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe(String(start + 16)))
  expect(nameHeader.getBoundingClientRect().width).toBeGreaterThan(start)
})

// 2b. Keyboard column reorder.
test('DataTable: Alt + ArrowRight moves a reorderable column, announces it and keeps focus', async () => {
  const screen = await renderTable({ reorderableColumns: true })
  const order = () => screen.getByTestId('column-order').element().textContent
  const nameButton = header(screen.container, 'Name').querySelector<HTMLElement>('button')!
  expect(nameButton.getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowLeft Alt+ArrowRight')
  nameButton.focus()
  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
  await vi.waitFor(() => expect(order()).toBe('age,name,status'))
  expect(status(screen.container)).toBe('Name moved to position 2 of 3.')
  await vi.waitFor(() => expect(document.activeElement).toBe(nameButton))
  // Body cells follow the header.
  const firstRow = screen.container.querySelector('.ui-datatable-tbody .ui-datatable-tr')!
  expect(firstRow.children[1]!.textContent).toContain('Alice')

  // A header with no button of its own is the tab stop.
  const statusHeader = header(screen.container, 'Status')
  expect(statusHeader.getAttribute('tabindex')).toBe('0')
  statusHeader.focus()
  await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}')
  await vi.waitFor(() => expect(order()).toBe('age,status,name'))
  expect(status(screen.container)).toBe('Status moved to position 2 of 3.')
  await vi.waitFor(() => expect(document.activeElement).toBe(statusHeader))
})

test('DataTable: right to left, Alt + ArrowLeft moves a column toward the end', async () => {
  const screen = await renderTable({ reorderableColumns: true }, 'rtl')
  const order = () => screen.getByTestId('column-order').element().textContent
  header(screen.container, 'Name').querySelector<HTMLElement>('button')!.focus()
  await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}')
  await vi.waitFor(() => expect(order()).toBe('age,name,status'))
})

// 3. ScrollArea's name reaches the focusable viewport.
test('ScrollArea: aria-label names the viewport, which becomes a region', async () => {
  const screen = await render(() =>
    h(ScrollArea, { 'aria-label': 'Release notes', style: 'block-size: 80px' }, () =>
      h('p', { style: 'block-size: 400px' }, 'Notes'),
    ),
  )
  const region = screen.getByRole('region', { name: 'Release notes' })
  await expect.element(region).toBeInTheDocument()
  expect(region.element().classList.contains('ui-scroll-area-viewport')).toBe(true)
  await vi.waitFor(() => expect(region.element().getAttribute('tabindex')).toBe('0'))
  expect(screen.container.querySelector('.ui-scroll-area')!.hasAttribute('aria-label')).toBe(false)
})

test('ScrollArea: without a name the viewport is no region', async () => {
  const screen = await render(() => h(ScrollArea, null, () => h('p', 'Notes')))
  expect(screen.container.querySelector('[role="region"]')).toBeNull()
})

// 4. Collapsible's region is named by its trigger.
test('Collapsible: the panel region is named by its trigger', async () => {
  const screen = await render(() =>
    h(
      Collapsible,
      { open: true },
      { trigger: () => h('button', { type: 'button' }, 'Shipping details'), default: () => 'Body' },
    ),
  )
  await expect.element(screen.getByRole('region', { name: 'Shipping details' })).toBeInTheDocument()
})

// 5. A labeled Separator reads its label.
test('Separator: the label names the separator', async () => {
  const screen = await render(() => h(Separator, null, () => 'or continue with'))
  await expect
    .element(screen.getByRole('separator', { name: 'or continue with' }))
    .toBeInTheDocument()
})

// 6. Resizable always has a maximum and a localized default name.
test('Resizable: aria-valuemax is the room the container gives it when there is no max', async () => {
  const screen = await render(() =>
    h('div', { style: 'inline-size: 600px; display: flex' }, [
      h(Resizable, { size: 200 }, () => 'Panel'),
    ]),
  )
  const handle = screen.getByRole('separator', { name: 'Resize' })
  await expect.element(handle).toBeInTheDocument()
  await vi.waitFor(() => expect(handle.element().getAttribute('aria-valuemax')).toBe('600'))

  const bounded = await render(() => h(Resizable, { size: 200, max: 400 }, () => 'Panel'))
  expect(bounded.container.querySelector('[role="separator"]')!.getAttribute('aria-valuemax')).toBe(
    '400',
  )
})

test('Resizable: the default name comes from the messages', async () => {
  const screen = await render(() =>
    h(ConfigProvider, { messages: { resizable: { label: 'Größe ändern' } } }, () =>
      h(Resizable, { size: 200 }, () => 'Panel'),
    ),
  )
  await expect.element(screen.getByRole('separator', { name: 'Größe ändern' })).toBeInTheDocument()
})

// 7. SwipeToReveal: DOM order matches the screen, and Escape closes.
function swipeRow(open = false) {
  const isOpen = ref(open)
  const screen = render(() =>
    h(
      SwipeToReveal,
      { open: isOpen.value, 'onUpdate:open': (value: boolean) => (isOpen.value = value) },
      {
        'leading-actions': () => h('button', { type: 'button' }, 'Pin'),
        default: () => h('button', { type: 'button' }, 'Message from Ada'),
        'trailing-actions': () => h('button', { type: 'button' }, 'Delete'),
      },
    ),
  )
  return { screen, isOpen }
}

test('SwipeToReveal: Tab order matches the screen: leading actions, content, trailing actions', async () => {
  const { screen } = swipeRow()
  const names = Array.from(
    (await screen).container.querySelectorAll('button'),
    (b) => b.textContent,
  )
  expect(names).toEqual(['Pin', 'Message from Ada', 'Delete'])
})

test('SwipeToReveal: Escape closes an open row', async () => {
  const { screen, isOpen } = swipeRow(true)
  const row = (await screen).container.querySelector<HTMLElement>('.ui-swipe-reveal')!
  await vi.waitFor(() => expect(row.getAttribute('data-open-side')).toBe('trailing'))
  row.querySelector<HTMLElement>('.ui-swipe-reveal-content button')!.focus()
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(row.hasAttribute('data-open-side')).toBe(false))
  expect(isOpen.value).toBe(false)
})

// 8. PullToRefresh announces the refresh.
test('PullToRefresh: a polite live region reads Refreshing, then Updated', async () => {
  let finish!: () => void
  const onRefresh = () => new Promise<void>((resolve) => (finish = resolve))
  const pull = ref<{ refresh: () => Promise<void> } | null>(null)
  const screen = await render(() =>
    h(PullToRefresh, { ref: pull, onRefresh }, () => h('p', 'Inbox')),
  )
  const status = screen.container.querySelector<HTMLElement>('[role="status"]')!
  expect(status.getAttribute('aria-live')).toBe('polite')
  expect(status.textContent).toBe('')
  void pull.value!.refresh()
  await vi.waitFor(() => expect(status.textContent).toBe('Refreshing…'))
  finish()
  await vi.waitFor(() => expect(status.textContent).toBe('Updated'))
})

// 9. Sortable: leaving the handle cancels a keyboard grab; a drop keeps focus on the moved item.
function handles(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-sortable-handle'))
}
function sortOrder(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="order"]')!.textContent!
}
function sortLive(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[aria-live="assertive"]')!.textContent!
}

test('Sortable: Tab during a keyboard grab cancels it', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}')
  await userEvent.keyboard('{Tab}')
  expect(sortLive(screen)).toContain('Reordering cancelled')
  expect(document.activeElement).toBe(handles(screen)[1])
  // Space on the next handle grabs it rather than dropping the old one.
  await userEvent.keyboard(' ')
  expect(sortLive(screen)).toContain('Grabbed Bravo')
  await userEvent.keyboard('{Escape}')
  expect(sortOrder(screen)).toBe('a,b,c')
})

test('Sortable: blur during a keyboard grab cancels it', async () => {
  const screen = await render(SortableFixture)
  const handle = handles(screen)[0]!
  handle.focus()
  await userEvent.keyboard(' {ArrowDown}')
  handle.blur()
  await vi.waitFor(() => expect(sortLive(screen)).toContain('Reordering cancelled'))
  await vi.waitFor(() => expect(handle.closest('li')!.style.translate).toBe(''))
  expect(sortOrder(screen)).toBe('a,b,c')
})

test('Sortable: after a keyboard drop, focus is on the moved item handle', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[2]!.focus()
  await userEvent.keyboard(' {ArrowUp}{ArrowUp} ')
  expect(sortOrder(screen)).toBe('c,a,b')
  await vi.waitFor(() =>
    expect(
      document.activeElement?.closest('[data-sortable-item]')?.getAttribute('data-value'),
    ).toBe('c'),
  )
  expect(document.activeElement?.classList.contains('ui-sortable-handle')).toBe(true)
})
