// useDragSelect: a band across empty space selects what it touches, the modifiers combine, and an
// elastic band trails the pointer yet selects only what it covers.
import { effectScope, shallowRef } from 'vue'
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
