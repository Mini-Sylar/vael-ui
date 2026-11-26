// useDragSelect: a band across empty space selects what it touches, the modifiers combine, and an
// elastic band trails the pointer yet selects only what it covers.
import { effectScope, shallowRef, watch } from 'vue'
import { afterEach, expect, test } from 'vitest'
import { useDragSelect } from '../src/composables/useDragSelect'
import type { UseDragSelectOptions, UseDragSelectReturn } from '../src/composables/useDragSelect'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  document.body.replaceChildren()
})

// A 4 x 2 grid of 50 px cards, 10 px apart, in a box with 20 px of empty padding.
function setup(options: Partial<UseDragSelectOptions> = {}) {
  const box = document.createElement('div')
  box.style.cssText =
    'position: relative; display: grid; grid-template-columns: repeat(4, 50px); gap: 10px; padding: 20px; width: 270px; margin: 20px'
  for (let i = 0; i < 8; i++) {
    const card = document.createElement('div')
    card.style.height = '50px'
    box.append(card)
  }
  document.body.append(box)
  let select!: UseDragSelectReturn
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => {
    select = useDragSelect({ el: shallowRef(box), ...options })
  })
  const at = (x: number, y: number) => {
    const r = box.getBoundingClientRect()
    return { clientX: r.left + x, clientY: r.top + y }
  }
  const fire = (type: string, target: EventTarget, point: object, init: object = {}) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        ...point,
        ...init,
      }),
    )
  const drag = (a: [number, number], b: [number, number], init: object = {}) => {
    fire('pointerdown', box, at(...a), init)
    fire('pointermove', window, at(...b), init)
    fire('pointerup', window, at(...b), init)
  }
  return { box, select, at, fire, drag }
}

test('a band across empty space selects the cards it touches', () => {
  const { select, drag } = setup()
  // From the padding, over the first two cards of the first row.
  drag([5, 5], [100, 50])
  expect(select.selected.value).toEqual([0, 1])
})

test('shift adds, ctrl toggles, and a plain drag replaces', () => {
  const { select, drag } = setup()
  drag([5, 5], [100, 50])
  drag([195, 5], [230, 50], { shiftKey: true })
  expect(select.selected.value).toEqual([0, 1, 3])
  drag([5, 5], [100, 50], { ctrlKey: true })
  expect(select.selected.value).toEqual([3])
  drag([5, 85], [60, 120])
  expect(select.selected.value).toEqual([4])
})

test('a click on empty space clears, and a press on a card is not ours', () => {
  const { box, select, drag, fire, at } = setup()
  drag([5, 5], [100, 50])
  fire('pointerdown', box.children[7]!, at(230, 100))
  fire('pointerup', window, at(230, 100))
  expect(select.selected.value).toEqual([0, 1])
  fire('pointerdown', box, at(262, 5))
  fire('pointerup', window, at(262, 5))
  expect(select.selected.value).toEqual([])
})

test('a touch is left to scroll the page', () => {
  const { select, drag } = setup()
  drag([5, 5], [100, 50], { pointerType: 'touch' })
  expect(select.selected.value).toEqual([])
})

test('Escape during a drag puts the selection back', () => {
  const { box, select, at, fire, drag } = setup()
  drag([5, 5], [100, 50])
  fire('pointerdown', box, at(195, 5))
  fire('pointermove', window, at(230, 50))
  expect(select.selected.value).toEqual([3])
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect(select.selected.value).toEqual([0, 1])
})

test('an elastic band trails the pointer, selects only what it covers, then settles on it', async () => {
  const { select, at, fire, box } = setup({ spring: true })
  fire('pointerdown', box, at(5, 5))
  fire('pointermove', window, at(100, 50))
  // The corner has not caught up yet: the band is still short of the pointer.
  expect(select.x.value + select.width.value).toBeLessThan(105)
  const covered = (right: number) => [0, 1, 2, 3].filter((i) => 20 + i * 60 < right).length
  expect(select.selected.value.length).toBeLessThanOrEqual(
    covered(select.x.value + select.width.value),
  )
  fire('pointerup', window, at(100, 50))
  await new Promise<void>((resolve) => {
    const poll = () => (select.isDragging.value ? requestAnimationFrame(poll) : resolve())
    poll()
  })
  expect(select.selected.value).toEqual([0, 1])
})

