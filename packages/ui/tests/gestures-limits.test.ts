// The awkward cases for useDrag and useWheel: a scaled parent, a second finger, a list that grows
// or shrinks while it spins, one that is disabled mid-drag, a model changed from outside mid-throw,
// a loop shorter than what shows, and a very long list.
import { effectScope, nextTick, shallowRef } from 'vue'
import { afterEach, expect, test } from 'vitest'
import { useDrag } from '../src/composables/useDrag'
import { useWheel } from '../src/composables/useWheel'
import type { UseWheelOptions } from '../src/composables/useWheel'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  document.body.replaceChildren()
})

const press = (el: Element, id: number, x: number, y: number) =>
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: id,
      clientX: x,
      clientY: y,
      button: 0,
      bubbles: true,
    }),
  )
const move = (id: number, x: number, y: number) =>
  window.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: id, clientX: x, clientY: y, bubbles: true }),
  )
const lift = (id: number, x: number, y: number) =>
  window.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: id, clientX: x, clientY: y, bubbles: true }),
  )

function dragSetup(scale = 1) {
  const parent = document.createElement('div')
  parent.style.cssText = `transform: scale(${scale}); transform-origin: 0 0; width: 400px; height: 400px`
  const el = document.createElement('div')
  el.style.cssText = 'width: 100px; height: 100px'
  parent.append(el)
  document.body.append(parent)
  let drag!: ReturnType<typeof useDrag>
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => (drag = useDrag({ el: shallowRef(el) })))
  return { el, drag }
}

test('in a scaled parent the element still stays under the finger', () => {
  const { el, drag } = dragSetup(0.5)
  const before = el.getBoundingClientRect().left
  press(el, 1, 10, 10)
  for (let i = 0; i < 20; i++) move(1, 110, 10)
  // The finger moved 100 screen px: the element must have moved 100 screen px, not 50.
  expect(Math.round(el.getBoundingClientRect().left - before)).toBe(100)
  expect(Math.round(drag.x.value)).toBe(200)
  lift(1, 110, 10)
})

test('a second finger does not take a drag from the first', () => {
  const { el, drag } = dragSetup()
  press(el, 1, 0, 0)
  for (let i = 0; i < 20; i++) move(1, 50, 0)
  press(el, 2, 500, 500)
  move(2, 900, 900)
  expect(Math.round(drag.x.value)).toBe(50)
  lift(2, 900, 900)
  expect(drag.isDragging.value).toBe(true)
  lift(1, 50, 0)
})

function wheelSetup(options: Partial<UseWheelOptions> = {}, count = 24) {
  const el = document.createElement('div')
  el.style.cssText = 'width: 300px; height: 180px'
  for (let i = 0; i < count; i++) el.append(document.createElement('div'))
  document.body.append(el)
  const model = shallowRef(5)
  const n = shallowRef(count)
  let wheel!: ReturnType<typeof useWheel>
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => (wheel = useWheel(model, { el: shallowRef(el), count: n, size: 36, ...options })))
  return { el, model, n, wheel }
}

test('rows that load in late: it starts on the model once they arrive', async () => {
  const { n, wheel, model } = wheelSetup({}, 0)
  model.value = 4
  n.value = 12
  await nextTick()
  wheel.goTo(4, { animate: false })
  expect(wheel.index.value).toBe(4)
})

test('a list that shrinks past the row it is on lands on the last one', async () => {
  const { n, wheel } = wheelSetup()
  n.value = 3
  await nextTick()
  expect(wheel.index.value).toBe(2)
})

test('a loop of fewer items than it shows still turns and wraps', async () => {
  const { wheel } = wheelSetup({ loop: true }, 3)
  wheel.step(1)
  wheel.step(1)
  wheel.step(1)
  await new Promise((resolve) => setTimeout(resolve, 700))
  expect(wheel.index.value).toBe(2)
  expect(Number.isFinite(wheel.position.value)).toBe(true)
})

test('disabled mid-drag: the next press does nothing, and the current drag lets go cleanly', () => {
  const disabled = shallowRef(false)
  const { el, wheel } = wheelSetup({ disabled })
  press(el, 1, 0, 100)
  move(1, 0, 60)
  disabled.value = true
  lift(1, 0, 60)
  press(el, 2, 0, 100)
  move(2, 0, 20)
  expect(wheel.isDragging.value).toBe(false)
})

test('the model changed from outside mid-throw takes the wheel there', async () => {
  const { model, wheel } = wheelSetup()
  wheel.goTo(15)
  await new Promise((resolve) => setTimeout(resolve, 80))
  model.value = 1
  await new Promise((resolve) => setTimeout(resolve, 900))
  expect(wheel.index.value).toBe(1)
  expect(Math.round(wheel.position.value)).toBe(1)
})

test('a very long list writes only the rows near the centre', () => {
  const { el, wheel } = wheelSetup({}, 10_000)
  wheel.goTo(5000, { animate: false })
  const written = [...el.children].filter((row) =>
    (row as HTMLElement).style.getPropertyValue('--ui-wheel-offset'),
  )
  expect(written.length).toBeLessThan(30)
})

test('a wheel in a scaled parent follows the finger too', () => {
  const parent = document.createElement('div')
  parent.style.cssText = 'transform: scale(0.5); transform-origin: 0 0'
  const el = document.createElement('div')
  el.style.cssText = 'width: 300px; height: 360px'
  for (let i = 0; i < 24; i++) el.append(document.createElement('div'))
  parent.append(el)
  document.body.append(parent)
  const model = shallowRef(0)
  let wheel!: ReturnType<typeof useWheel>
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => (wheel = useWheel(model, { el: shallowRef(el), count: 24, size: 36 })))
  press(el, 1, 10, 100)
  // 36 screen px is 72 wheel px: two rows.
  for (let i = 0; i < 20; i++) move(1, 10, 64)
  expect(Math.round(wheel.position.value * 10) / 10).toBe(2)
  lift(1, 10, 64)
})

test('let go past the end of a list it comes straight back: no swing out, and rests on the last row', async () => {
  const { el, wheel } = wheelSetup({}, 12)
  wheel.goTo(11, { animate: false })
  press(el, 1, 0, 150)
  // A hard throw toward the end, so the finger pulls it past (the rubber band) before release.
  for (const y of [120, 80, 40, 0]) {
    move(1, 0, y)
    await new Promise((resolve) => setTimeout(resolve, 8))
  }
  const atRelease = wheel.position.value
  lift(1, 0, 0)
  let furthest = atRelease
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 16))
    furthest = Math.max(furthest, wheel.position.value)
  }
  expect(atRelease).toBeGreaterThan(11)
  // After letting go it only ever moves back toward the last row (11): never further out.
  expect(furthest).toBeLessThanOrEqual(atRelease + 0.05)
  expect(Math.round(wheel.position.value * 100) / 100).toBe(11)
})

test('a wheel gesture that carries past the end stretches only a little, then comes back', async () => {
  const { el, wheel } = wheelSetup({}, 12)
  wheel.goTo(2, { animate: false })
  // Momentum: many events in the same direction, starting inside the list and running past the top.
  let furthest = 2
  for (let i = 0; i < 40; i++) {
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -40, cancelable: true, bubbles: true }))
    furthest = Math.min(furthest, wheel.position.value)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  // 36 px rows: never more than half a row (18 px) past row 0.
  expect(furthest).toBeGreaterThanOrEqual(-0.5 - 0.01)
  await new Promise((resolve) => setTimeout(resolve, 700))
  expect(Math.round(wheel.position.value * 100) / 100).toBe(0)
})
