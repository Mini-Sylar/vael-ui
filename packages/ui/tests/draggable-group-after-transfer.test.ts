// After a card leaves a list for another one in its group, the list it left still reorders its
// own cards: the next drag that starts there is hosted there again.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, reactive, withDirectives } from 'vue'
import { useSortableGroup } from '../src/composables/useSortableGroup'
import { vDraggable } from '../src/directives/vDraggable'

function cell(item: string) {
  return h('div', { key: item, 'data-id': item, style: 'height: 40px' }, item)
}

function centre(el: Element) {
  const box = el.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

async function drag(from: HTMLElement, to: { x: number; y: number }) {
  const { x, y } = centre(from)
  from.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 6,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  for (let i = 1; i <= 12; i++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 6,
        clientX: x + ((to.x - x) * i) / 12,
        clientY: y + ((to.y - y) * i) / 12,
      }),
    )
    await new Promise(requestAnimationFrame)
  }
  await new Promise((r) => setTimeout(r, 300))
  window.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 6, clientX: to.x, clientY: to.y }),
  )
  await new Promise((r) => setTimeout(r, 800))
}

test('a list a card left still reorders its own cards', async () => {
  const bench = reactive(['a', 'b', 'c', 'd'])
  const crew = reactive<string[]>([])
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
          withDirectives(
            h(
              'div',
              { class: 'bench', style: 'display: grid; gap: 8px; width: 100px' },
              bench.map(cell),
            ),
            [[vDraggable, { items: bench, group, groupId: 'bench' }]],
          ),
          withDirectives(
            h(
              'div',
              { class: 'crew', style: 'display: grid; gap: 8px; width: 100px; min-height: 120px' },
              crew.map(cell),
            ),
            [[vDraggable, { items: crew, group, groupId: 'crew' }]],
          ),
        ])
    },
  })
  const screen = await render(Board)
  const at = (id: string) => screen.container.querySelector<HTMLElement>(`[data-id="${id}"]`)!
  await drag(at('b'), centre(screen.container.querySelector('.crew')!))
  expect([...bench]).toEqual(['a', 'c', 'd'])
  // Back again, then a reorder inside the bench.
  await drag(at('b'), centre(at('c')))
  expect([...crew]).toEqual([])
  await drag(at('a'), { x: centre(at('d')).x, y: centre(at('d')).y + 15 })
  expect(bench[bench.length - 1]).toBe('a')
})
