import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { ref } from 'vue'
import type { RenderResult } from 'vitest-browser-vue'
import SortableGroupFixture from './fixtures/SortableGroupFixture.vue'
import Sortable from '../src/components/Sortable/Sortable.vue'
import { useSortableGroup } from '../src/composables/useSortableGroup'

function handles(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-sortable-handle'))
}
function rowFor(screen: RenderResult<unknown>, value: string): HTMLElement {
  return screen.container.querySelector<HTMLElement>(`[data-sortable-item][data-value="${value}"]`)!
}
function order(screen: RenderResult<unknown>, testid: 'todo-order' | 'doing-order'): string {
  return screen.container.querySelector(`[data-testid="${testid}"]`)!.textContent!
}

function drag(handle: HTMLElement, toX: number, toY: number, pointerId = 21) {
  const box = handle.getBoundingClientRect()
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId, clientX: toX, clientY: toY }),
  )
  return () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
}

test('pointer-drag across the boundary transfers the card at the resolved index', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]! // todo's Alpha
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('c,a'))
  expect(order(screen, 'todo-order')).toBe('b')
})

test('a same-container move inside a grouped Sortable behaves exactly like an ungrouped one', async () => {
  const screen = await render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => expect(order(screen, 'todo-order')).toBe('b,a'))
  expect(order(screen, 'doing-order')).toBe('c')
})

test('keyboard: the transfer key moves the grab to the adjacent column, and focus follows', async () => {
  const screen = await render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  await userEvent.keyboard('{ArrowRight}')
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(order(screen, 'todo-order')).toBe('b'))
  expect(order(screen, 'doing-order')).toBe('c,a')
  await vi.waitFor(() => {
    expect(
      document.activeElement?.closest('[data-sortable-item]')?.getAttribute('data-value'),
    ).toBe('a')
  })
})

test('keyboard: the reorder key still steps within whichever column currently hosts the grab', async () => {
  const screen = await render(SortableGroupFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight}{ArrowUp} ')
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a,c'))
  expect(order(screen, 'todo-order')).toBe('b')
})

test('a group-level canDrop rejection reverts both arrays', async () => {
  const screen = await render(SortableGroupFixture, { props: { canDrop: () => false } })
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('a rejecting group-level beforeDrop reverts instead of throwing', async () => {
  const screen = await render(SortableGroupFixture, {
    props: { beforeDrop: () => Promise.resolve(false) },
  })
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('Escape while hovering a foreign column reverts both arrays untouched', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]!
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const pointerId = 33
  const startBox = handle.getBoundingClientRect()
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: startBox.left + startBox.width / 2,
      clientY: startBox.top + startBox.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      clientX: doingBox.left + 10,
      clientY: doingBox.top + doingBox.height + 5,
    }),
  )
  const draggedRow = rowFor(screen, 'a')
  // Default previewMode ('element'): no separate clone node — the dragged
  // row itself lifts out of flow once it actually crosses into 'doing'.
  await vi.waitFor(() => expect(getComputedStyle(draggedRow).position).toBe('fixed'))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await vi.waitFor(() => expect(getComputedStyle(draggedRow).position).not.toBe('fixed'))
  expect(order(screen, 'todo-order')).toBe('a,b')
  expect(order(screen, 'doing-order')).toBe('c')
})

test('leaving the list springs the rows below up instead of snapping them', async () => {
  const screen = await render(SortableGroupFixture)
  const bravo = rowFor(screen, 'b')
  const restTop = bravo.getBoundingClientRect().top
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handles(screen)[0]!, doingBox.left + 10, doingBox.top + 10)
  // Alpha has lifted out of the flow; Bravo holds its place and springs up from there.
  expect(bravo.style.translate).not.toBe('')
  expect(Math.abs(bravo.getBoundingClientRect().top - restTop)).toBeLessThan(2)
  await vi.waitFor(() => expect(bravo.style.translate).toBe(''))
  expect(bravo.getBoundingClientRect().top).toBeLessThan(restTop)
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a,c'))
})

