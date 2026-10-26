// Vapor: picking another card while one is open changes the detail's layoutId: the open one shrinks
// back into its card and the picked card grows into the detail.
import { expect, test, vi } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import LayoutIdAboveVaporRoot from './fixtures/LayoutIdAboveVaporRoot.vue'

const travelling = (el: Element | null) =>
  !!el?.getAnimations().some((run) => run.id === 'ui-layout')

test('Vapor: picking another card while one is open, both travel', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(LayoutIdAboveVaporRoot)
  const root = app.mount(host) as unknown as { picked: number }
  try {
    await new Promise(requestAnimationFrame)
    root.picked = 3
    await nextTick()
    await vi.waitFor(() => expect(travelling(host.querySelector('.detail'))).toBe(true))
    for (const run of document.getAnimations()) run.finish()
    await new Promise((resolve) => setTimeout(resolve, 100))

    root.picked = 1
    await nextTick()
    await vi.waitFor(() => {
      expect(travelling(host.querySelector('.detail')), 'the detail grows out of card 1').toBe(true)
      expect(travelling(host.querySelector('.card-3')), 'card 3 comes back').toBe(true)
    })
  } finally {
    app.unmount()
    host.remove()
  }
})
