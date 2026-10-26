// `stagger: 'center'` and `'edges'` go by where each element sits: across a grid, from its middle
// (or its rim) outward in cells; in a single row, in page order as before.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

// When an element's entrance starts, in ms: its animation's delay or its transition's.
const startOf = (el: Element) => {
  const run = el.getAnimations().find((a) => a.id !== 'ui-held')
  if (run) return Math.round(Number(run.effect?.getTiming().delay ?? 0))
  const delay = (el as HTMLElement).style.transitionDelay.split(',')[0]?.trim() ?? ''
  return Math.round(parseFloat(delay) * (delay.endsWith('ms') ? 1 : 1000)) || 0
}

async function tiles(stagger: 'center' | 'edges', columns: number, count: number) {
  const screen = await render(() =>
    h(
      'div',
      { style: `display: grid; grid-template-columns: repeat(${columns}, 40px); gap: 4px` },
      Array.from({ length: count }, (_, i) =>
        withDirectives(h('div', { class: 'tile', style: 'height: 40px' }, String(i)), [
          [vAnimate, { initial: { opacity: 0 }, stagger, duration: 200 }, 'tiles'],
        ]),
      ),
    ),
  )
  await new Promise((r) => setTimeout(r, 50))
  return [...screen.container.querySelectorAll('.tile')].map(startOf)
}

test("'center' across a 3×3 grid: the middle first, then its sides, then the corners", async () => {
  const [a, b, c, d, mid, f, g, hh, i] = await tiles('center', 3, 9)
  expect(mid).toBeLessThan(b!)
  expect(b).toBe(d)
  expect(b).toBe(f)
  expect(b).toBe(hh)
  expect(b!).toBeLessThan(a!)
  for (const corner of [a, c, g, i]) expect(corner).toBe(a)
})

test("'edges' across a grid: the corners first, the middle last", async () => {
  const [a, , c, , mid, , g, , i] = await tiles('edges', 3, 9)
  for (const corner of [c, g, i]) expect(corner).toBe(a)
  expect(a!).toBeLessThan(mid!)
})

test("'center' in a single row keeps page order from its middle", async () => {
  const starts = await tiles('center', 5, 5)
  expect(starts[2]).toBeLessThan(starts[1]!)
  expect(starts[1]).toBe(starts[3])
  expect(starts[1]!).toBeLessThan(starts[0]!)
})
