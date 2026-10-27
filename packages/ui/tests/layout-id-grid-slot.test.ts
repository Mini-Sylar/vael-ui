// A layoutId element arriving in a grid cell at another size travels from where the other one was,
// and its cell stays put: its real size changes on the way, but its slot keeps its final size, so
// a column sized by its content doesn't widen and shift the grid.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('back from a wide detail into the third column, from where the detail was', async () => {
  const open = shallowRef(true)
  const screen = await render(() =>
    h('div', { style: 'position: relative; width: 600px' }, [
      h(
        'div',
        { class: 'grid', style: 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px' },
        [0, 1, 2].map((i) =>
          h('div', { class: `cell cell-${i}`, style: 'height: 60px' }, [
            i === 2 && !open.value
              ? withDirectives(h('button', { class: 'card', style: 'width: 100%; height: 100%' }), [
                  [vAnimate, { layoutId: 'card', duration: 400, easing: 'linear' }],
                ])
              : null,
          ]),
        ),
      ),
      open.value
        ? withDirectives(
            h('div', {
              class: 'detail',
              style: 'position: absolute; inset: 0 0 auto 0; height: 140px',
            }),
            [[vAnimate, { layoutId: 'card', duration: 400, easing: 'linear' }]],
          )
        : null,
    ]),
  )
  await new Promise((r) => setTimeout(r, 300))
  const detail = screen.container.querySelector('.detail')!.getBoundingClientRect()
  const cellLeft = screen.container.querySelector('.cell-2')!.getBoundingClientRect().left
  open.value = false
  const lefts: number[] = []
  const cells: number[] = []
  for (let i = 0; i < 12; i++) {
    await new Promise(requestAnimationFrame)
    const card = screen.container.querySelector('.card')
    if (card) lefts.push(card.getBoundingClientRect().left)
    cells.push(screen.container.querySelector('.cell-2')!.getBoundingClientRect().left)
  }
  // It starts where the detail was, and never further left.
  expect(lefts[0]!).toBeCloseTo(detail.left, 0)
  expect(Math.min(...lefts)).toBeGreaterThanOrEqual(detail.left - 1)
  // Its cell never moves.
  for (const left of cells) expect(left).toBeCloseTo(cellLeft, 0)
})
