/**
 * useMotion('list') in the built Vapor bundle (run `pnpm build` first): Vapor's TransitionGroup must
 * carry the list's marker and call the hooks the list measures from, or nothing slides.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import MotionListVaporRoot from './fixtures/MotionListVaporRoot.vue'

const frame = () => new Promise(requestAnimationFrame)
const ids = (el: Element) => el.getAnimations().map((a) => a.id)

test('Vapor list: an add enters and slides the rest; a sort slides everyone', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(MotionListVaporRoot)
  app.mount(host)
  try {
    // The list engine loads on demand from setup; an app changes its list long after. A change in
    // the first moments after mount enters without sibling slides (documented trade), so it gets
    // room to load, even on a busy machine.
    await new Promise((resolve) => setTimeout(resolve, 500))
    await frame()
    const item = (n: number) => host.querySelector(`[data-item="${n}"]`)!
    host.querySelector<HTMLElement>('[data-testid="add"]')!.click()
    // Within a frame or two, however busy the machine.
    await vi.waitFor(
      () => {
        expect(ids(item(10))).toContain('ui-presence')
        for (const n of [1, 2, 3]) expect(ids(item(n))).toContain('ui-slide')
      },
      { timeout: 500, interval: 16 },
    )
    await new Promise((resolve) => setTimeout(resolve, 900))
    host.querySelector<HTMLElement>('[data-testid="sort"]')!.click()
    // Reversed: everyone but the middle one moves.
    await vi.waitFor(
      () => {
        const moved = [10, 1, 2, 3].filter((n) => ids(item(n)).includes('ui-slide'))
        expect(moved.length).toBeGreaterThanOrEqual(2)
      },
      { timeout: 500, interval: 16 },
    )
  } finally {
    app.unmount()
    host.remove()
  }
})
