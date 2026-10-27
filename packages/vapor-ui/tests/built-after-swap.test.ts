// Vapor: `onAfterSwap` runs once the new view is in, not as it starts.
import { expect, test, vi } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import AfterSwapVaporRoot from './fixtures/AfterSwapVaporRoot.vue'

test('Vapor: a Dialog swap: the new view is fully in when onAfterSwap runs', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(AfterSwapVaporRoot)
  const root = app.mount(host) as unknown as { step: number; opacityThen: number }
  try {
    await new Promise((resolve) => setTimeout(resolve, 800))
    root.step = 2
    await nextTick()
    await vi.waitFor(() => expect(root.opacityThen).toBeGreaterThanOrEqual(0), { timeout: 2000 })
    expect(root.opacityThen).toBeGreaterThan(0.95)
  } finally {
    app.unmount()
    host.remove()
  }
})
