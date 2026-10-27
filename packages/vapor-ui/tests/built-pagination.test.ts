// The current page's number shows over the indicator from the first render in the Vapor build.
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import PaginationVaporRoot from './fixtures/PaginationVaporRoot.vue'

test('Vapor: the current page number is clipped to the indicator on first render', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(PaginationVaporRoot)
  app.mount(host)
  try {
    const indicator = host.querySelector<HTMLElement>('.ui-pagination-indicator')!
    const labels = host.querySelector<HTMLElement>('.ui-pagination-indicator-labels')!
    await vi.waitFor(() => expect(indicator.style.inlineSize).not.toBe(''))
    // Settled past the mount, a later style pass must not hide the labels again.
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(labels.style.clipPath).toContain(indicator.style.insetInlineStart)
  } finally {
    app.unmount()
    host.remove()
  }
})
