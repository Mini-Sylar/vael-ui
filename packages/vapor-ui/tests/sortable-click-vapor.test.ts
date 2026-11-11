// Run `pnpm build` first. In Vapor, template clicks are delegated to the document: a click on
// content inside a Sortable row, or inside a custom handle, still reaches its handler.
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import Root from './fixtures/SortableClickVaporRoot.vue'

test('Vapor Sortable: clicks inside a whole-row handle and a custom handle reach their handlers', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(Root)
  app.mount(host)
  try {
    const log = () => host.querySelector('.log')!.textContent
    await userEvent.click(host.querySelector('.cards .open')!)
    await vi.waitFor(() => expect(log()).toBe('open:a'))
    await userEvent.click(host.querySelector('.rows .grip')!)
    await vi.waitFor(() => expect(log()).toBe('open:a,grip:x'))
  } finally {
    app.unmount()
    host.remove()
  }
})
