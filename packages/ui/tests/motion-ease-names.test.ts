// vael-ui's easing and duration tokens by name, as their CSS variables, wherever timing goes.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/motion/vAnimate'
import { cssDuration, cssEasing } from '../src/motion/ease'

test('tokens by name, and CSS as it is', () => {
  // The theme's value when a component around retimes the token, else the token.
  expect(cssEasing('out')).toBe('var(--ui-theme-ease-out, var(--ui-ease-out))')
  expect(cssEasing('in-out')).toBe('var(--ui-theme-ease-in-out, var(--ui-ease-in-out))')
  for (const css of ['ease-out', 'linear', 'cubic-bezier(0.2, 0, 0, 1)', 'steps(4)', 'var(--x)'])
    expect(cssEasing(css)).toBe(css)
  expect(cssDuration('enter')).toBe('var(--ui-theme-duration-enter, var(--ui-duration-enter))')
  expect(cssDuration('drawer-exit')).toBe(
    'var(--ui-theme-duration-drawer-exit, var(--ui-duration-drawer-exit))',
  )
  expect(cssDuration('var(--x)')).toBe('var(--x)')
})

test('a v-animate takes a token by name for its easing and its duration', async () => {
  render(() =>
    withDirectives(h('div', { class: 'named' }, 'Hi'), [
      [vAnimate, { initial: { opacity: 0 }, duration: 'enter', easing: 'pop' }],
    ]),
  )
  const own = await vi.waitFor(() => {
    const timing = document.querySelector('.named')?.getAnimations()[0]?.effect?.getTiming()
    expect(timing).toBeTruthy()
    return timing!
  })
  // The tokens' values: `pop` and `enter` (200ms).
  expect(own.easing).toBe('cubic-bezier(0.34, 1.36, 0.64, 1)')
  expect(own.duration).toBe(200)
})

test("a component's motion takes a token by name", async () => {
  const open = shallowRef(false)
  render(
    () =>
      h(Dialog as never, {
        open: open.value,
        title: 'Named',
        motion: { duration: 400, easing: 'drawer' },
      }),
    { global: { stubs: { transition: false } } },
  )
  open.value = true
  const panel = await vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>('.ui-dialog-panel')
    expect(el?.style.transition).toContain('400ms')
    return el!
  })
  expect(panel.style.transition).toContain('var(--ui-ease-drawer)')
})
