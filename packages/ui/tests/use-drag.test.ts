// useDrag: a drag that decides on release. Throws land, rest is reported, home is clean.
import { effectScope, shallowRef, watchEffect } from 'vue'
import { afterEach, expect, test } from 'vitest'
import { useDrag } from '../src/composables/useDrag'
import type { DragPoint, UseDragOptions, UseDragReturn } from '../src/composables/useDrag'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))

function setup(options: Partial<UseDragOptions> = {}) {
  const el = document.createElement('div')
  document.body.append(el)
  const rests: DragPoint[] = []
  let drag!: UseDragReturn
  const rested = () =>
    new Promise<DragPoint>((resolve) => {
      const count = rests.length
      const poll = () =>
        rests.length > count ? resolve(rests.at(-1)!) : requestAnimationFrame(poll)
      poll()
    })
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => {
    drag = useDrag({ el: shallowRef(el), onRest: (at) => rests.push(at), ...options })
  })
  return { el, drag, rested, rests }
}

test('throwTo lands where it was sent, moves the element by its own translate, and reports rest', async () => {
  const { el, drag, rested } = setup()
  drag.throwTo({ x: 300, y: -40 })
  expect(await rested()).toEqual({ x: 300, y: -40 })
  expect(el.style.translate).toBe('300px -40px')
})

test('reset brings it home and leaves no translate behind', async () => {
  const { el, drag, rested } = setup()
  drag.throwTo({ x: 120, y: 0 })
  await rested()
  drag.reset()
  expect(await rested()).toEqual({ x: 0, y: 0 })
  expect(el.style.translate).toBe('')
})

test('reset without animation is there at once', () => {
  const { el, drag } = setup()
  drag.reset({ animate: false })
  expect([drag.x.value, drag.y.value]).toEqual([0, 0])
  expect(el.style.translate).toBe('')
})

test('one axis leaves the page the other: touch-action follows the axis', () => {
  expect(setup({ axis: 'x' }).el.style.touchAction).toBe('pan-y')
  expect(setup({ axis: 'y' }).el.style.touchAction).toBe('pan-x')
  expect(setup().el.style.touchAction).toBe('none')
})

test('x follows every frame of a throw, so a v-animate getter can link to it', async () => {
  const seen: number[] = []
  const { drag, rested } = setup()
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => watchEffect(() => seen.push(drag.x.value)))
  drag.throwTo({ x: 200, y: 0 })
  await rested()
  expect(seen.length).toBeGreaterThan(3)
  expect(seen.at(-1)).toBe(200)
})
// Synthetic pointer events: a press on the element, moves and the release on the window.
const press = (el: Element, x: number, y: number) =>
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      clientX: x,
      clientY: y,
      button: 0,
      bubbles: true,
    }),
  )
const move = (x: number, y: number) =>
  window.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, clientX: x, clientY: y, bubbles: true }),
  )
const release = (x: number, y: number) =>
  window.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, clientX: x, clientY: y, bubbles: true }),
  )

test('the element follows the pointer once past the threshold, catching up from under the finger', () => {
  const { el, drag } = setup()
  press(el, 100, 100)
  move(104, 100)
  expect(drag.x.value).toBe(0)
  // The first move past the threshold starts 8 px short, so it doesn't jump...
  move(160, 130)
  expect(drag.x.value).toBeGreaterThan(40)
  expect(drag.x.value).toBeLessThan(60)
  // ...and is on the finger within a few moves.
  for (let i = 0; i < 20; i++) move(160, 130)
  expect([Math.round(drag.x.value), Math.round(drag.y.value)]).toEqual([60, 30])
  expect(drag.isDragging.value).toBe(true)
  release(160, 130)
})

test('onRelease decides where it goes', async () => {
  const { el, drag, rested } = setup({ onRelease: () => ({ x: 500, y: 0 }) })
  press(el, 0, 0)
  move(40, 0)
  release(40, 0)
  expect(drag.isDragging.value).toBe(false)
  expect(await rested()).toEqual({ x: 500, y: 0 })
})

test('returning nothing sends it home', async () => {
  const { el, rested } = setup({ onRelease: () => null })
  press(el, 0, 0)
  move(60, 20)
  release(60, 20)
  expect(await rested()).toEqual({ x: 0, y: 0 })
})

test('Escape mid-drag puts it back without asking onRelease, and stops the drag', async () => {
  let asked = false
  const { el, drag, rested } = setup({ onRelease: () => ((asked = true), { x: 500, y: 0 }) })
  press(el, 0, 0)
  move(80, 0)
  const key = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  window.dispatchEvent(key)
  expect(key.defaultPrevented).toBe(true)
  expect(drag.isDragging.value).toBe(false)
  release(80, 0)
  expect(await rested()).toEqual({ x: 0, y: 0 })
  expect(asked).toBe(false)
})

test('with one axis, a drag that starts across it is left to the page', () => {
  const { el, drag } = setup({ axis: 'x' })
  press(el, 0, 0)
  move(2, 30)
  move(80, 40)
  expect(drag.isDragging.value).toBe(false)
  expect(drag.x.value).toBe(0)
})

test('the click a drag ends with is swallowed; a plain click is not', () => {
  const { el } = setup()
  let clicks = 0
  el.addEventListener('click', () => clicks++)
  press(el, 0, 0)
  release(0, 0)
  el.click()
  expect(clicks).toBe(1)
  press(el, 0, 0)
  move(60, 0)
  release(60, 0)
  el.click()
  expect(clicks).toBe(1)
})
