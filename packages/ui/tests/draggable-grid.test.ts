// A v-draggable list whose items wrap onto more lines (a card grid): the cards make room slot to
// slot in reading order, on both axes, and stay inside the grid.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, reactive, withDirectives } from 'vue'
import { useSortableGroup } from '../src/composables/useSortableGroup'
import { vDraggable } from '../src/directives/vDraggable'

const GRID = 'display: grid; grid-template-columns: repeat(3, 60px); gap: 10px; width: 200px'

function cell(item: string) {
  return h('div', { key: item, class: 'cell', 'data-id': item, style: 'height: 40px' }, item)
}

async function drag(from: HTMLElement, to: { x: number; y: number }, release = true) {
  const box = from.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  from.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 5,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  for (let i = 1; i <= 12; i++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 5,
        clientX: x + ((to.x - x) * i) / 12,
        clientY: y + ((to.y - y) * i) / 12,
      }),
    )
    await new Promise(requestAnimationFrame)
  }
  await new Promise((r) => setTimeout(r, 450))
  if (release)
    window.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 5, clientX: to.x, clientY: to.y }),
    )
}

function centre(el: Element) {
  const box = el.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

test('a card dragged across a grid opens its slot in reading order', async () => {
  const items = reactive(['a', 'b', 'c', 'd', 'e', 'f'])
  const screen = await render(() =>
    withDirectives(h('div', { class: 'grid', style: GRID }, items.map(cell)), [
      [vDraggable, { items, axis: 'x' }],
    ]),
  )
  const at = (id: string) => screen.container.querySelector<HTMLElement>(`[data-id="${id}"]`)!
  const slots = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => centre(at(id)))
  const list = screen.container.querySelector('.grid')!.getBoundingClientRect()
  // 'a' over 'e', the second line's middle: b to d close up a slot each, 'd' up to the first line.
  await drag(at('a'), slots[4]!, false)
  expect(centre(at('b')).x).toBeCloseTo(slots[0]!.x, 0)
  expect(centre(at('c')).x).toBeCloseTo(slots[1]!.x, 0)
  expect(centre(at('d')).x).toBeCloseTo(slots[2]!.x, 0)
  expect(centre(at('d')).y).toBeCloseTo(slots[2]!.y, 0)
  expect(centre(at('e')).x).toBeCloseTo(slots[3]!.x, 0)
  expect(centre(at('f')).x).toBeCloseTo(slots[5]!.x, 0)
  // Nothing left the grid on the way.
  for (const id of ['b', 'c', 'd', 'e', 'f']) {
    const box = at(id).getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(list.left - 1)
    expect(box.right).toBeLessThanOrEqual(list.right + 1)
  }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5, ...slots[4]! }))
  await new Promise((r) => setTimeout(r, 50))
  expect([...items]).toEqual(['b', 'c', 'd', 'e', 'a', 'f'])
})

test('a card from another list opens a slot in a grid, and the grid keeps its columns', async () => {
  const bench = reactive(['a', 'b', 'c', 'd', 'e'])
  const crew = reactive(['x', 'y'])
  const lists = { bench, crew }
  const Board = defineComponent({
    setup() {
      const group = useSortableGroup({
        onTransfer: (_value, from, to) => {
          const [moved] = lists[from.groupId as 'bench'].splice(from.index, 1)
          lists[to.groupId as 'bench'].splice(to.index, 0, moved!)
        },
      })
      return () =>
        h('div', { style: 'display: flex; gap: 40px; align-items: start' }, [
          withDirectives(h('div', { class: 'grid', style: GRID }, bench.map(cell)), [
            [vDraggable, { items: bench, group, groupId: 'bench', axis: 'x' }],
          ]),
          withDirectives(
            h(
              'div',
              { class: 'crew', style: 'display: grid; gap: 10px; width: 80px; min-height: 100px' },
              crew.map(cell),
            ),
            [[vDraggable, { items: crew, group, groupId: 'crew' }]],
          ),
        ])
    },
  })
  const screen = await render(Board)
  const at = (id: string) => screen.container.querySelector<HTMLElement>(`[data-id="${id}"]`)!
  const slots = ['a', 'b', 'c', 'd', 'e'].map((id) => centre(at(id)))
  // 'x' over 'b': b to e move one slot on, 'c' down to the second line, 'e' into the free cell.
  await drag(at('x'), slots[1]!, false)
  expect(centre(at('b')).x).toBeCloseTo(slots[2]!.x, 0)
  expect(centre(at('c')).x).toBeCloseTo(slots[3]!.x, 0)
  expect(centre(at('c')).y).toBeCloseTo(slots[3]!.y, 0)
  expect(centre(at('e')).x).toBeCloseTo(slots[2]!.x, 0)
  expect(centre(at('e')).y).toBeCloseTo(slots[3]!.y, 0)
  // Cards the list keeps don't change columns: 'a' stayed where it was.
  expect(centre(at('a')).x).toBeCloseTo(slots[0]!.x, 0)
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5, ...slots[1]! }))
  await new Promise((r) => setTimeout(r, 50))
  expect([...bench]).toEqual(['a', 'x', 'b', 'c', 'd', 'e'])
  // Over it again, now it holds one more: its last card ('e', ending the second line) moves on to
  // the start of a third line, where the cell after it is.
  await new Promise((r) => setTimeout(r, 600))
  await drag(at('y'), centre(at('x')), false)
  expect(centre(at('e')).x).toBeCloseTo(slots[0]!.x, 0)
  expect(centre(at('e')).y).toBeCloseTo(2 * slots[3]!.y - slots[0]!.y, 0)
  window.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 5, ...centre(at('x')) }),
  )
  await new Promise((r) => setTimeout(r, 50))
  expect([...bench]).toEqual(['a', 'y', 'x', 'b', 'c', 'd', 'e'])
  // Leaving the grid: its cards keep three columns, no padding steals one.
  await new Promise((r) => setTimeout(r, 600))
  await drag(at('a'), centre(screen.container.querySelector('.crew')!))
  await new Promise((r) => setTimeout(r, 50))
  expect(bench[0]).toBe('y')
  expect(screen.container.querySelector<HTMLElement>('.grid')!.style.paddingInlineEnd).toBe('')
})
