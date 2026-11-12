import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Sortable from '../src/components/Sortable/Sortable.vue'
import { useSortableGroup } from '../src/composables/useSortableGroup'
const frame = () => new Promise(requestAnimationFrame)
const PROPS = [
  'backgroundColor',
  'borderTopWidth',
  'borderTopColor',
  'paddingTop',
  'paddingLeft',
  'color',
  'fontSize',
  'borderRadius',
  'boxShadow',
] as const
test.each(['card', 'plain'] as const)(
  'a row lifted across lists keeps its look, and drops the lift on release (%s)',
  async (variant) => {
    const cols = [ref([{ value: 'a1', label: 'A one' }]), ref([{ value: 'b1', label: 'B one' }])]
    const board = useSortableGroup({ onTransfer: () => {} })
    const screen = await render(() =>
      h(
        'div',
        { style: 'display:flex; gap:16px; padding:20px' },
        cols.map((c, i) =>
          h(
            'div',
            { style: 'inline-size: 200px; isolation: isolate' },
            h(Sortable as never, {
              items: c.value,
              group: board,
              groupId: `c${i}`,
              previewMode: 'element',
              variant,
              motion: false,
              class: 'my-list',
              ui: { item: 'my-row' },
            }),
          ),
        ),
      ),
    )
    const style = document.createElement('style')
    style.textContent = '.my-row { color: rgb(200, 0, 0); border-radius: 12px; }'
    document.head.append(style)
    const row = screen.container.querySelector<HTMLElement>('.ui-sortable-item')!
    const before = Object.fromEntries(PROPS.map((p) => [p, getComputedStyle(row)[p]]))
    const handle = row.querySelector<HTMLElement>('.ui-sortable-handle')!
    const b = handle.getBoundingClientRect()
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 61,
        button: 0,
        clientX: b.left + 4,
        clientY: b.top + 4,
      }),
    )
    const t = screen.container
      .querySelectorAll<HTMLElement>('.ui-sortable')[1]!
      .getBoundingClientRect()
    for (const [x, y] of [
      [b.left + 20, b.top + 4],
      [t.left + 60, t.top + 10],
    ]) {
      window.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 61, clientX: x, clientY: y }),
      )
      await frame()
    }
    expect(row.matches(':popover-open')).toBe(true)
    const during = Object.fromEntries(PROPS.map((p) => [p, getComputedStyle(row)[p]]))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 61 }))
    style.remove()
    // The grabbed look adds a shadow and the primary border; everything else stays.
    const { boxShadow: _a, borderTopColor: _b, ...restBefore } = before
    const { boxShadow: _c, borderTopColor: _d, ...restDuring } = during
    expect(restDuring).toEqual(restBefore)
    await frame()
    // Dropped (a transfer the page didn't apply): the row is back to its own look.
    expect(row.hasAttribute('data-sortable-lifted')).toBe(false)
    expect(row.matches(':popover-open')).toBe(false)
  },
)
