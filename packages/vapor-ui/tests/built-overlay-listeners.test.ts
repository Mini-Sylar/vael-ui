// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import OverlayListenersRoot from './fixtures/OverlayListenersRoot.vue'

// Vapor drops spread listeners as soon as an element starts leaving, so the event that closes
// a panel used to skip the consumer's own listener on it. Real (trusted) input is what triggers it.
test('the event that closes a Dialog or Message still reaches the consumer listener on it', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const events: string[] = []
  const app = createVaporApp(OverlayListenersRoot, { events })
  app.mount(host)
  try {
    await expect.poll(() => document.querySelector('[data-testid="inside"]')).toBeTruthy()
    document.querySelector<HTMLElement>('[data-testid="inside"]')!.focus()
    await userEvent.keyboard('{Escape}')
    expect(events).toContain('dialog-Escape')
    await expect.poll(() => document.querySelector('[data-testid="inside"]')).toBeNull()

    await userEvent.click(host.querySelector<HTMLElement>('.ui-message-close')!)
    expect(events).toContain('message-click')
  } finally {
    app.unmount()
    host.remove()
  }
})
