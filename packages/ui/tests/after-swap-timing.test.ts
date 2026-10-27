// `onAfterSwap` runs once the new view is in, not as it starts coming in.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/motion/vAnimate'

test('a Dialog swap: the new view is fully in when onAfterSwap runs', async () => {
  const step = shallowRef(1)
  let opacityThen = -1
  const onAfterSwap = vi.fn(
    (view: HTMLElement) => (opacityThen = Number(getComputedStyle(view).opacity)),
  )
  await render(
    () =>
      h(
        Dialog as never,
        { open: true, title: 'Steps', motion: { swap: 'wait', direction: 1, onAfterSwap } },
        () =>
          withDirectives(h('section', { key: step.value, class: 'view' }, `Step ${step.value}`), [
            [
              vAnimate,
              {
                initial: ({ direction }: { direction: number }) => ({
                  opacity: 0,
                  x: 40 * direction,
                }),
                exit: ({ direction }: { direction: number }) => ({
                  opacity: 0,
                  x: -40 * direction,
                }),
              },
            ],
          ]),
      ),
    { global: { stubs: { transition: false } } },
  )
  await new Promise((resolve) => setTimeout(resolve, 800))
  step.value = 2
  await nextTick()
  await vi.waitFor(() => expect(onAfterSwap).toHaveBeenCalled(), { timeout: 2000 })
  expect(opacityThen).toBeGreaterThan(0.95)
})
