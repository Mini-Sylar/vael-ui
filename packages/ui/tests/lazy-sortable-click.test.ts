import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DataTableFixture from './fixtures/DataTableFixture.vue'

// The drag engine arrives 300ms late here, like a slow network, to cover presses made before it.
const engine = vi.hoisted(() => ({ loads: 0 }))
vi.mock('../src/composables/useSortable', async (importOriginal) => {
  engine.loads++
  await new Promise((resolve) => setTimeout(resolve, 300))
  return importOriginal()
})
const ENGINE_DELAY = 400

function headers(screen: RenderResult<unknown>): HTMLElement[] {
  return Array.from(
    screen.container.querySelectorAll<HTMLElement>('.ui-datatable-th[data-column-field]'),
  )
}
const fields = (screen: RenderResult<unknown>) =>
  headers(screen).map((th) => th.dataset.columnField)

function press(th: HTMLElement, pointerId: number) {
  const box = th.getBoundingClientRect()
  th.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 8,
      clientY: box.top + box.height / 2,
    }),
  )
}
function moveOver(target: HTMLElement, pointerId: number) {
  const dest = target.getBoundingClientRect()
  const y = dest.top + dest.height / 2
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      clientX: dest.left + dest.width * 0.75,
      clientY: y,
    }),
  )
}
const release = (pointerId: number) =>
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))

test('a click made before the engine arrives does not turn into a drag', async () => {
  const screen = await render(DataTableFixture, {
    props: { reorderableColumns: true, showStatusColumn: false },
    global: { stubs: { 'transition-group': false } },
  })
  const [first, second] = headers(screen)
  press(first!, 32)
  release(32)
  await new Promise((resolve) => setTimeout(resolve, ENGINE_DELAY))
  moveOver(second!, 32)
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  expect(fields(screen)).toEqual(['name', 'age'])
})
