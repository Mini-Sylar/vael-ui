// useResizable as a span (a timeline bar): offset + bounds, step snapping, Escape, move, edge scroll.
import { expect, test, vi } from 'vitest'
import { effectScope, shallowRef, watch } from 'vue'
import { useResizable } from '../src/composables/useResizable'

const pointerId = 1
const down = (el: Element, x: number) =>
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, pointerId, bubbles: true }))
const move = (x: number) =>
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, pointerId, bubbles: true }))
const up = (x: number) =>
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: x, pointerId, bubbles: true }))
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function setup(extra: Parameters<typeof useResizable>[1] = {}) {
  const size = shallowRef(100)
  const offset = shallowRef(200)
  const commits: string[] = []
  const scope = effectScope()
  const [start, end] = scope.run(() => {
    const common = { offset, bounds: [0, 1000] as [number, number], step: 20, min: 20, ...extra }
    return [
      useResizable(size, { ...common, edge: 'start', onCommit: () => commits.push('start') }),
      useResizable(size, { ...common, edge: 'end', onCommit: () => commits.push('end') }),
    ]
  })!
  const el = document.createElement('div')
  document.body.append(el)
  const handlers = (fns: Record<string, (event: never) => void>) => {
    for (const [type, fn] of Object.entries(fns)) el.addEventListener(type, fn as EventListener)
  }
  return { size, offset, start, end, el, handlers, commits, scope }
}

test('the start handle moves the start and the size together; the far end stays put', async () => {
  const { size, offset, start, el, handlers, commits } = setup()
  handlers({ pointerdown: start.onHandlePointerdown })
  down(el, 0)
  move(-33)
  await frame()
  // Smooth while dragging: no step yet.
  expect(offset.value).toBe(167)
  expect(size.value).toBe(133)
  up(-33)
  // Snapped on release, the end still at 300.
  expect(offset.value).toBe(160)
  expect(size.value).toBe(140)
  expect(commits).toEqual(['start'])
})

test('one model write a frame, however many pointer events', async () => {
  const { size, end, el, handlers } = setup()
  handlers({ pointerdown: end.onHandlePointerdown })
  let writes = 0
  const stop = watch(size, () => writes++, { flush: 'sync' })
  down(el, 0)
  for (let x = 1; x <= 30; x++) move(x)
  await frame()
  expect(writes).toBe(1)
  expect(size.value).toBe(130)
  up(30)
  stop()
})

test('Escape puts it back, and the window keydown never reaches the page', async () => {
  const { size, offset, start, el, handlers, commits } = setup()
  handlers({ pointerdown: start.onHandlePointerdown })
  const heard = vi.fn()
  document.addEventListener('keydown', heard)
  down(el, 0)
  move(-50)
  await frame()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect([offset.value, size.value]).toEqual([200, 100])
  expect(start.isDragging.value).toBe(false)
  expect(commits).toEqual([])
  up(-50)
  expect([offset.value, size.value]).toEqual([200, 100])
  document.removeEventListener('keydown', heard)
  expect(heard).not.toHaveBeenCalled()
})

test('a move keeps the size, stays within bounds, and a still press stays a click', async () => {
  const { size, offset, end, el, handlers } = setup()
  handlers({ pointerdown: end.onMovePointerdown })
  const clicked = vi.fn()
  el.addEventListener('click', clicked)
  // A still press: no drag, and its click goes through.
  down(el, 0)
  move(2)
  up(2)
  expect(end.isDragging.value).toBe(false)
  el.click()
  expect(clicked).toHaveBeenCalledTimes(1)
  // A real move: past the end bound it stops, and the click after it is swallowed.
  down(el, 0)
  move(5000)
  await frame()
  expect(end.isDragging.value).toBe(true)
  expect([offset.value, size.value]).toEqual([900, 100])
  up(5000)
  el.click()
  expect(clicked).toHaveBeenCalledTimes(1)
  el.click()
  expect(clicked).toHaveBeenCalledTimes(2)
})