test('a new band shows at its press, not where the last one ended', async () => {
  const { select, at, fire, box } = setup({ spring: true })
  const settled = () =>
    new Promise<void>((resolve) => {
      const poll = () => (select.isDragging.value ? requestAnimationFrame(poll) : resolve())
      poll()
    })
  fire('pointerdown', box, at(5, 5))
  fire('pointermove', window, at(100, 50))
  fire('pointerup', window, at(100, 50))
  await settled()
  // As it appears, from the far corner up and back.
  const seen: number[][] = []
  const stop = watch(
    select.isDragging,
    (on) => on && seen.push([select.x.value, select.y.value, select.width.value]),
    { flush: 'sync' },
  )
  fire('pointerdown', box, at(265, 135))
  fire('pointermove', window, at(150, 60))
  stop()
  expect(seen).toEqual([[265, 135, 0]])
  fire('pointerup', window, at(150, 60))
  await settled()
})

test('a press near an edge scrolls only once the drag heads toward it', async () => {
  const { select, at, fire, box } = setup()
  box.style.height = '90px'
  box.style.overflow = 'auto'
  const frames = (n: number) =>
    new Promise<void>((resolve) => {
      const step = () => (n-- ? requestAnimationFrame(step) : resolve())
      step()
    })
  // Pressed just above the bottom edge, dragged up and left: nothing scrolls, the band starts there.
  fire('pointerdown', box, at(265, 105))
  fire('pointermove', window, at(200, 100))
  await frames(10)
  expect(box.scrollTop).toBe(0)
  expect(select.y.value + select.height.value).toBe(105)
  fire('pointerup', window, at(200, 100))
  // Dragged down toward that edge: it scrolls.
  fire('pointerdown', box, at(265, 60))
  fire('pointermove', window, at(265, 105))
  await frames(10)
  expect(box.scrollTop).toBeGreaterThan(0)
  fire('pointerup', window, at(265, 105))
})