test('an empty list takes a drop anywhere inside its box, not only at its top edge', async () => {
  const screen = await render(SortableGroupFixture)
  // Empty "doing" first by moving Charlie over.
  const todoBox = rowFor(screen, 'b').getBoundingClientRect()
  drag(handles(screen)[2]!, todoBox.left + 10, todoBox.bottom + 5)()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe(''))
  const doing = screen.container.querySelectorAll<HTMLElement>('.ui-sortable')[1]!
  const box = doing.getBoundingClientRect()
  expect(box.height).toBeGreaterThanOrEqual(200)
  drag(handles(screen)[0]!, box.left + box.width / 2, box.top + box.height * 0.7)()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('a'))
})

test('a card let go half-way out of its column glides back on both axes instead of snapping sideways first', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]!
  const alpha = rowFor(screen, 'a')
  const box = handle.getBoundingClientRect()
  const pointerId = 71
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  // Sideways and a little down, still over its own column.
  for (let step = 1; step <= 6; step++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 4 + (60 * step) / 6,
        clientY: box.top + 4 + (10 * step) / 6,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  const xOf = () => parseFloat(alpha.style.translate.split(' ')[0] || '0')
  expect(xOf()).toBeCloseTo(60, 0)
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  // Two frames in, the sideways offset is still mostly there, easing out.
  const mid = xOf()
  expect(mid).toBeGreaterThan(20)
  expect(mid).toBeLessThan(60)
  await vi.waitFor(() => expect(alpha.style.translate).toBe(''))
  expect(order(screen, 'todo-order')).toBe('a,b')
})

test('a row gliding home after release stays stacked above the neighbouring list until it has landed', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]!
  const alpha = rowFor(screen, 'a')
  const box = handle.getBoundingClientRect()
  const pointerId = 91
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  for (let step = 1; step <= 6; step++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 4 + (70 * step) / 6,
        clientY: box.top + 4 + (8 * step) / 6,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  expect(alpha.hasAttribute('data-dragging')).toBe(false)
  expect(getComputedStyle(alpha).zIndex).toBe('1')
  expect(getComputedStyle(alpha).position).toBe('relative')
  // Its right edge, hanging past its own list, is what the pointer finds there.
  const rect = alpha.getBoundingClientRect()
  const hit = document.elementFromPoint(rect.right - 4, rect.top + rect.height / 2)
  expect(hit && alpha.contains(hit)).toBe(true)
  await vi.waitFor(() => expect(alpha.style.translate).toBe(''))
  expect(getComputedStyle(alpha).zIndex).toBe('auto')
  expect(alpha.style.position).toBe('')
})

test('a dropped copy flies into its new column above everything, then the real card shows', async () => {
  const screen = await render(SortableGroupFixture, { props: { previewMode: 'clone' } })
  const handle = handles(screen)[0]! // todo's Alpha
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const release = drag(handle, doingBox.left + 10, doingBox.top + doingBox.height + 5)
  expect(document.querySelector('body > [data-sortable-preview]')).not.toBeNull()
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('c,a'))
  // Landing: the copy is still up, fixed and above the lists, and the card waits hidden in its slot.
  await new Promise((r) => requestAnimationFrame(r))
  const copy = document.querySelector<HTMLElement>('body > [data-sortable-preview]')
  expect(copy).not.toBeNull()
  expect(getComputedStyle(copy!).position).toBe('fixed')
  expect(getComputedStyle(rowFor(screen, 'a')).opacity).toBe('0')
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  const card = rowFor(screen, 'a')
  expect(getComputedStyle(card).visibility).toBe('visible')
  expect(card.style.translate).toBe('')
})

