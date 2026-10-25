// Plain numbers in motion values: px for lengths, degrees for rotate, so they animate.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const frame = () => new Promise(requestAnimationFrame)
async function midway(node: () => ReturnType<typeof h>, read: (el: Element) => number) {
  render({ setup: () => node }, { global: { stubs: { transition: false } } })
  const seen: number[] = []
  for (let i = 0; i < 12; i++) {
    await frame()
    const el = document.querySelector('.probe')
    if (el) seen.push(read(el))
  }
  return seen
}
const between = (seen: number[], from: number, to: number) =>
  seen.some((v) => v > Math.min(from, to) + 0.01 && v < Math.max(from, to) - 0.01)

test('a number for a length eases as px: a stroke draws, a width grows', async () => {
  const dash = await midway(
    () =>
      h('svg', { viewBox: '0 0 10 10' }, [
        withDirectives(
          h('path', {
            class: 'probe',
            d: 'M1 1 9 9',
            pathLength: 1,
            style: 'stroke: black; stroke-dasharray: 1',
          }),
          [
            [
              vAnimate,
              { initial: { strokeDashoffset: 1, width: 0 }, duration: 400, easing: 'linear' },
            ],
          ],
        ),
      ]),
    (el) => Number.parseFloat(getComputedStyle(el).strokeDashoffset),
  )
  expect(between(dash, 1, 0)).toBe(true)
  document.body.innerHTML = ''
  const width = await midway(
    () =>
      withDirectives(h('div', { class: 'probe', style: 'width: 200px; height: 4px' }), [
        [vAnimate, { initial: { width: 100 }, duration: 400, easing: 'linear' }],
      ]),
    (el) => el.getBoundingClientRect().width,
  )
  expect(between(width, 100, 200)).toBe(true)
})

test('a number for rotate turns in degrees', async () => {
  const angle = await midway(
    () =>
      withDirectives(h('div', { class: 'probe', style: 'width: 20px; height: 20px' }), [
        [vAnimate, { initial: { rotate: 90 }, duration: 400, easing: 'linear' }],
      ]),
    (el) => Number.parseFloat(getComputedStyle(el).rotate) || 0,
  )
  expect(between(angle, 90, 0)).toBe(true)
})
