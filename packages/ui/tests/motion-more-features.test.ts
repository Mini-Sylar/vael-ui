import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, vShow, withDirectives } from 'vue'
import AnimatedText from '../src/components/AnimatedText/AnimatedText.vue'
import { useScrollProgress } from '../src/motion/useScrollProgress'
import { vAnimate } from '../src/motion/vAnimate'
import type { AnimateDirectiveValue } from '../src/motion/types'

const MS = 300
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
afterEach(() => {
  document.body.innerHTML = ''
  scrollTo(0, 0)
})

test('onStart runs as the entrance starts, after its delay, then onAfterEnter', async () => {
  const order: string[] = []
  const shown = shallowRef(false)
  render(() =>
    shown.value
      ? withDirectives(h('span', 'Hi'), [
          [
            vAnimate,
            {
              initial: { opacity: 0 },
              duration: MS,
              delay: 0.2,
              onStart: () => order.push(`start ${Math.round(performance.now() - t0)}`),
              onAfterEnter: () => order.push('end'),
            },
          ],
        ])
      : null,
  )
  const t0 = performance.now()
  shown.value = true
  await vi.waitFor(() => expect(order).toHaveLength(2), { timeout: 2000 })
  expect(order[1]).toBe('end')
  // Not at mount: after its 200 ms delay.
  expect(Number(order[0]!.split(' ')[1])).toBeGreaterThanOrEqual(160)
})

test('states.inView holds its look while in view, by its viewport', async () => {
  const value: AnimateDirectiveValue = {
    states: { inView: { opacity: 0.5 } },
    viewport: { amount: 'all' },
    duration: 50,
  }
  render(() =>
    h('div', [
      h('div', { style: 'height: 150vh' }),
      withDirectives(h('div', { class: 'card', style: 'height: 100px' }, 'Card'), [
        [vAnimate, value],
      ]),
    ]),
  )
  const card = () => document.querySelector<HTMLElement>('.card')!
  await wait(300)
  expect(getComputedStyle(card()).opacity).toBe('1')
  card().scrollIntoView({ block: 'center' })
  await vi.waitFor(() => expect(getComputedStyle(card()).opacity).toBe('0.5'), { timeout: 2000 })
  scrollTo(0, 0)
  await vi.waitFor(() => expect(getComputedStyle(card()).opacity).toBe('1'), { timeout: 2000 })
})

test('useScrollProgress follows the page, and a progress getter scrubs without re-rendering', async () => {
  let renders = 0
  let progress: ReturnType<typeof useScrollProgress> | undefined
  render(
    defineComponent({
      setup() {
        progress = useScrollProgress()
        return () => {
          renders++
          return h('div', [
            withDirectives(h('div', { class: 'bar' }), [
              [vAnimate, { animate: { opacity: [0, 1] }, progress: () => progress!.value }],
            ]),
            h('div', { style: 'height: 300vh' }),
          ])
        }
      },
    }),
  )
  await wait(200)
  const rendersBefore = renders
  const max = document.documentElement.scrollHeight - innerHeight
  scrollTo(0, max / 2)
  await vi.waitFor(() => expect(progress!.value).toBeCloseTo(0.5, 1))
  await vi.waitFor(() =>
    expect(Number(getComputedStyle(document.querySelector('.bar')!).opacity)).toBeCloseTo(0.5, 1),
  )
  expect(renders).toBe(rendersBefore)
})

test("useScrollProgress tracks an element's way through the viewport", async () => {
  let progress: ReturnType<typeof useScrollProgress> | undefined
  render(
    defineComponent({
      setup() {
        const el = shallowRef<HTMLElement | null>(null)
        progress = useScrollProgress(el)
        return () =>
          h('div', [
            h('div', { style: 'height: 100vh' }),
            h('div', { ref: el, style: 'height: 100px' }),
            h('div', { style: 'height: 200vh' }),
          ])
      },
    }),
  )
  await wait(100)
  // Not entered yet: 0. Its top at the viewport's bottom is the start.
  expect(progress!.value).toBe(0)
  // Scrolled past it entirely: 1.
  scrollTo(0, innerHeight + 200)
  await vi.waitFor(() => expect(progress!.value).toBe(1))
})

test('useScrollProgress stays at the top when the page grows after it mounts', async () => {
  let progress: ReturnType<typeof useScrollProgress> | undefined
  const tall = shallowRef(false)
  render(
    defineComponent({
      setup() {
        progress = useScrollProgress()
        // Short at mount, as a page is before its rows load.
        return () => h('div', { style: `height: ${tall.value ? '300vh' : '10px'}` })
      },
    }),
  )
  await wait(100)
  tall.value = true
  await vi.waitFor(() => expect(progress!.value).toBe(0))
  scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2)
  await vi.waitFor(() => expect(progress!.value).toBeCloseTo(0.5, 1))
})

test('useScrollProgress in a container follows its content growing', async () => {
  let progress: ReturnType<typeof useScrollProgress> | undefined
  const tall = shallowRef(false)
  render(
    defineComponent({
      setup() {
        const box = shallowRef<HTMLElement | null>(null)
        progress = useScrollProgress(undefined, { container: box })
        return () =>
          h('div', { ref: box, style: 'height: 200px; overflow: auto' }, [
            h('div', { style: `height: ${tall.value ? 1000 : 10}px` }),
          ])
      },
    }),
  )
  await wait(100)
  tall.value = true
  await vi.waitFor(() => expect(progress!.value).toBe(0))
})