test('stretch is how far the corner is behind the pointer: zero for an exact band, positive for a sprung one', async () => {
  const exact = setup()
  exact.fire('pointerdown', exact.box, exact.at(5, 5))
  exact.fire('pointermove', window, exact.at(100, 50))
  expect(exact.select.stretch.value).toEqual({ x: 0, y: 0 })
  exact.fire('pointerup', window, exact.at(100, 50))

  const sprung = setup({ spring: 'bouncy' })
  sprung.fire('pointerdown', sprung.box, sprung.at(5, 5))
  sprung.fire('pointermove', window, sprung.at(100, 50))
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  expect(sprung.select.stretch.value.x).toBeGreaterThan(0)
  expect(sprung.select.stretch.value.y).toBeGreaterThan(0)
  sprung.fire('pointerup', window, sprung.at(100, 50))
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('a touch that holds still, then drags, draws a band', async () => {
  const { select, box, at, fire } = setup()
  const touch = { pointerType: 'touch' }
  fire('pointerdown', box, at(5, 5), touch)
  // Nothing yet: it is still deciding whether this is a scroll.
  expect(select.isDragging.value).toBe(false)
  await wait(420)
  expect(select.isDragging.value).toBe(true)
  fire('pointermove', window, at(100, 50), touch)
  expect(select.selected.value).toEqual([0, 1])
  fire('pointerup', window, at(100, 50), touch)
  expect(select.selected.value).toEqual([0, 1])
})

test('a touch that moves before the hold ends is a scroll: no band', async () => {
  const { select, box, at, fire } = setup()
  const touch = { pointerType: 'touch' }
  fire('pointerdown', box, at(5, 5), touch)
  fire('pointermove', window, at(5, 40), touch)
  await wait(420)
  fire('pointermove', window, at(100, 50), touch)
  expect(select.isDragging.value).toBe(false)
  expect(select.selected.value).toEqual([])
})

test('a quick tap on empty space clears, as a click does', async () => {
  const { select, box, at, fire, drag } = setup()
  drag([5, 5], [100, 50])
  expect(select.selected.value).toEqual([0, 1])
  const touch = { pointerType: 'touch' }
  fire('pointerdown', box, at(5, 5), touch)
  fire('pointerup', window, at(5, 5), touch)
  expect(select.selected.value).toEqual([])
})

test('while a touch is held the page does not scroll under it', async () => {
  const { box, at, fire } = setup()
  const touch = { pointerType: 'touch' }
  fire('pointerdown', box, at(5, 5), touch)
  await wait(420)
  const move = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
  window.dispatchEvent(move)
  expect(move.defaultPrevented).toBe(true)
  fire('pointerup', window, at(5, 5), touch)
  const after = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
  window.dispatchEvent(after)
  expect(after.defaultPrevented).toBe(false)
})

// A board: two 100 px columns, each a scroller of 50 px cards three levels down.
function board() {
  const box = document.createElement('div')
  box.style.cssText = 'display: flex; gap: 20px; padding: 20px; margin: 20px; width: 300px'
  for (let c = 0; c < 2; c++) {
    const column = document.createElement('section')
    column.style.cssText = 'width: 100px; height: 130px; overflow-y: auto'
    const list = document.createElement('ul')
    list.style.cssText = 'margin: 0; padding: 0; list-style: none'
    for (let i = 0; i < 4; i++) {
      const card = document.createElement('li')
      card.className = 'card'
      card.style.cssText = 'height: 50px; margin-bottom: 10px'
      list.append(card)
    }
    column.append(list)
    box.append(column)
  }
  document.body.append(box)
  let select!: UseDragSelectReturn
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => {
    select = useDragSelect({ el: shallowRef(box), items: '.card' })
  })
  const at = (x: number, y: number) => {
    const r = box.getBoundingClientRect()
    return { clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 1, button: 0 }
  }
  const drag = (from: EventTarget, a: [number, number], b: [number, number]) => {
    from.dispatchEvent(new PointerEvent('pointerdown', at(...a)))
    window.dispatchEvent(new PointerEvent('pointermove', at(...b)))
    window.dispatchEvent(new PointerEvent('pointerup', at(...b)))
  }
  return { box, select, drag, cards: [...box.querySelectorAll('.card')] }
}

test('items: cards deep inside columns are hit, across columns, in document order', () => {
  const { box, select, drag } = board()
  // From the column's own empty space is fine too; here from the board's padding.
  drag(box, [5, 5], [180, 90])
  // Column 1: cards 0 and 1 (0–50, 60–110); column 2: cards 4 and 5.
  expect(select.selected.value).toEqual([0, 1, 4, 5])
})

test('items: a press on a card is the card’s own, a press in a column’s empty space starts a band', () => {
  const { select, drag, cards, box } = board()
  drag(cards[0]!, [30, 30], [180, 80])
  expect(select.isDragging.value).toBe(false)
  expect(select.selected.value).toEqual([])
  // Between cards 1 and 2, down onto the strip of card 2 still in view.
  drag(box.querySelector('ul')!, [30, 135], [60, 145])
  expect(select.selected.value).toEqual([2])
})

test('items: a card scrolled out of its column is not selected', () => {
  const { box, select, drag } = board()
  // Below both columns (they end at 150): cards 2 and 3 sit there, clipped.
  box.style.height = '260px'
  drag(box, [5, 155], [250, 255])
  expect(select.selected.value).toEqual([])
})
