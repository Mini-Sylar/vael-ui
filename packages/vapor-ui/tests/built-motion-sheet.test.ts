/** BottomSheet's exit in the built Vapor build. Run `pnpm build` first. */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import SheetVaporRoot from './fixtures/SheetVaporRoot.vue'

const frame = () => new Promise(requestAnimationFrame)

test('Vapor: a closing BottomSheet slides out with its backdrop instead of vanishing', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(SheetVaporRoot)
  const root = app.mount(host) as unknown as { open: boolean }
  try {
    const sheet = () => document.querySelector<HTMLElement>('.ui-dialog')!
    await vi.waitFor(() =>
      expect(sheet().querySelector('.ui-dialog-panel')!.getAnimations()).toHaveLength(0),
    )
    await new Promise((resolve) => setTimeout(resolve, 600))
    root.open = false
    for (let i = 0; i < 3; i++) await frame()
    // Still on screen a few frames in, backdrop part way through its fade.
    expect(getComputedStyle(sheet()).display).not.toBe('none')
    const backdrop = Number(getComputedStyle(sheet().querySelector('.ui-dialog-overlay')!).opacity)
    expect(backdrop).toBeGreaterThan(0)
    expect(backdrop).toBeLessThan(1)
    await vi.waitFor(() => expect(getComputedStyle(sheet()).display).toBe('none'), {
      timeout: 2000,
    })
  } finally {
    app.unmount()
    host.remove()
  }
})
