/**
 * Proves the vapor-lib pipeline end to end: a `vapor`-marked Button.vue
 * (generated verbatim from packages/ui/src/components/Button.vue by
 * scripts/gen.mjs, reusing vael-ui's real exported composables), compiled via
 * a genuine `vite build` library bundle (vite.lib.config.ts → dist/
 * index.js), consumed from a pure-Vapor root with no interop plugin. Run
 * `pnpm build` before this test — it consumes the built output, not source.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import ButtonRoot from './fixtures/ButtonRoot.vue'

test('the built vapor-lib bundle renders and works standalone', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ButtonRoot)
  app.mount(host)
  try {
    const btn = host.querySelector<HTMLElement>('[data-testid="vapor-built-button"]')!
    expect(btn.textContent).toContain('Save')
    expect(btn.className).toContain('ui-button')
    expect(btn.className).toContain('ui-button--primary')
    btn.click()
    await vi.waitFor(() => expect(btn.textContent).toContain('Saving…'))
    expect(btn.getAttribute('aria-busy')).toBe('true')
    await vi.waitFor(() => expect(btn.textContent).toContain('Save'), { timeout: 2000 })
  } finally {
    app.unmount()
  }
})
