// A list measured while an ancestor was still entering (transformed) still slides on its first
// reorder once that ancestor has settled: the box it was measured against changing isn't a move.
import { afterEach, expect, test } from 'vitest'
import { followLayout } from '../src/motion/layout'

afterEach(() => document.body.replaceChildren())

test('the first reorder after an ancestor settles still slides', async () => {
  const wrapper = document.createElement('div')
  // Transformed, so it is the rows' offsetParent for now.
  wrapper.style.cssText = 'transform: translateY(4px)'
  const list = document.createElement('ul')
  list.style.cssText = 'display: grid; gap: 8px; margin: 0; padding: 0'
  const rows = [1, 2, 3].map((n) => {
    const row = document.createElement('li')
    row.style.cssText = 'height: 40px'
    row.textContent = String(n)
    return row
  })
  list.append(...rows)
  wrapper.append(list)
  document.body.append(wrapper)
  const stops = rows.map((row) => followLayout(row, () => ({ duration: 300 })))
  // The entrance ends, with no change to the page's markup for anything to notice.
  wrapper.style.transform = ''
  await new Promise((resolve) => requestAnimationFrame(resolve))
  list.append(rows[0]!)
  await new Promise((resolve) => setTimeout(resolve, 80))
  expect(rows[0]!.getAnimations().length).toBeGreaterThan(0)
  stops.forEach((stop) => stop())
})