test('a card held near the side of a scrolling column follows the pointer, and the column never scrolls sideways', async () => {
  const screen = await render({
    components: { Sortable },
    setup() {
      const todo = ref([
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Bravo' },
      ])
      const doing = ref([{ id: 'c', label: 'Charlie' }])
      const lists = { todo, doing }
      const board = useSortableGroup({
        onTransfer: (value, from, to) => {
          const [moved] = lists[from.groupId as 'todo'].value.splice(from.index, 1)
          lists[to.groupId as 'todo'].value.splice(to.index, 0, moved!)
        },
      })
      return { todo, doing, board }
    },
    template: `
      <div style="display: flex; gap: 24px">
        <Sortable v-model:items="todo" item-key="id" label-key="label" :group="board" group-id="todo"
          data-testid="todo" style="width: 160px; block-size: 200px; overflow-y: auto" />
        <Sortable v-model:items="doing" item-key="id" label-key="label" :group="board" group-id="doing"
          style="width: 160px; block-size: 200px" />
      </div>`,
  })
  const column = screen.container.querySelector<HTMLElement>('[data-testid="todo"]')!
  const card = column.querySelector<HTMLElement>('.ui-sortable-item')!
  const handle = card.querySelector<HTMLElement>('.ui-sortable-handle')!
  const box = handle.getBoundingClientRect()
  const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  const startLeft = card.getBoundingClientRect().left
  const pointer = { bubbles: true, pointerId: 31 }
  handle.dispatchEvent(
    new PointerEvent('pointerdown', { ...pointer, button: 0, clientX: start.x, clientY: start.y }),
  )
  // Just inside the column's right edge, where autoscroll would act if the column could scroll.
  const nearEdge = column.getBoundingClientRect().right - 4
  window.dispatchEvent(
    new PointerEvent('pointermove', { ...pointer, clientX: nearEdge, clientY: start.y + 10 }),
  )
  for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r))
  expect(card.getBoundingClientRect().left - startLeft).toBeCloseTo(nearEdge - start.x, 0)
  expect(column.scrollLeft).toBe(0)
  window.dispatchEvent(new PointerEvent('pointerup', pointer))
  await vi.waitFor(() => expect(card.style.translate).toBe(''))
  expect(column.scrollLeft).toBe(0)
})

test('a card dropped at the end of a scrolled column ends up in view, and the column glides to show it', async () => {
  const screen = await render({
    components: { Sortable },
    setup() {
      const todo = ref([{ id: 'a', label: 'Alpha' }])
      const doing = ref(
        ['c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id, label: id.toUpperCase() })),
      )
      const lists = { todo, doing }
      const board = useSortableGroup({
        onTransfer: (value, from, to) => {
          const [moved] = lists[from.groupId as 'todo'].value.splice(from.index, 1)
          lists[to.groupId as 'todo'].value.splice(to.index, 0, moved!)
        },
      })
      return { todo, doing, board }
    },
    template: `
      <div style="display: flex; gap: 24px">
        <Sortable v-model:items="todo" item-key="id" label-key="label" :group="board" group-id="todo"
          style="width: 160px; block-size: 140px" />
        <Sortable v-model:items="doing" item-key="id" label-key="label" :group="board" group-id="doing"
          data-testid="doing" style="width: 160px; block-size: 140px; overflow-y: auto" />
      </div>`,
  })
  const column = screen.container.querySelector<HTMLElement>('[data-testid="doing"]')!
  column.scrollTop = column.scrollHeight
  const box = column.getBoundingClientRect()
  const handle = screen.container.querySelector<HTMLElement>(
    '[data-value="a"] .ui-sortable-handle',
  )!
  const release = drag(handle, box.left + box.width / 2, box.bottom - 6, 41)
  // Hold so autoscroll has reached the end, then let go there.
  for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r))
  release()
  await vi.waitFor(() => expect(column.querySelector('[data-value="a"]')).not.toBeNull())
  await new Promise((r) => requestAnimationFrame(r))
  const neighbour = column.querySelector<HTMLElement>('[data-value="h"]')!
  expect(neighbour.style.translate).not.toBe('')
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  const card = column.querySelector<HTMLElement>('[data-value="a"]')!.getBoundingClientRect()
  const view = column.getBoundingClientRect()
  expect(card.top).toBeGreaterThanOrEqual(view.top - 0.5)
  expect(card.bottom).toBeLessThanOrEqual(view.bottom + 0.5)
})

