// Its own file so the motion runtime isn't loaded yet when the dialog opens.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

// What you see: its own opacity times every ancestor's.
const visible = (el: Element) => {
  let opacity = 1
  for (let node: Element | null = el; node; node = node.parentElement)
    opacity *= Number(getComputedStyle(node).opacity)
  return opacity
}

test('opened the instant it mounts, before the runtime loaded: hidden first, then it plays', async () => {
  const events: string[] = []
  render(
    {
      setup: () => () =>
        h(Dialog as never, {
          open: true,
          title: 'Cold',
          motion: { initial: { panel: { opacity: 0, y: 20 } } },
          onAfterEnter: () => events.push('after-enter'),
        }),
    },
    { global: { stubs: { transition: false } } },
  )
  const panel = () => document.querySelector<HTMLElement>('.ui-dialog-panel')
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  // The first frame: not the finished look.
  await new Promise(requestAnimationFrame)
  expect(visible(panel()!)).toBeLessThan(0.5)
  await vi.waitFor(() => expect(events).toContain('after-enter'), { timeout: 2000 })
  await new Promise(requestAnimationFrame)
  // And it really ends visible: nothing of the wait is left holding it.
  expect(visible(panel()!)).toBe(1)
})
