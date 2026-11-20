// A span has two handles: one useResizable, with each handle naming its edge when pressed or keyed.
import { expect, test } from 'vitest'
import { effectScope, shallowRef } from 'vue'
import { useResizable } from '../src/composables/useResizable'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const down = (el: Element, x: number) =>
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, pointerId: 1, bubbles: true }))
const move = (x: number) =>
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, pointerId: 1, bubbles: true }))
const up = (x: number) =>
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: x, pointerId: 1, bubbles: true }))
const key = (el: Element, name: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))

function setup(options: Parameters<typeof useResizable>[1] = {}) {
  const size = shallowRef(100)
  const offset = shallowRef(200)
  const scope = effectScope()
  const bar = scope.run(() =>
    useResizable(size, { offset, bounds: [0, 1000], min: 20, ...options }),
  )!
  const el = document.createElement('div')
  document.body.append(el)
  return { size, offset, bar, el, scope }
}

test('one instance: a handle that names start pulls the start, one that names end pulls the end', async () => {
  const { size, offset, bar, el, scope } = setup()
  const grab = (edge: 'start' | 'end') => (event: Event) =>
    bar.onHandlePointerdown(event as PointerEvent, edge)
  const onStart = grab('start')
  el.addEventListener('pointerdown', onStart)
  down(el, 0)
  move(-40)
  await frame()
  // The far end stays put at 300.
  expect([offset.value, size.value]).toEqual([160, 140])
  up(-40)
  el.removeEventListener('pointerdown', onStart)

  const onEnd = grab('end')
  el.addEventListener('pointerdown', onEnd)
  down(el, 0)
  move(30)
  await frame()
  expect([offset.value, size.value]).toEqual([160, 170])
  up(30)
  scope.stop()
})

test('without a named edge it is the edge option, so a lone handle works as before', async () => {
  const { size, bar, el, scope } = setup({ edge: 'end' })
  el.addEventListener('pointerdown', bar.onHandlePointerdown)
  down(el, 0)
  move(25)
  await frame()
  expect(size.value).toBe(125)
  up(25)
  scope.stop()
})

test('the keys follow the named edge', () => {
  const { size, offset, bar, el, scope } = setup({ step: 20 })
  el.addEventListener('keydown', (event) => bar.onHandleKeydown(event, 'start'))
  key(el, 'ArrowLeft')
  // The start moves left a step and the size grows with it; the end stays at 300.
  expect([offset.value, size.value]).toEqual([180, 120])
  scope.stop()
  const second = setup({ step: 20 })
  second.el.addEventListener('keydown', (event) => second.bar.onHandleKeydown(event, 'end'))
  key(second.el, 'ArrowRight')
  expect([second.offset.value, second.size.value]).toEqual([200, 120])
  second.scope.stop()
})

test('an argument that is not an edge is ignored', async () => {
  const { size, bar, el, scope } = setup({ edge: 'end' })
  // Passed straight to a listener that hands extra arguments.
  el.addEventListener('pointerdown', (event) =>
    (bar.onHandlePointerdown as (...a: unknown[]) => void)(event, 0),
  )
  down(el, 0)
  move(10)
  await frame()
  expect(size.value).toBe(110)
  up(10)
  scope.stop()
})

test('centered: the size changes twice as far as the pointer, and a span keeps its middle', async () => {
  const { size, offset, bar, el, scope } = setup({ centered: true })
  el.addEventListener('pointerdown', (event) => bar.onHandlePointerdown(event, 'end'))
  down(el, 0)
  move(30)
  await frame()
  up(30)
  // 100 + 2 * 30, and the start moved back 30 so the middle stays at 250.
  expect([offset.value, size.value]).toEqual([170, 160])
  scope.stop()
})

test('centered: the keys grow it from the middle too', () => {
  const { size, offset, bar, el, scope } = setup({ centered: true, step: 20 })
  el.addEventListener('keydown', (event) => bar.onHandleKeydown(event, 'end'))
  key(el, 'ArrowRight')
  // The end moves a step, and the start the same step the other way.
  expect([offset.value, size.value]).toEqual([180, 140])
  scope.stop()
})
