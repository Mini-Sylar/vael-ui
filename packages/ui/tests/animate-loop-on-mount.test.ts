// A looping look in `animate` that's there from the start begins on mount, as it would on a change.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('animate with repeat: Infinity starts looping as the element mounts', async () => {
  const screen = await render(() =>
    withDirectives(h('span', { class: 'beacon' }), [
      [
        vAnimate,
        {
          animate: {
            scale: { value: [null, 1.6], duration: 300, repeat: Infinity, repeatType: 'mirror' },
          },
        },
      ],
    ]),
  )
  const beacon = screen.container.querySelector<HTMLElement>('.beacon')!
  await vi.waitFor(() =>
    expect(
      beacon.getAnimations().some((a) => a.effect?.getComputedTiming().iterations === Infinity),
    ).toBe(true),
  )
})
