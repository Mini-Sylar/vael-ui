/** before-close in the built Vapor Dialog. Run `pnpm build` first. */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import GuardVaporRoot from './fixtures/GuardVaporRoot.vue'

test('Vapor: a pending guard holds the dialog; false keeps it open, true closes it', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(GuardVaporRoot)
  const root = app.mount(host) as unknown as { open: boolean; answer: (allowed: boolean) => void }
  const state = () => document.querySelector<HTMLElement>('.ui-dialog')?.dataset.state
  try {
    host.querySelector<HTMLElement>('[data-testid="open"]')!.click()
    await vi.waitFor(() => expect(state()).toBe('open'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await vi.waitFor(() => expect(state()).toBe('closing'))
    root.answer(false)
    await vi.waitFor(() => expect(state()).toBe('open'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await vi.waitFor(() => expect(state()).toBe('closing'))
    root.answer(true)
    await vi.waitFor(() => expect(root.open).toBe(false))
  } finally {
    app.unmount()
    host.remove()
  }
})
