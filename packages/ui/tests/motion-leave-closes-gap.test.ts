// In a box that follows its size, what comes after a leaving child slides up with the box's edge
// instead of jumping into the gap while the box is still easing.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, vShow, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('details hidden in a layout card: the actions under them keep to the card edge as it shrinks', async () => {
  const open = shallowRef(true)
  await render(() =>
    withDirectives(
      h(
        'article',
        { class: 'card', style: 'display: grid; gap: 8px; padding: 12px; width: 300px' },
        [
          h('div', { style: 'height: 100px' }),
          withDirectives(h('dl', { style: 'height: 40px; margin: 0' }), [
            [vShow, open.value],
            [vAnimate, { initial: { opacity: 0, y: -6 }, exit: { opacity: 0, y: -6 } }],
          ]),
          h('div', { class: 'actions', style: 'height: 30px' }),
        ],
      ),
      [[vAnimate, { layout: true, duration: 600 }]],
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 300))
  const card = document.querySelector<HTMLElement>('.card')!
  const actions = document.querySelector<HTMLElement>('.actions')!
  const gapBelow = () =>
    card.getBoundingClientRect().bottom - actions.getBoundingClientRect().bottom
  const resting = gapBelow()
  open.value = false
  await nextTick()
  const heights: number[] = []
  for (let frame = 0; frame < 8; frame++) {
    await new Promise(requestAnimationFrame)
    heights.push(card.getBoundingClientRect().height)
    expect(gapBelow()).toBeCloseTo(resting, 0)
  }
  // It was easing the whole time, not already landed.
  expect(heights.at(-1)).toBeGreaterThan(heights[0]! - 48)
  expect(heights[0]).toBeGreaterThan(160)
})
