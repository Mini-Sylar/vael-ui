/** `layoutId` in the built Vapor build. Run `pnpm build` first. */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import LayoutVaporRoot from './fixtures/LayoutVaporRoot.vue'

const frame = () => new Promise(requestAnimationFrame)
const start = (selector: string) => {
  const run = document.querySelector(selector)?.getAnimations()[0]
  return run ? String((run.effect as KeyframeEffect).getKeyframes()[0]!.transform) : 'none'
}

test('Vapor: an element arriving under a layoutId slides from the one that left, both ways', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(LayoutVaporRoot)
  const root = app.mount(host) as unknown as { open: boolean }
  try {
    await frame()
    root.open = true
    await vi.waitFor(() => expect(start('.down')).toMatch(/^translate\(-100px, -40px\)/))
    // layout: the sibling below the growing gap slides down from 40px higher.
    await vi.waitFor(() => {
      const run = document.querySelector('.moves')?.getAnimations()[0]
      expect(
        String((run?.effect as KeyframeEffect | undefined)?.getKeyframes()[0]!.translate),
      ).toBe('0px -40px')
    })
    // Removed by v-if: it leaves in place, fading, then is gone.
    await vi.waitFor(() => {
      const run = document.querySelector('.goes')?.getAnimations()[0]
      expect((run?.effect as KeyframeEffect | undefined)?.getKeyframes().at(-1)!.opacity).toBe('0')
    })
    await vi.waitFor(() => expect(document.querySelector('.goes')).toBeNull())
    await new Promise((r) => setTimeout(r, 400))
    root.open = false
    await vi.waitFor(() => expect(start('.up')).toMatch(/^translate\(100px, 40px\)/))
  } finally {
    app.unmount()
    host.remove()
  }
})
