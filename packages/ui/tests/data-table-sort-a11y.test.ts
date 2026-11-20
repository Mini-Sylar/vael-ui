import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { render } from 'vitest-browser-vue'
import DataTable from '../src/components/DataTable/DataTable.vue'
import Column from '../src/components/Column.vue'

const rows = [
  { id: 1, name: 'item 10' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'item 1' },
]

async function renderTable() {
  const screen = await render(
    () =>
      h(
        DataTable as any,
        { data: rows, rowKey: 'id' },
        { columns: () => [h(Column as any, { field: 'name', label: 'Name', sortable: true })] },
      ),
    { global: { stubs: { 'transition-group': false } } },
  )
  await nextTick()
  return screen
}
const cellText = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.ui-datatable-tbody .ui-datatable-td')).map((td) =>
    td.textContent?.trim(),
  )

test('a header click announces the new sort, and only the sorted column carries aria-sort', async () => {
  const screen = await renderTable()
  const th = screen.container.querySelector<HTMLElement>('.ui-datatable-th')!
  const status = screen.container.querySelector('.ui-datatable-status')!
  const button = th.querySelector<HTMLElement>('.ui-datatable-sort-button')!
  expect(th.hasAttribute('aria-sort')).toBe(false)

  await userEvent.click(button)
  await vi.waitFor(() => expect(status.textContent).toBe('Sorted by Name, ascending'))
  expect(th.getAttribute('aria-sort')).toBe('ascending')

  await userEvent.click(button)
  await vi.waitFor(() => expect(status.textContent).toBe('Sorted by Name, descending'))

  await userEvent.click(button)
  await vi.waitFor(() => expect(status.textContent).toBe('Sort cleared'))
  expect(th.hasAttribute('aria-sort')).toBe(false)
})

test('text sorts numerically and ignores case', async () => {
  const screen = await renderTable()
  await userEvent.click(screen.container.querySelector<HTMLElement>('.ui-datatable-sort-button')!)
  await vi.waitFor(() =>
    expect(cellText(screen.container)).toEqual(['item 1', 'Item 2', 'item 10']),
  )
})