test('layout: true eases a change of its own size, not only its place', async () => {
  const open = shallowRef(false)
  render(() =>
    withDirectives(
      h('div', { class: 'card', style: `height: ${open.value ? 200 : 100}px` }, 'Card'),
      [[vAnimate, { layout: true, duration: MS }]],
    ),
  )
  await wait(100)
  open.value = true
  await nextTick()
  await wait(MS / 3)
  const height = document.querySelector<HTMLElement>('.card')!.getBoundingClientRect().height
  expect(height).toBeGreaterThan(105)
  expect(height).toBeLessThan(195)
})

test('.size eases to a new width when its content sizes it', async () => {
  const label = shallowRef('Hi')
  render(() =>
    h('div', [
      withDirectives(
        h('span', { class: 'pill', style: 'display: inline-block' }, [h('span', label.value)]),
        [[vAnimate, { duration: MS }, undefined, { size: true }]],
      ),
    ]),
  )
  await wait(100)
  const pill = () => document.querySelector<HTMLElement>('.pill')!
  const before = pill().getBoundingClientRect().width
  label.value = 'A much longer label than before'
  await nextTick()
  await wait(MS / 3)
  const mid = pill().getBoundingClientRect().width
  await wait(MS)
  const after = pill().getBoundingClientRect().width
  expect(mid).toBeGreaterThan(before + 1)
  expect(mid).toBeLessThan(after - 1)
})

test('v-show: hiding plays its exit on a copy, showing plays its entrance', async () => {
  const onAfterLeave = vi.fn()
  const onAfterEnter = vi.fn()
  const visible = shallowRef(true)
  render(() =>
    h('div', [
      withDirectives(h('p', { class: 'note' }, 'Saved'), [
        [vShow, visible.value],
        [vAnimate, { initial: { opacity: 0 }, duration: MS, onAfterLeave, onAfterEnter }],
      ]),
    ]),
  )
  await wait(MS + 100)
  onAfterEnter.mockClear()
  visible.value = false
  await nextTick()
  await wait(MS / 3)
  // The element is hidden; a copy fades where it was.
  const copies = [...document.querySelectorAll('p.note')].filter(
    (p) => (p as HTMLElement).style.display !== 'none',
  )
  expect(copies).toHaveLength(1)
  expect(Number(getComputedStyle(copies[0]!).opacity)).toBeLessThan(1)
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(document.querySelectorAll('p.note')).toHaveLength(1)
  visible.value = true
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
})

test('layout slides by the move, not by how far its scrolling container has scrolled', async () => {
  const items = shallowRef([1, 2, 3])
  render(() =>
    h('div', { class: 'box', style: 'height: 120px; overflow: auto' }, [
      h('div', { style: 'height: 300px' }),
      ...items.value.map((n) =>
        withDirectives(h('div', { key: n, class: `row row-${n}`, style: 'height: 40px' }, `${n}`), [
          [vAnimate, { layout: 'position', duration: MS }],
        ]),
      ),
    ]),
  )
  await wait(100)
  document.querySelector('.box')!.scrollTop = 250
  await wait(100)
  items.value = [0, 1, 2, 3]
  await nextTick()
  await wait(20)
  // Row 1 moved down by one row (40px): it starts from about 40px above its new place.
  const run = document
    .querySelector('.row-1')!
    .getAnimations()
    .find((a) => a.id === 'ui-layout')
  expect(run).toBeDefined()
  const from = (run!.effect as KeyframeEffect).getKeyframes()[0]!.translate as string
  expect(Number.parseFloat(from.split(' ')[1]!)).toBeCloseTo(-40, 0)
})

test('AnimatedText split: words in pieces, read whole, coming in one after another', async () => {
  const value = shallowRef('Saved two files')
  render(() => h(AnimatedText, { value: value.value, split: 'words' }), {
    global: { stubs: { transition: false } },
  })
  await wait(50)
  // First render: no entrance.
  expect(document.querySelector('[data-enter]')).toBeNull()
  value.value = 'Saved three files'
  await nextTick()
  const pieces = [...document.querySelectorAll<HTMLElement>('[data-enter] .ui-animated-text-piece')]
  expect(pieces.map((p) => p.textContent)).toEqual(['Saved', 'three', 'files'])
  expect(pieces[2]!.style.getPropertyValue('--ui-piece')).toBe('2')
  expect(document.querySelector('[data-enter] .ui-animated-text-read')!.textContent).toBe(
    'Saved three files',
  )
  expect(pieces[0]!.closest('[aria-hidden="true"]')).not.toBeNull()
})

test("AnimatedText split by letters keeps each word's letters together", async () => {
  render(() => h(AnimatedText, { value: 'Hi you', split: 'letters' }))
  await wait(50)
  const words = [...document.querySelectorAll('.ui-animated-text-word')]
  expect(words.map((w) => w.querySelectorAll('.ui-animated-text-piece').length)).toEqual([2, 3])
})
