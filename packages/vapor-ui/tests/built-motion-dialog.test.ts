/**
 * Motion in the built Vapor Dialog. Run `pnpm build` first. Guards three Vapor-only bugs: v-animate
 * joining (Vapor directives can't use onMounted), a target() on a component (its ref arrives after
 * enter is called), and enter running once per open.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import MotionDialogVaporRoot from './fixtures/MotionDialogVaporRoot.vue'

test('Vapor Dialog: one enter per open, with v-animate lines and a component target', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(MotionDialogVaporRoot)
  app.mount(host)
  try {
    host.querySelector<HTMLElement>('[data-testid="open"]')!.click()
    const log = () => host.querySelector('[data-testid="log"]')!.textContent
    await vi.waitFor(() => expect(log()).not.toBe(''))
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(log()).toBe('done:1,intro:2')
  } finally {
    app.unmount()
    host.remove()
  }
})
