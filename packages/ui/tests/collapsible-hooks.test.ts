// Collapsible's own `enter` and `leave`: your animation opens and closes it, and closing waits for
// what `leave` returns before the panel goes.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'

test('enter runs on an open panel; the panel stays until leave has played', async () => {
  const open = shallowRef(false)
  const enter = vi.fn(({ body }: { body: HTMLElement }) =>
    body.animate([{ opacity: 0 }, { opacity: 1 }], 200),
  )
  const leave = vi.fn(({ body }: { body: HTMLElement }) =>
    body.animate([{ opacity: 1 }, { opacity: 0 }], 300),
  )
  render(() =>
    h(
      Collapsible,
      { open: open.value, motion: { enter, leave } },
      { trigger: () => h('button', 'More'), default: () => 'Details' },
    ),
  )
  const panel = await vi.waitFor(() =>
    document.querySelector<HTMLElement>('.ui-collapsible-panel')!,
  )
  open.value = true
  await vi.waitFor(() => expect(enter).toHaveBeenCalledOnce())
  // Open at once, at its full height, for the hook to animate.
  expect(panel.getBoundingClientRect().height).toBeGreaterThan(0)
  await new Promise((resolve) => setTimeout(resolve, 300))

  open.value = false
  await nextTick()
  await vi.waitFor(() => expect(leave).toHaveBeenCalledOnce())
  await new Promise((resolve) => setTimeout(resolve, 150))
  // Mid-leave: still there.
  expect(panel.getBoundingClientRect().height).toBeGreaterThan(0)
  await vi.waitFor(() => expect(panel.getBoundingClientRect().height).toBe(0), { timeout: 1500 })
})
