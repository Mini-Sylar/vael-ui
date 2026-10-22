/** `surface` in the built Vapor build. Run `pnpm build` first. */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import SurfaceVaporRoot from './fixtures/SurfaceVaporRoot.vue'

const frame = () => new Promise(requestAnimationFrame)

test('Vapor: the surface blob grows with the panel from the trigger, and goes with it', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(SurfaceVaporRoot)
  const root = app.mount(host) as unknown as { open: boolean }
  const panel = () => document.querySelector<HTMLElement>('.ui-popover-panel')!
  const blob = () => document.querySelectorAll<HTMLElement>('.ui-popover-surface-shape')[1]
  const look = (el: Element) => `${getComputedStyle(el).translate} ${getComputedStyle(el).clipPath}`
  try {
    await frame()
    root.open = true
    await vi.waitFor(() => expect(panel().getAnimations().length).toBeGreaterThan(0))
    for (let i = 0; i < 6; i++) {
      expect(look(blob()!)).toBe(look(panel()))
      await frame()
    }
    root.open = false
    await vi.waitFor(() => expect(blob()).toBeUndefined(), { timeout: 2000 })
  } finally {
    app.unmount()
    host.remove()
  }
})
