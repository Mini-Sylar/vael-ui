// An `exit` function can decide as the element leaves: values fly it out, `false` lets it go at
// once, even when it has an `initial` it would otherwise leave back through.
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

async function leave(exit: () => false | { opacity: number }) {
  const shown = shallowRef(true)
  const screen = await render(() =>
    h('div', [
      shown.value
        ? withDirectives(h('p', { 'data-p': '' }, 'card'), [
            [vAnimate, { initial: { opacity: 0 }, exit, duration: 400 }],
          ])
        : null,
    ]),
  )
  await new Promise((resolve) => setTimeout(resolve, 500))
  shown.value = false
  await nextTick()
  await new Promise(requestAnimationFrame)
  const still = screen.container.querySelector('[data-p]')
  screen.unmount()
  return still
}

test('an exit function that returns false leaves at once', async () => {
  expect(await leave(() => false)).toBeNull()
})

test('an exit function that returns values plays them', async () => {
  expect(await leave(() => ({ opacity: 0 }))).not.toBeNull()
})