function twoBuckets(
  doingStyle = '',
  previewMode: 'element' | 'clone' = 'clone',
  restrictToList = false,
) {
  return render({
    components: { Sortable },
    setup() {
      const todo = ref([
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Bravo' },
      ])
      const doing = ref(
        (doingStyle ? ['c', 'd', 'e', 'f', 'g', 'h'] : ['c']).map((id) => ({
          id,
          label: id.toUpperCase(),
        })),
      )
      const lists = { todo, doing }
      const board = useSortableGroup({
        onTransfer: (value, from, to) => {
          const [moved] = lists[from.groupId as 'todo'].value.splice(from.index, 1)
          lists[to.groupId as 'todo'].value.splice(to.index, 0, moved!)
        },
      })
      return { todo, doing, board, previewMode, doingStyle, restrictToList }
    },
    template: `
      <div style="display: flex; align-items: flex-start; gap: 24px">
        <Sortable v-model:items="todo" item-key="id" label-key="label" :group="board" group-id="todo"
          :preview-mode="previewMode" :restrict-to-list="restrictToList" data-testid="todo" style="width: 160px" />
        <Sortable v-model:items="doing" item-key="id" label-key="label" :group="board" group-id="doing"
          :preview-mode="previewMode" :restrict-to-list="restrictToList" data-testid="doing" :style="'width: 160px;' + doingStyle" />
      </div>`,
  })
}
const frame = () => new Promise((r) => requestAnimationFrame(r))
const heightOf = (el: HTMLElement) => el.getBoundingClientRect().height

for (const mode of ['clone', 'element'] as const) {
  test(`a bucket grows smoothly for a card hovering it and shrinks back when it leaves (${mode})`, async () => {
    const screen = await twoBuckets('', mode)
    const doing = screen.container.querySelector<HTMLElement>('[data-testid="doing"]')!
    const todo = screen.container.querySelector<HTMLElement>('[data-testid="todo"]')!
    const rest = heightOf(doing)
    const todoRest = heightOf(todo)
    const handle = screen.container.querySelector<HTMLElement>(
      '[data-value="a"] .ui-sortable-handle',
    )!
    const box = doing.getBoundingClientRect()
    const release = drag(handle, box.left + box.width / 2, box.bottom - 4, 51)
    await frame()
    await frame()
    const growing = heightOf(doing)
    expect(growing).toBeGreaterThan(rest)
    await vi.waitFor(() => expect(heightOf(doing)).toBeGreaterThan(growing + 10))
    // Settled once two frames in a row read the same height.
    let grown = heightOf(doing)
    await vi.waitFor(async () => {
      const before = heightOf(doing)
      await frame()
      grown = heightOf(doing)
      expect(grown).toBe(before)
    })
    // The bucket it came from keeps its size until the drop.
    expect(heightOf(todo)).toBeCloseTo(todoRest, 0)
    // Back over its own bucket: the other one closes again.
    const own = todo.getBoundingClientRect()
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 51,
        clientX: own.left + 20,
        clientY: own.top + 10,
      }),
    )
    await frame()
    await frame()
    expect(heightOf(doing)).toBeLessThan(grown)
    expect(heightOf(doing)).toBeGreaterThan(rest)
    await vi.waitFor(() => expect(doing.style.paddingBlockEnd).toBe(''))
    expect(heightOf(doing)).toBeCloseTo(rest, 1)
    release()
    await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  })

  test(`at the drop the receiving bucket holds its size and the other one closes up smoothly (${mode})`, async () => {
    const screen = await twoBuckets('', mode)
    const doing = screen.container.querySelector<HTMLElement>('[data-testid="doing"]')!
    const todo = screen.container.querySelector<HTMLElement>('[data-testid="todo"]')!
    const todoRest = heightOf(todo)
    const handle = screen.container.querySelector<HTMLElement>(
      '[data-value="a"] .ui-sortable-handle',
    )!
    const box = doing.getBoundingClientRect()
    const release = drag(handle, box.left + box.width / 2, box.bottom - 4, 52)
    for (let i = 0; i < 40; i++) await frame()
    const grown = heightOf(doing)
    release()
    await vi.waitFor(() => expect(doing.querySelector('[data-value="a"]')).not.toBeNull())
    expect(heightOf(doing)).toBeCloseTo(grown, 0)
    await frame()
    const closing = heightOf(todo)
    expect(closing).toBeLessThan(todoRest + 0.5)
    expect(closing).toBeGreaterThan(todoRest / 2 + 1)
    await vi.waitFor(() => expect(todo.style.paddingBlockEnd).toBe(''))
    expect(heightOf(todo)).toBeLessThan(closing)
    expect(heightOf(doing)).toBeCloseTo(grown, 0)
  })
}

