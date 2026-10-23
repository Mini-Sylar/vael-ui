import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/directives/vAnimate'

const sizing = (el: Element | null) => (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-size')
const frame = () => new Promise(requestAnimationFrame)

afterEach(() => {
  document.body.innerHTML = ''
})

function box(initialRows: number) {
  const rows = shallowRef(initialRows)
  const width = shallowRef(300)
  render({
    setup: () => () =>
      withDirectives(
        h(
          'section',
          {
            'data-testid': 'box',
            style: { width: `${width.value}px`, padding: '8px', border: '1px solid' },
          },
          Array.from({ length: rows.value }, (_, i) =>
            h('p', { key: i, 'data-row': '', style: { margin: 0, height: '20px' } }, `row ${i}`),
          ),
        ),
        [[vAnimate, { duration: 300, easing: 'linear' }, undefined, { size: true }]],
      ),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="box"]')!
  return { rows, width, el }
}

test('v-animate.size: the box eases to its content height, children unstretched', async () => {
  const { rows, el } = box(1)
  await frame()
  const before = el().getBoundingClientRect().height
  rows.value = 4
  await nextTick()
  await frame()
  expect(sizing(el()).length).toBe(1)
  // Mid-way it's between the two heights, and every row keeps its own 20px.
  const mid = el().getBoundingClientRect().height
  expect(mid).toBeGreaterThan(before)
  expect(mid).toBeLessThan(before + 60)
  for (const row of el().querySelectorAll('[data-row]'))
    expect(row.getBoundingClientRect().height).toBe(20)
  await vi.waitFor(() => expect(sizing(el())).toHaveLength(0), { timeout: 1000 })
  expect(el().getBoundingClientRect().height).toBeCloseTo(before + 60, 0)
})

test('v-animate.size: more content mid-way carries on from what is showing', async () => {
  const { rows, el } = box(1)
  await frame()
  const start = el().getBoundingClientRect().height
  rows.value = 3
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 120))
  rows.value = 6
  await nextTick()
  // Every frame after: it never drops back and never leaps; it ends at all six rows.
  const heights: number[] = [el().getBoundingClientRect().height]
  for (let i = 0; i < 40; i++) {
    await frame()
    heights.push(el().getBoundingClientRect().height)
  }
  for (let i = 1; i < heights.length; i++) {
    expect(heights[i]!).toBeGreaterThanOrEqual(heights[i - 1]! - 0.5)
    expect(heights[i]! - heights[i - 1]!).toBeLessThan(25)
  }
  await vi.waitFor(() => expect(sizing(el())).toHaveLength(0), { timeout: 1500 })
  expect(el().getBoundingClientRect().height).toBeCloseTo(start + 100, 0)
})

