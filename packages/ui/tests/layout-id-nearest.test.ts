// Two copies of your own tab row on a page, each underline `layoutId: 'underline'`, switched at
// once: each underline travels within its own row, from the one nearest it that just left.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

// A tab row of your own, used twice on a page: each underline is `layoutId: 'underline'`.
const Row = defineComponent({
  props: { active: Number, name: String },
  setup: (props) => () =>
    h(
      'div',
      { class: `row ${props.name}`, style: 'display: flex; gap: 0; margin-bottom: 40px' },
      [0, 1, 2].map((i) =>
        h('div', { style: 'width: 100px; position: relative; height: 30px' }, [
          i === props.active
            ? withDirectives(
                h('i', {
                  class: 'ul',
                  style:
                    'position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: red',
                }),
                [[vAnimate, { layoutId: 'underline', duration: 300, easing: 'linear' }]],
              )
            : null,
        ]),
      ),
    ),
})

test('the same layoutId in two copies of a component: each travels within its own', async () => {
  const a = shallowRef(0)
  const b = shallowRef(2)
  const screen = await render(() => [
    h(Row, { active: a.value, name: 'one' }),
    h(Row, { active: b.value, name: 'two' }),
  ])
  await new Promise((r) => setTimeout(r, 400))
  const top = (n: string) => screen.container.querySelector(`.${n}`)!.getBoundingClientRect().top
  a.value = 2
  b.value = 0
  for (let i = 0; i < 6; i++) {
    await new Promise(requestAnimationFrame)
    for (const n of ['one', 'two']) {
      const ul = screen.container.querySelector(`.${n} .ul`)!.getBoundingClientRect()
      // Never drawn in the other row.
      expect(ul.top - top(n)).toBeGreaterThan(0)
      expect(ul.top - top(n)).toBeLessThan(31)
    }
  }
  // And each moves: row one rightward, row two leftward.
  const left = (n: string) =>
    screen.container.querySelector(`.${n} .ul`)!.getBoundingClientRect().left
  expect(left('one')).toBeGreaterThan(0)
  expect(left('one')).toBeLessThan(200)
  expect(left('two')).toBeGreaterThan(0)
  expect(left('two')).toBeLessThan(200)
})