test('a scrolled bucket makes room at its end, so autoscroll can show the gap there', async () => {
  const screen = await twoBuckets('block-size: 120px; overflow-y: auto')
  const doing = screen.container.querySelector<HTMLElement>('[data-testid="doing"]')!
  doing.scrollTop = doing.scrollHeight
  const end = doing.scrollTop
  const box = doing.getBoundingClientRect()
  const handle = screen.container.querySelector<HTMLElement>(
    '[data-value="a"] .ui-sortable-handle',
  )!
  const release = drag(handle, box.left + box.width / 2, box.bottom - 4, 53)
  await vi.waitFor(() => expect(doing.scrollTop).toBeGreaterThan(end + 20))
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  const card = doing.querySelector<HTMLElement>('[data-value="a"]')!.getBoundingClientRect()
  expect(card.bottom).toBeLessThanOrEqual(doing.getBoundingClientRect().bottom + 0.5)
  expect(doing.style.paddingBlockEnd).toBe('')
})

test('a card held below a scrolled bucket scrolls it to its end and drops there', async () => {
  const screen = await twoBuckets('block-size: 120px; overflow-y: auto', 'clone', true)
  const doing = screen.container.querySelector<HTMLElement>('[data-testid="doing"]')!
  const box = doing.getBoundingClientRect()
  const handle = screen.container.querySelector<HTMLElement>(
    '[data-value="a"] .ui-sortable-handle',
  )!
  // In over the bucket, then down past its bottom edge, still within its width.
  const release = drag(handle, box.left + box.width / 2, box.top + 20, 54)
  await frame()
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 54,
      clientX: box.left + box.width / 2,
      clientY: box.bottom + 30,
    }),
  )
  await vi.waitFor(() =>
    expect(doing.scrollTop).toBeGreaterThanOrEqual(doing.scrollHeight - doing.clientHeight - 1),
  )
  for (let i = 0; i < 10; i++) await frame()
  // The floating card waits at the bucket's bottom edge, never below it.
  const copy = document
    .querySelector<HTMLElement>('body > [data-sortable-preview]')!
    .getBoundingClientRect()
  expect(copy.bottom).toBeLessThanOrEqual(doing.getBoundingClientRect().bottom + 0.5)
  expect(copy.top).toBeGreaterThanOrEqual(doing.getBoundingClientRect().top - 0.5)
  release()
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  const order = [...doing.querySelectorAll<HTMLElement>('[data-value]')].map(
    (el) => el.dataset.value,
  )
  expect(order.at(-1)).toBe('a')
  const card = doing.querySelector<HTMLElement>('[data-value="a"]')!.getBoundingClientRect()
  expect(card.bottom).toBeLessThanOrEqual(doing.getBoundingClientRect().bottom + 0.5)
})

