// Vapor: a box that follows its size eases down as a v-show child inside it leaves, not snaps.
import { expect, test, vi } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import VShowInLayoutVaporRoot from './fixtures/VShowInLayoutVaporRoot.vue'

test('Vapor: a layout box eases down as a v-show child inside it leaves', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(VShowInLayoutVaporRoot)
  const root = app.mount(host) as unknown as { open: boolean }
  try {
    const card = host.querySelector<HTMLElement>('.card')!
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(card.getBoundingClientRect().height).toBe(140)
    root.open = false
    await nextTick()
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    // Still on its way down, not snapped.
    expect(card.getBoundingClientRect().height).toBeGreaterThan(102)
    await vi.waitFor(() => expect(card.getBoundingClientRect().height).toBe(100), { timeout: 2000 })
  } finally {
    app.unmount()
    host.remove()
  }
})
