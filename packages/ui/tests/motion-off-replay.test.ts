// With motion off on the provider, a component's `replay` plays nothing, even with a spring of its
// own, and its callback still runs.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'
import Badge from '../src/components/Badge/Badge.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

test('motion off on the provider: a Badge with its own spring replays without moving, onAfterEnter at once', async () => {
  const replay = shallowRef(0)
  const entered = vi.fn()
  const screen = await render(() =>
    h(ConfigProvider, { motion: false }, () =>
      h(Badge, {
        count: replay.value,
        motion: {
          replay: replay.value,
          appear: false,
          initial: { root: { scale: 0.6, opacity: 0 } },
          spring: 'bouncy',
          onAfterEnter: entered,
        },
      }),
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  replay.value = 1
  await nextTick()
  await new Promise(requestAnimationFrame)
  const badge = screen.container.querySelector('.ui-badge')!
  expect(badge.getAnimations()).toEqual([])
  expect(getComputedStyle(badge).opacity).toBe('1')
  await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(1))
})

test('motion off on the provider: a component’s own spring leaves its transition tokens at zero', async () => {
  const screen = await render(() =>
    h(ConfigProvider, { motion: false }, () =>
      h(Badge, { count: 1, motion: { spring: 'bouncy' } }),
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  const badge = screen.container.querySelector<HTMLElement>('.ui-badge')!
  expect(getComputedStyle(badge).getPropertyValue('--ui-duration-enter').trim()).toMatch(
    /^0(s|ms)?$/,
  )
})

test('motion off on the provider: a preset name on v-animate doesn’t warn that it’s unknown', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const on = shallowRef(true)
  await render(() =>
    h(
      ConfigProvider,
      { motion: on.value ? { version: 1, presets: { card: { initial: { opacity: 0 } } } } : false },
      () =>
        on.value
          ? null
          : withDirectives(h('div', 'card'), [[vAnimate, undefined, undefined, { card: true }]]),
    ),
  )
  on.value = false
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(
    warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('v-animate.card')),
  ).toEqual([])
  warn.mockRestore()
})
