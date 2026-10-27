// Your own component on useMotion takes `motion: false` like vael-ui's: it shows and hides at once.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { Transition, defineComponent, h, nextTick, shallowRef } from 'vue'
import { useMotion } from '../src/motion/useMotion'
import type { OwnMotion } from '../src/motion/types'

const Tip = defineComponent({
  props: { open: Boolean, motion: { type: [Object, Boolean], default: undefined } },
  setup(props) {
    const m = useMotion('overlay', () => props.motion as OwnMotion<'overlay'> | false | undefined)
    return () =>
      h(Transition, m.transition, () => (props.open ? h('aside', { class: 'tip' }, 'Tip') : null))
  },
})

test('useMotion with motion: false: the tip appears without any animation', async () => {
  const open = shallowRef(false)
  const screen = await render(() => h(Tip, { open: open.value, motion: false }), {
    global: { stubs: { transition: false } },
  })
  open.value = true
  await nextTick()
  let moving = 0
  for (let frame = 0; frame < 10; frame++) {
    await new Promise(requestAnimationFrame)
    const tip = screen.container.querySelector('.tip')
    moving += tip ? tip.getAnimations().length : 0
    if (tip) expect(getComputedStyle(tip).opacity).toBe('1')
  }
  expect(moving).toBe(0)
})
