// A row entering around content that follows its layout (the row rising into a list) isn't a move
// of that content: only where layout puts it counts, whatever transforms sit in between.
import { afterEach, expect, test } from 'vitest'
import { followLayout } from '../src/motion/layout'

afterEach(() => document.body.replaceChildren())

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const slides = (el: Element) => el.getAnimations().filter((run) => run.id === 'ui-layout')

function panel() {
  const box = document.createElement('div')
  box.setAttribute('data-ui-presence', '')
  box.style.cssText = 'position: relative; padding: 8px'
  const row = document.createElement('div')
  row.style.cssText = 'padding: 6px'
  const body = document.createElement('span')
  body.style.cssText = 'display: block; height: 18px'
  body.textContent = 'Build runner'
  row.append(body)
  box.append(row)
  document.body.append(box)
  return { box, row, body }
}

test("a row rising around it doesn't slide what follows its layout", async () => {
  const { box, row, body } = panel()
  // Mid-entrance as it mounts: 8px low and blurred, so the row is what places it.
  row.style.translate = '0 8px'
  row.style.filter = 'blur(2px)'
  expect(body.offsetParent).toBe(row)
  const stop = followLayout(body, () => ({ duration: 300 }))
  // The entrance moves on, still blurred, while something else in the panel changes.
  row.style.translate = '0 3px'
  box.append(document.createElement('div'))
  await frame()
  expect(slides(body)).toHaveLength(0)
  stop()
})

test('a real move under the same transforms still slides', async () => {
  const { box, row, body } = panel()
  row.style.translate = '0 8px'
  row.style.filter = 'blur(2px)'
  const stop = followLayout(body, () => ({ duration: 300 }))
  const spacer = document.createElement('div')
  spacer.style.height = '20px'
  box.prepend(spacer)
  await frame()
  expect(slides(body).length).toBeGreaterThan(0)
  stop()
})

test("a panel scaling open around content that follows its size doesn't resize it", async () => {
  const { followSize } = await import('../src/motion/size')
  const { box, body } = panel()
  // An icon and a label in a row, as in a Select's custom row.
  body.style.cssText = 'display: flex; gap: 8px; width: 228px; height: 17.5px'
  body.innerHTML = '<svg width="12" height="12"></svg><span>Build runner</span>'
  box.style.scale = '0.96'
  const { stop } = followSize(body, () => ({ duration: 300 }), false, true)
  // The panel scales on toward 1; what's in the row redraws with it.
  for (const at of ['0.97', '0.985', '0.995', '1']) {
    box.style.scale = at
    body.lastElementChild!.textContent = 'Build runner'
    await frame()
  }
  expect(body.getAnimations().filter((run) => run.id === 'ui-size')).toHaveLength(0)
  stop()
})
