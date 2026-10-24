/**
 * The components moved off hand-driven exits, in the built Vapor bundle (run `pnpm build` first):
 * Select's panel and chips, Timeline's step parts, Tooltip and Message all reach your hooks.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import MotionLegacyVaporRoot from './fixtures/MotionLegacyVaporRoot.vue'

test('Vapor: panel, chip, step, tooltip and message hooks get their parts', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createVaporApp(MotionLegacyVaporRoot)
  app.mount(host)
  const click = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.click()
  const log = () => host.querySelector('[data-testid="log"]')!.textContent
  try {
    // The list engine loads on demand from setup.
    await new Promise((resolve) => setTimeout(resolve, 150))
    click('select')
    await vi.waitFor(() => expect(log()).toContain('select:true'))
    click('select')
    click('chip')
    await vi.waitFor(() => expect(log()).toContain('chip:true'))
    click('step')
    await vi.waitFor(() => expect(log()).toContain('step:true:true'))
    click('tip')
    await vi.waitFor(() => expect(log()).toContain('tip:true'))
    click('tip')
    click('message')
    await new Promise((resolve) => setTimeout(resolve, 400))
    click('message')
    await vi.waitFor(() => expect(log()).toContain('message:true'))
  } finally {
    app.unmount()
    host.remove()
  }
})