test('a placeholder whose card moved to another column fades out where it was, then goes', async () => {
  const screen = await twoBuckets()
  const todo = screen.container.querySelector<HTMLElement>('[data-testid="todo"]')!
  const doing = screen.container.querySelector<HTMLElement>('[data-testid="doing"]')!
  const box = doing.getBoundingClientRect()
  const handle = screen.container.querySelector<HTMLElement>(
    '[data-value="a"] .ui-sortable-handle',
  )!
  const release = drag(handle, box.left + box.width / 2, box.bottom - 4, 55)
  for (let i = 0; i < 10; i++) await frame()
  release()
  await vi.waitFor(() => expect(todo.querySelector('[data-sortable-fading]')).not.toBeNull())
  const ghost = todo.querySelector<HTMLElement>('[data-sortable-fading]')!
  // A stand-in only: nothing that finds rows by value finds it.
  expect(ghost.hasAttribute('data-value')).toBe(false)
  expect(ghost.getAttribute('aria-hidden')).toBe('true')
  await frame()
  const opacity = Number(getComputedStyle(ghost).opacity)
  expect(opacity).toBeGreaterThan(0)
  expect(opacity).toBeLessThan(1)
  await vi.waitFor(() => expect(todo.querySelector('[data-sortable-fading]')).toBeNull())
})

test('a lifted card dropped in another column lands through a copy of itself above every list', async () => {
  const screen = await render(SortableGroupFixture)
  const handle = handles(screen)[0]! // todo's Alpha
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  // Let go well below the slot it will take, so there's a way to travel.
  const release = drag(handle, doingBox.left + 20, doingBox.bottom + 90)
  // The real card is what moves during the drag.
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  release()
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('c,a'))
  await new Promise((r) => requestAnimationFrame(r))
  // Its new list keeps clipping and scrolling as usual: the card glides there hidden, under a
  // fixed copy that isn't inside any list.
  const copy = document.querySelector<HTMLElement>('body > [data-sortable-preview]')
  expect(copy).not.toBeNull()
  expect(getComputedStyle(copy!).position).toBe('fixed')
  const card = rowFor(screen, 'a')
  expect(card.style.translate).not.toBe('')
  expect(getComputedStyle(card).opacity).toBe('0')
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(getComputedStyle(card).visibility).toBe('visible')
  expect(card.style.translate).toBe('')
})

test('with a copy, the original stays in its own slot while the copy is over another list, until the drop', async () => {
  const screen = await render(SortableGroupFixture, { props: { previewMode: 'clone' } })
  const handle = handles(screen)[0]! // todo's Alpha
  const alpha = rowFor(screen, 'a')
  const alphaTop = alpha.getBoundingClientRect().top
  const bravoTop = rowFor(screen, 'b').getBoundingClientRect().top
  const box = handle.getBoundingClientRect()
  const doingBox = rowFor(screen, 'c').getBoundingClientRect()
  const pointerId = 31
  const move = (x: number, y: number) =>
    window.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId, clientX: x, clientY: y }),
    )
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  move(box.left + 4, box.top + 14)
  move(doingBox.left + 10, doingBox.bottom + 5)
  await new Promise((r) => setTimeout(r, 450))
  // Over the other list: the original is still in its own slot, and nothing in its list moved.
  expect(alpha.hasAttribute('data-sortable-source')).toBe(true)
  expect(Math.abs(alpha.getBoundingClientRect().top - alphaTop)).toBeLessThan(1)
  expect(Math.abs(rowFor(screen, 'b').getBoundingClientRect().top - bravoTop)).toBeLessThan(1)
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await vi.waitFor(() => expect(order(screen, 'doing-order')).toBe('c,a'))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(order(screen, 'todo-order')).toBe('b')
})
