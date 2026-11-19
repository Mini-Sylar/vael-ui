// Resizable as a span: `edge="both"` puts a handle on each edge, `v-model:offset` positions it and
// moves it, and each handle pulls its own end.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef } from 'vue'
import Resizable from '../src/components/Resizable/Resizable.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const down = (el: Element, x: number) =>
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, pointerId: 1, bubbles: true }))
const move = (x: number) =>
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, pointerId: 1, bubbles: true }))
const up = (x: number) =>
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: x, pointerId: 1, bubbles: true }))

function bar() {
  const size = shallowRef(100)
  const offset = shallowRef(200)
  const commits = shallowRef(0)
  const Host = defineComponent(
    () => () =>
      h(
        'div',
        { style: 'position: relative; inline-size: 1000px; block-size: 40px' },
        h(
          Resizable,
          {
            size: size.value,
            'onUpdate:size': (v: number) => (size.value = v),
            offset: offset.value,
            'onUpdate:offset': (v: number | undefined) => (offset.value = v!),
            edge: 'both',
            min: 20,
            bounds: [0, 1000],
            onCommit: () => commits.value++,
          },
          () => 'Launch',
        ),
      ),
  )
  return { Host, size, offset, commits }
}

test('two handles, each with its own name, and the bar sits at its start', async () => {
  const { Host } = bar()
  const screen = await render(Host)
  const handles = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  expect(handles).toHaveLength(2)
  expect([...handles].map((el) => el.getAttribute('data-edge'))).toEqual(['start', 'end'])
  expect([...handles].map((el) => el.getAttribute('aria-label'))).toEqual([
    'Resize start',
    'Resize end',
  ])
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  expect(root.style.insetInlineStart).toBe('200px')
  expect(getComputedStyle(root).position).toBe('absolute')
})

test('the start handle moves the start and size together, the end handle grows the size', async () => {
  const { Host, size, offset, commits } = bar()
  const screen = await render(Host)
  const [start, end] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  down(start!, 0)
  move(-40)
  await frame()
  up(-40)
  expect([offset.value, size.value]).toEqual([160, 140])
  down(end!, 0)
  move(30)
  await frame()
  up(30)
  expect([offset.value, size.value]).toEqual([160, 170])
  expect(commits.value).toBe(2)
})

test('pressing the bar and dragging moves it whole; a still press stays a click', async () => {
  const { Host, size, offset } = bar()
  const screen = await render(Host)
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  expect(root.getAttribute('tabindex')).toBe('0')
  down(root, 0)
  move(60)
  await frame()
  up(60)
  expect([offset.value, size.value]).toEqual([260, 100])
})

test('without offset it is the panel it was: one handle, no tab stop on the panel', async () => {
  const screen = await render(Resizable, { props: { size: 100 }, slots: { default: () => 'x' } })
  expect(screen.container.querySelectorAll('.ui-resizable-handle')).toHaveLength(1)
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  expect(root.getAttribute('tabindex')).toBeNull()
  expect(root.classList.contains('ui-resizable--span')).toBe(false)
})

test('two handles with no offset: pulling the start handle leaves the far end where it was', async () => {
  const size = shallowRef(100)
  const Host = defineComponent(
    () => () =>
      h(
        'div',
        { style: 'padding-inline-start: 300px; inline-size: 800px' },
        h(Resizable, {
          size: size.value,
          'onUpdate:size': (v: number) => (size.value = v),
          edge: 'both',
          min: 20,
        }),
      ),
  )
  const screen = await render(Host)
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  const [start, end] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  const right = () => root.getBoundingClientRect().right
  const left = () => root.getBoundingClientRect().left
  const before = { left: left(), right: right() }
  down(start!, 0)
  move(-40)
  await frame()
  up(-40)
  expect(size.value).toBe(140)
  expect(right()).toBeCloseTo(before.right, 0)
  expect(left()).toBeCloseTo(before.left - 40, 0)
  down(end!, 0)
  move(25)
  await frame()
  up(25)
  expect(size.value).toBe(165)
  expect(left()).toBeCloseTo(before.left - 40, 0)
  expect(right()).toBeCloseTo(before.right + 25, 0)
})

test('two handles in a centred container: the edge you do not pull stays put on screen', async () => {
  const size = shallowRef(100)
  const Host = defineComponent(
    () => () =>
      h(
        'div',
        { style: 'display: flex; justify-content: center; inline-size: 800px' },
        h(Resizable, {
          size: size.value,
          'onUpdate:size': (v: number) => (size.value = v),
          edge: 'both',
          min: 20,
        }),
      ),
  )
  const screen = await render(Host)
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  const [start, end] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  const box = () => root.getBoundingClientRect()
  const before = { left: box().left, right: box().right }
  down(start!, 0)
  move(-40)
  await frame()
  await frame()
  up(-40)
  expect(box().right).toBeCloseTo(before.right, 0)
  expect(box().left).toBeCloseTo(before.left - 40, 0)
  const mid = { left: box().left, right: box().right }
  down(end!, 0)
  move(30)
  await frame()
  await frame()
  up(30)
  expect(box().left).toBeCloseTo(mid.left, 0)
  expect(box().right).toBeCloseTo(mid.right + 30, 0)
})

