// useResizable with a pair of sizes: one handle drags both axes (a window's corner).
import { expect, test } from 'vitest'
import { effectScope, shallowRef } from 'vue'
import { useResizable } from '../src/composables/useResizable'

const pointerId = 1
const down = (el: Element, x: number, y: number) =>
  el.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId, bubbles: true }),
  )
const move = (x: number, y: number) =>
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId, bubbles: true }),
  )
const up = (x: number, y: number) =>
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId, bubbles: true }),
  )
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function setup() {
  const width = shallowRef(300)
  const height = shallowRef(200)
  const left = shallowRef(100)
  const top = shallowRef(50)
  const commits: number[] = []
  const scope = effectScope()
  const win = scope.run(() =>
    useResizable(
      { horizontal: width, vertical: height },
      {
        horizontal: { offset: left, min: 100, flip: false },
        vertical: { offset: top, min: 80, flip: false },
        onCommit: () => commits.push(1),
      },
    ),
  )!
  const el = document.createElement('div')
  document.body.append(el)
  return { width, height, left, top, win, el, commits, scope }
}

test('a corner resizes both axes from one press, the opposite corner staying put', async () => {
  const { width, height, left, top, win, el, commits, scope } = setup()
  el.addEventListener('pointerdown', (e) => win.onHandlePointerdown(e, 'se'))
  down(el, 0, 0)
  move(40, 25)
  await frame()
  expect([width.value, height.value]).toEqual([340, 225])
  expect([left.value, top.value]).toEqual([100, 50])
  expect(win.isDragging.value).toBe(true)
  up(40, 25)
  expect(win.isDragging.value).toBe(false)
  await Promise.resolve()
  expect(commits).toHaveLength(1) // one release, one commit
  scope.stop()
})

test('the top-left corner moves the start and the size on both axes', async () => {
  const { width, height, left, top, win, el, scope } = setup()
  el.addEventListener('pointerdown', (e) => win.onHandlePointerdown(e, 'nw'))
  down(el, 0, 0)
  move(-30, -20)
  await frame()
  expect([left.value, top.value]).toEqual([70, 30])
  expect([width.value, height.value]).toEqual([330, 220])
  up(-30, -20)
  scope.stop()
})

test('a side names one axis and leaves the other alone', async () => {
  const { width, height, win, el, scope } = setup()
  el.addEventListener('pointerdown', (e) => win.onHandlePointerdown(e, 's'))
  down(el, 0, 0)
  move(60, 40)
  await frame()
  expect([width.value, height.value]).toEqual([300, 240])
  up(60, 40)
  scope.stop()
})

test('Escape puts both axes back', async () => {
  const { width, height, win, el, scope } = setup()
  el.addEventListener('pointerdown', (e) => win.onHandlePointerdown(e, 'se'))
  down(el, 0, 0)
  move(50, 50)
  await frame()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect([width.value, height.value]).toEqual([300, 200])
  scope.stop()
})

test('each axis keeps its own min', async () => {
  const { width, height, win, el, scope } = setup()
  el.addEventListener('pointerdown', (e) => win.onHandlePointerdown(e, 'se'))
  down(el, 0, 0)
  move(-500, -500)
  await frame()
  up(-500, -500)
  expect([width.value, height.value]).toEqual([100, 80])
  scope.stop()
})

test('the arrow keys on a side resize that axis', () => {
  const { width, height, win, el, scope } = setup()
  el.addEventListener('keydown', (e) => win.onHandleKeydown(e, 'e'))
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  expect([width.value, height.value]).toEqual([316, 200])
  scope.stop()
})

test('one size still works as before', async () => {
  const size = shallowRef(100)
  const scope = effectScope()
  const one = scope.run(() => useResizable(size, { min: 20 }))!
  const el = document.createElement('div')
  document.body.append(el)
  el.addEventListener('pointerdown', (e) => one.onHandlePointerdown(e))
  down(el, 0, 0)
  move(25, 0)
  await frame()
  expect(size.value).toBe(125)
  up(25, 0)
  scope.stop()
})

test("right to left, west is the screen's left, the trailing edge", async () => {
  const { width, left, win, el, scope } = setup()
  el.dir = 'rtl'
  el.addEventListener('pointerdown', (e) => win.onHandlePointerdown(e, 'w'))
  down(el, 0, 0)
  move(-40, 0) // pulling the screen's left edge further left grows it
  await frame()
  expect(width.value).toBe(340)
  expect(left.value).toBe(100)
  up(-40, 0)
  scope.stop()
})
