/**
 * What a ConfigProvider says reaches the built Vapor v-animate. Run `pnpm build` first. A preset
 * inside a teleporting component finds its provider; `motion: false` makes v-animate instant.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import ProviderReachVaporRoot from './fixtures/ProviderReachVaporRoot.vue'

test('Vapor v-animate: a teleported preset animates, and motion: false shows at once', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ProviderReachVaporRoot)
  app.mount(host)
  try {
    await vi.waitFor(() => expect(document.querySelector('.teleported')).not.toBeNull())
    await new Promise((resolve) => setTimeout(resolve, 100))
    const teleported = document.querySelector('.teleported')!
    expect(teleported.getAnimations().length).toBeGreaterThan(0)
    expect(Number(getComputedStyle(teleported).opacity)).toBeLessThan(1)
    const off = host.querySelector('.off')!
    expect(off.getAnimations()).toHaveLength(0)
    expect(getComputedStyle(off).opacity).toBe('1')
  } finally {
    app.unmount()
    host.remove()
  }
})
