// Rows leaving or arriving slide the rest, and the table's box eases its height with them: a group
// folding never leaves its rows hanging past a box that already shrank, where they'd be clipped.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import type { Component } from 'vue'
import DataTable from '../src/components/DataTable/DataTable.vue'

const all = Array.from({ length: 8 }, (_, i) => ({ id: i, name: `Person ${i}` }))

async function watchEdge(change: () => void) {
  let worst = -Infinity
  change()
  for (let frame = 0; frame < 30; frame++) {
    await new Promise(requestAnimationFrame)
    // The scroll strip clips the rows.
    const table = document.querySelector<HTMLElement>('.ui-datatable-scroll-x')!
    const rows = [...table.querySelectorAll<HTMLElement>('tbody tr')].filter(
      (row) => getComputedStyle(row).display !== 'none',
    )
    const last = rows.at(-1)!
    worst = Math.max(
      worst,
      last.getBoundingClientRect().bottom - table.getBoundingClientRect().bottom,
    )
  }
  return worst
}

test('a group folding and unfolding keeps its last row inside the table', async () => {
  const data = shallowRef(all)
  render(
    () =>
      h(
        DataTable as Component,
        { data: data.value, rowKey: (row: { id: number }) => row.id, 'aria-label': 'People' },
        {
          columns: ({ Column }: { Column: Component }) => [
            h(Column, { field: 'name', label: 'Name' }),
          ],
        },
      ),
    // Real row transitions: the slide and the leaving rows are what's measured.
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
  await new Promise((r) => setTimeout(r, 300))
  // Rows 1 to 3 fold away (a group), the rest slide up.
  expect(
    await watchEdge(() => (data.value = all.filter((row) => row.id === 0 || row.id > 3))),
  ).toBeLessThan(2)
  await new Promise((r) => setTimeout(r, 300))
  // And open again: no empty band under rows sliding down, and nothing past the edge.
  expect(await watchEdge(() => (data.value = all))).toBeLessThan(2)
})
