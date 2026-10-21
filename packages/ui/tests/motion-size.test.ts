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