test('v-animate.size: a width change is layout, not content, and never animates', async () => {
  const width = shallowRef(400)
  render({
    setup: () => () =>
      withDirectives(
        h('section', { 'data-testid': 'wrap', style: { width: `${width.value}px` } }, [
          h(
            'p',
            { style: { margin: 0 } },
            'A sentence long enough to wrap onto more lines when narrow.',
          ),
        ]),
        [[vAnimate, undefined, undefined, { size: true }]],
      ),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="wrap"]')!
  await frame()
  const before = el().getBoundingClientRect().height
  width.value = 90
  await nextTick()
  await frame()
  // It did get taller, at once, without animating.
  expect(el().getBoundingClientRect().height).toBeGreaterThan(before)
  expect(sizing(el())).toHaveLength(0)
})

test('v-animate.size: content arriving in a box sized by it (a flex item) animates, width and all', async () => {
  const shown = shallowRef(false)
  render({
    setup: () => () =>
      h('div', { style: { display: 'flex' } }, [
        withDirectives(
          h(
            'div',
            { 'data-testid': 'wrap' },
            shown.value ? [h('p', { style: { margin: 0 } }, 'Tools')] : [],
          ),
          [[vAnimate, undefined, undefined, { size: true }]],
        ),
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="wrap"]')!
  await frame()
  shown.value = true
  await nextTick()
  await frame()
  expect(sizing(el())).toHaveLength(1)
})

test('v-animate.size: shrinking a box with a child it stretches runs one animation, not a restart a frame', async () => {
  const tall = shallowRef(true)
  render({
    setup: () => () =>
      withDirectives(
        h('div', { 'data-testid': 'wrap', style: { display: 'flex', flexDirection: 'column' } }, [
          // Stretched by the box: it resizes as the box animates, an echo, not new content.
          h('div', { style: { flex: '1', minHeight: 0 } }, [
            h('div', { style: { height: tall.value ? '200px' : '60px' } }),
          ]),
        ]),
        [[vAnimate, { duration: 400, easing: 'linear' }, undefined, { size: true }]],
      ),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="wrap"]')!
  await frame()
  tall.value = false
  await nextTick()
  await frame()
  const first = sizing(el())[0]
  expect(first).toBeDefined()
  const from = (first!.effect as KeyframeEffect).getKeyframes()[0]!.height
  for (let i = 0; i < 6; i++) {
    await frame()
    const now = sizing(el())[0]
    expect(now).toBe(first)
    expect((now!.effect as KeyframeEffect).getKeyframes()[0]!.height).toBe(from)
  }
})

test('v-animate.size: what only shows past the content (an element mid-slide) never inflates the height', async () => {
  const shown = shallowRef(false)
  render({
    setup: () => () =>
      withDirectives(
        h('div', { 'data-testid': 'wrap' }, [
          h('div', { style: { height: '20px' } }),
          // 30px tall, painted 20px lower: overflow you see, not height it takes.
          shown.value ? h('div', { style: { height: '30px', translate: '0 20px' } }) : null,
        ]),
        [[vAnimate, { duration: 300, easing: 'linear' }, undefined, { size: true }]],
      ),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="wrap"]')!
  await frame()
  shown.value = true
  await nextTick()
  for (let i = 0; i < 8; i++) {
    await frame()
    for (const run of sizing(el()))
      expect((run.effect as KeyframeEffect).getKeyframes()[1]!.height).toBe('50px')
  }
})

test('v-animate.size clips only while growing, past the edges that move; shrinking shows what still moves', async () => {
  const shown = shallowRef(false)
  render({
    setup: () => () =>
      h('div', { style: { display: 'flex' } }, [
        withDirectives(
          h('div', { 'data-testid': 'pill' }, [
            h('span', 'Icon'),
            shown.value
              ? h('span', { style: { display: 'block', height: '40px' } }, 'Label')
              : null,
          ]),
          [[vAnimate, { duration: 300, easing: 'linear' }, undefined, { size: true }]],
        ),
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="pill"]')!
  await frame()
  shown.value = true
  await vi.waitFor(() => expect(sizing(el())).toHaveLength(1))
  const growing = (sizing(el())[0]!.effect as KeyframeEffect).getKeyframes()[0]!
  // Wider and taller: cut at the inline end and the bottom, open above and at the start.
  expect(growing.clipPath).toBe('inset(-100vmax 0px 0px -100vmax)')
  await vi.waitFor(() => expect(sizing(el())).toHaveLength(0), { timeout: 1000 })
  shown.value = false
  await vi.waitFor(() => expect(sizing(el())).toHaveLength(1))
  const shrinking = (sizing(el())[0]!.effect as KeyframeEffect).getKeyframes()[0]!
  expect(shrinking.clipPath).toBeUndefined()
  expect(shrinking.overflow).toBeUndefined()
})

test('v-animate.size: what leaves inside the box is clipped to it as it shrinks, then the box is itself again', async () => {
  const shown = shallowRef(true)
  render({
    setup: () => () =>
      h('div', { style: { display: 'flex' } }, [
        withDirectives(
          h('button', { 'data-testid': 'pill' }, [
            h('span', 'Icon'),
            shown.value
              ? withDirectives(h('span', { class: 'label' }, 'Save'), [
                  [vAnimate, { initial: { opacity: 0 } }],
                ])
              : null,
          ]),
          [[vAnimate, { duration: 300, easing: 'linear' }, undefined, { size: true }]],
        ),
      ]),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="pill"]')!
  await vi.waitFor(() => expect(sizing(el())).toHaveLength(0))
  await vi.waitFor(() => expect(el().querySelector('.label')!.getAnimations()).toHaveLength(0))
  shown.value = false
  await nextTick()
  await vi.waitFor(() => expect(el().querySelector('.label')?.getAnimations().length).toBe(1))
  // It holds the leaving label (positioned) and clips it.
  expect(getComputedStyle(el()).position).toBe('relative')
  expect(getComputedStyle(el()).overflow).toBe('clip')
  await vi.waitFor(() => expect(el().querySelector('.label')).toBeNull(), { timeout: 1000 })
  expect(el().style.position).toBe('')
  expect(el().style.overflow).toBe('')
})

// A card's shadow past the edge that grows: cut until the end, it would pop in as the clip goes.
test("v-animate.size: growing, the clip opens out by its children's shadows, so they're whole as it lands", async () => {
  const rows = shallowRef(1)
  render({
    setup: () => () =>
      withDirectives(
        h(
          'section',
          { 'data-testid': 'box', style: { width: '300px' } },
          Array.from({ length: rows.value }, (_, i) =>
            h('p', {
              key: i,
              style: { margin: 0, height: '20px', boxShadow: '0 4px 12px rgb(0 0 0 / 0.2)' },
            }),
          ),
        ),
        [[vAnimate, { duration: 300, easing: 'linear' }, undefined, { size: true }]],
      ),
  })
  const el = () => document.querySelector<HTMLElement>('[data-testid="box"]')!
  await frame()
  rows.value = 3
  await nextTick()
  await frame()
  const bottom = () => {
    const clip = getComputedStyle(el()).clipPath
    return Number.parseFloat(clip.match(/inset\(\S+ \S+ (-?[\d.]+)px/)?.[1] ?? 'NaN')
  }
  const run = sizing(el())[0]!
  run.pause()
  run.currentTime = 0
  expect(bottom()).toBeCloseTo(0, 1)
  // 4px down plus a 12px blur: whole by the end.
  run.currentTime = 299
  expect(bottom()).toBeLessThan(-15.5)
  run.play()
})
