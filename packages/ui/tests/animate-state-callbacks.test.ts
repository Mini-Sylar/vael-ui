// v-animate's states run your code as they turn on and off, and `inView` can take its own
// viewport: a contents list marks the section you're reading.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('inView runs onAfterEnter in view and onAfterLeave out of it', async () => {
  const entered = vi.fn()
  const left = vi.fn()
  const screen = await render(() =>
    withDirectives(h('section', { class: 'part', style: 'height: 100px' }, 'Part'), [
      [
        vAnimate,
        {
          states: { inView: { opacity: 1, onAfterEnter: entered, onAfterLeave: left } },
          duration: 100,
        },
      ],
    ]),
  )
  const el = screen.container.querySelector<HTMLElement>('.part')!
  await vi.waitFor(() => expect(entered).toHaveBeenCalledWith(el), { timeout: 2000 })
  expect(left).not.toHaveBeenCalled()
  el.style.transform = 'translateY(200vh)'
  await vi.waitFor(() => expect(left).toHaveBeenCalledWith(el), { timeout: 2000 })
})

test("inView's own viewport counts for the state, not the element's", async () => {
  const entered = vi.fn()
  const screen = await render(() =>
    withDirectives(
      h('section', {
        class: 'peek',
        style: `position: fixed; left: 0; top: calc(100vh - 30px); height: 100px; width: 100px`,
      }),
      [
        [
          vAnimate,
          {
            // Anything showing counts for the element; the state wants nearly all of it.
            viewport: { amount: 'some' },
            states: { inView: { opacity: 1, onAfterEnter: entered, viewport: { amount: 0.9 } } },
          },
        ],
      ],
    ),
  )
  const el = screen.container.querySelector<HTMLElement>('.peek')!
  await sleep(600)
  expect(entered).not.toHaveBeenCalled()
  el.style.top = '0px'
  await vi.waitFor(() => expect(entered).toHaveBeenCalled(), { timeout: 2000 })
})