test('two handles with no offset: pulled past min it stops there, and does not flip over', async () => {
  const size = shallowRef(200)
  const Host = defineComponent(
    () => () =>
      h(
        'div',
        { style: 'padding-inline-start: 300px; inline-size: 800px' },
        h(Resizable, {
          size: size.value,
          'onUpdate:size': (v: number) => (size.value = v),
          edge: 'both',
          min: 120,
        }),
      ),
  )
  const screen = await render(Host)
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  const [start] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  const right = root.getBoundingClientRect().right
  down(start!, 0)
  move(100)
  await frame()
  await frame()
  move(220)
  await frame()
  await frame()
  up(220)
  // Past the far end, it is at its minimum with the far end still in place, not grown the other way.
  expect(size.value).toBe(120)
  expect(root.getBoundingClientRect().right).toBeCloseTo(right, 0)
})

test('a bound-offset span still flips over its other end', async () => {
  const { Host, size, offset } = bar()
  const screen = await render(Host)
  const [start] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  down(start!, 0)
  move(160)
  await frame()
  await frame()
  up(160)
  // The start was pulled across the end at 300: the span flipped over it, a minimum apart, and
  // now grows the other way from there.
  expect(offset.value).toBe(280)
  expect(size.value).toBe(100)
})

test('two handles with no offset: it stops at its container and can still be grabbed', async () => {
  const size = shallowRef(100)
  const Host = defineComponent(
    () => () =>
      h(
        'div',
        {
          'data-stage': '',
          style: 'padding-inline-start: 200px; inline-size: 800px; border: 2px solid #000',
        },
        h(Resizable, {
          size: size.value,
          'onUpdate:size': (v: number) => (size.value = v),
          edge: 'both',
          min: 20,
        }),
      ),
  )
  const screen = await render(Host)
  const stage = screen.container.querySelector<HTMLElement>('[data-stage]')!
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  const [start, end] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  const inner = stage.getBoundingClientRect().left + 2
  down(start!, 0)
  // Far past the container's edge.
  move(-900)
  await frame()
  await frame()
  up(-900)
  await frame()
  await frame()
  expect(root.getBoundingClientRect().left).toBeGreaterThanOrEqual(inner - 0.5)
  // It sits at the edge, not outside, and the handle can be pulled back.
  down(start!, 0)
  move(60)
  await frame()
  await frame()
  up(60)
  await frame()
  await frame()
  expect(root.getBoundingClientRect().left).toBeGreaterThan(inner + 50)
  // Nor does the end handle take it past the right edge.
  const right = stage.getBoundingClientRect().right - 2
  down(end!, 0)
  move(2000)
  await frame()
  await frame()
  up(2000)
  await frame()
  await frame()
  expect(root.getBoundingClientRect().right).toBeLessThanOrEqual(right + 0.5)
})

test('centered: the pulled edge follows the pointer and the opposite edge mirrors it', async () => {
  const size = shallowRef(100)
  const Host = defineComponent(
    () => () =>
      h(
        'div',
        { style: 'display: flex; justify-content: center; inline-size: 800px' },
        h(Resizable, {
          size: size.value,
          'onUpdate:size': (v: number) => (size.value = v),
          edge: 'both',
          centered: true,
          min: 20,
        }),
      ),
  )
  const screen = await render(Host)
  const root = screen.container.querySelector<HTMLElement>('.ui-resizable')!
  const [start, end] = screen.container.querySelectorAll<HTMLElement>('.ui-resizable-handle')
  const before = root.getBoundingClientRect()
  const centre = (before.left + before.right) / 2
  down(end!, 0)
  move(30)
  await frame()
  await frame()
  up(30)
  await frame()
  await frame()
  let box = root.getBoundingClientRect()
  // The end edge went 30 right and the start edge 30 left: the centre did not move.
  expect(size.value).toBe(160)
  expect(box.right).toBeCloseTo(before.right + 30, 0)
  expect(box.left).toBeCloseTo(before.left - 30, 0)
  down(start!, 0)
  move(-20)
  await frame()
  await frame()
  up(-20)
  await frame()
  await frame()
  box = root.getBoundingClientRect()
  expect(size.value).toBe(200)
  expect((box.left + box.right) / 2).toBeCloseTo(centre, 0)
})
