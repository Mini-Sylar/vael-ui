import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Sortable from '../src/components/Sortable/Sortable.vue'
import { useSortableGroup } from '../src/composables/useSortableGroup'

const frame = () => new Promise(requestAnimationFrame)
async function probe(colStyle: string, mode: 'element' | 'clone', toCol: number) {
  const cols = [
    ref([
      { value: 'a1', label: 'A one' },
      { value: 'a2', label: 'A two' },
    ]),
    ref([
      { value: 'b1', label: 'B one' },
      { value: 'b2', label: 'B two' },
    ]),
  ]
  const board = useSortableGroup({ onTransfer: () => {} })
  const screen = await render(() =>
    h(
      'div',
      { style: 'display:flex; gap:16px; padding:20px' },
      cols.map((c, i) => {
        const list = h(Sortable as never, {
          items: c.value,
          group: board,
          groupId: `c${i}`,
          previewMode: mode,
          motion: false,
        })
        return h('div', { class: 'col', style: `inline-size: 200px; ${colStyle}` }, list)
      }),
    ),
  )
  const handle = screen.container.querySelector<HTMLElement>('.ui-sortable-handle')!
  const target = screen.container
    .querySelectorAll<HTMLElement>('.ui-sortable')
    [toCol]!.getBoundingClientRect()
  const b = handle.getBoundingClientRect()
  const x0 = b.left + b.width / 2,
    y0 = b.top + b.height / 2
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 41,
      button: 0,
      clientX: x0,
      clientY: y0,
    }),
  )
  const x1 = target.left + 60,
    y1 = target.top + 10
  for (const [x, y] of [
    [x0 + 12, y0],
    [x1, y1],
  ]) {
    window.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 41, clientX: x, clientY: y }),
    )
    await frame()
  }
  await frame()
  // What's dragged ignores the pointer; let it be hit for this one reading of the paint order.
  const moving = [
    ...document.querySelectorAll<HTMLElement>('[data-dragging], [data-sortable-preview]'),
  ]
  const style = document.createElement('style')
  style.textContent =
    '[data-dragging], [data-sortable-preview], [data-dragging] *, [data-sortable-preview] * { pointer-events: auto !important }'
  document.head.append(style)
  const top = document.elementFromPoint(x1, y1)
  style.remove()
  const info = moving
    .map(
      (m) =>
        `${m.hasAttribute('data-sortable-preview') ? 'preview' : 'row'}@${m.parentElement?.className}`,
    )
    .join('+')
  const onTop = !!top?.closest('[data-dragging], [data-sortable-preview]')
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 41 }))
  screen.unmount()
  return `${colStyle || 'plain'}/${mode}/col${toCol}: ${onTop ? 'ON TOP' : 'BEHIND ' + top?.className} [${info}]`
}
// Columns that each make their own stacking (a z-index, a transform, isolation) must not paint
// over a card dragged out of the one before, in either preview mode.
test('a card dragged across grouped columns paints above them, whatever their stacking', async () => {
  const out: string[] = []
  for (const st of [
    'overflow-y: auto; block-size: 120px',
    'position: relative; z-index: 0',
    'transform: translateZ(0)',
    'isolation: isolate',
  ])
    for (const mode of ['element', 'clone'] as const) out.push(await probe(st, mode, 1))
  for (const line of out) expect(line).toContain('ON TOP')
})
