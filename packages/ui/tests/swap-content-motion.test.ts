// Content that swaps into a Dialog (`swap: 'wait'`): its elements wait on each other as they do on
// opening, and with motion off on the provider nothing in it moves.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/motion/vAnimate'

function setup(motionOff = false) {
  const step = shallowRef(1)
  const stage = () =>
    h('section', { key: step.value, class: 'stage' }, [
      withDirectives(h('h3', { class: 'heading' }, `Step ${step.value}`), [
        [vAnimate, { initial: { opacity: 0, y: 6 }, duration: 250, after: 'panel' }, 'heading'],
      ]),
      withDirectives(h('p', { class: 'field' }, 'Field'), [
        [vAnimate, { initial: { opacity: 0, y: 8 }, duration: 250, after: 'heading' }, 'fields'],
      ]),
    ])
  const dialog = () =>
    h(
      Dialog as never,
      { open: true, title: 'Checkout', motion: { swap: 'wait', direction: 1 } },
      () => stage(),
    )
  return {
    step,
    mount: () =>
      render(() => (motionOff ? h(ConfigProvider, { motion: false }, dialog) : dialog()), {
        global: { stubs: { transition: false } },
      }),
  }
}
const seen = (sel: string) => {
  const el = [...document.querySelectorAll(sel)].at(-1)
  return el ? Number(getComputedStyle(el).opacity) : -1
}

test('swapped content: the fields still wait for the heading', async () => {
  const { step, mount } = setup()
  await mount()
  await new Promise((resolve) => setTimeout(resolve, 1200))
  step.value = 2
  await nextTick()
  const frames: { heading: number; field: number }[] = []
  for (let frame = 0; frame < 60; frame++) {
    await new Promise(requestAnimationFrame)
    frames.push({ heading: seen('.heading'), field: seen('.field') })
  }
  const start = (k: 'heading' | 'field') => frames.findIndex((f) => f[k] > 0.05 && f[k] < 1)
  expect(start('field')).toBeGreaterThan(start('heading') + 3)
})

test('motion off: content that swaps in shows at once', async () => {
  const { step, mount } = setup(true)
  await mount()
  await new Promise((resolve) => setTimeout(resolve, 300))
  step.value = 2
  await nextTick()
  let running = 0
  for (let frame = 0; frame < 20; frame++) {
    await new Promise(requestAnimationFrame)
    running += [...document.querySelectorAll('.stage, .stage *')].reduce(
      (n, el) =>
        n +
        el
          .getAnimations()
          .filter((a) => Number(a.effect?.getComputedTiming().activeDuration ?? 0) > 1).length,
      0,
    )
  }
  expect(running).toBe(0)
})