test('arrow keys: a step on a handle, and on the whole span', () => {
  const { size, offset, start, end, el, handlers } = setup()
  handlers({ keydown: end.onHandleKeydown })
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  expect([offset.value, size.value]).toEqual([200, 120])
  const other = document.createElement('div')
  document.body.append(other)
  other.addEventListener('keydown', start.onHandleKeydown)
  other.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  expect([offset.value, size.value]).toEqual([180, 140])
  other.removeEventListener('keydown', start.onHandleKeydown)
  other.addEventListener('keydown', start.onMoveKeydown)
  other.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  expect([offset.value, size.value]).toEqual([200, 140])
})

test('near the scroll container edge it scrolls, and the drag follows', async () => {
  const box = document.createElement('div')
  box.style.cssText = 'width: 300px; height: 40px; overflow: auto; position: fixed; left: 0; top: 0'
  box.innerHTML = '<div style="width: 3000px; height: 10px"></div>'
  document.body.append(box)
  const { size, end, el, handlers, scope } = setup({ scrollEl: box, bounds: [0, 5000] })
  handlers({ pointerdown: end.onHandlePointerdown })
  down(el, 100)
  move(295)
  await vi.waitFor(() => expect(box.scrollLeft).toBeGreaterThan(40))
  // The size takes in the scrolled distance, as if the pointer had gone that much further.
  await frame()
  const scrolled = box.scrollLeft
  expect(Math.abs(size.value - (100 + 195 + scrolled))).toBeLessThanOrEqual(18)
  up(150)
  const after = box.scrollLeft
  await frame()
  await frame()
  // Released: the loop stopped.
  expect(box.scrollLeft).toBe(after)
  scope.stop()
  box.remove()
})

test('disposed mid-drag: nothing left listening or ticking', async () => {
  const { size, end, el, handlers, scope } = setup()
  handlers({ pointerdown: end.onHandlePointerdown })
  down(el, 0)
  move(40)
  scope.stop()
  await frame()
  move(80)
  await frame()
  expect(size.value).toBe(100)
})

test('the click a resize release makes is swallowed, and only that one', async () => {
  const { end, el, handlers } = setup()
  handlers({ pointerdown: end.onHandlePointerdown })
  const clicked = vi.fn()
  document.body.addEventListener('click', clicked)
  down(el, 0)
  move(40)
  await frame()
  up(40)
  el.click()
  expect(clicked).not.toHaveBeenCalled()
  // A release with no click after it: the next tick disarms it.
  down(el, 0)
  move(40)
  await frame()
  up(40)
  await new Promise((resolve) => setTimeout(resolve))
  el.click()
  expect(clicked).toHaveBeenCalledTimes(1)
  document.body.removeEventListener('click', clicked)
})

test('Escape mid-drag: the release that follows does not click', async () => {
  const { end, el, handlers } = setup()
  handlers({ pointerdown: end.onMovePointerdown })
  const clicked = vi.fn()
  el.addEventListener('click', clicked)
  down(el, 0)
  move(60)
  await frame()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await frame()
  up(60)
  el.click()
  expect(clicked).not.toHaveBeenCalled()
  // Released outside the window: the next press disarms it.
  down(el, 0)
  move(60)
  await frame()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  down(el, 0)
  up(0)
  el.click()
  expect(clicked).toHaveBeenCalledTimes(1)
})

test('pulled past min, a handle flips the span over its other end', async () => {
  // A one-step span at 200, as a press on an empty row makes it.
  const { size, offset, start, end, el, handlers } = setup()
  size.value = 20
  handlers({ pointerdown: end.onHandlePointerdown })
  down(el, 0)
  move(-10)
  await frame()
  // No jump at the flip: the start follows the pointer, the far end stays at 220.
  expect([offset.value, size.value]).toEqual([190, 30])
  move(-65)
  await frame()
  expect([offset.value, size.value]).toEqual([135, 85])
  up(-65)
  expect([offset.value, size.value]).toEqual([140, 80])
  // The start handle the other way: the end follows.
  const other = document.createElement('div')
  document.body.append(other)
  other.addEventListener('pointerdown', start.onHandlePointerdown as EventListener)
  down(other, 0)
  move(125)
  await frame()
  expect([offset.value, size.value]).toEqual([200, 85])
  up(125)
  expect([offset.value, size.value]).toEqual([200, 80])
})
