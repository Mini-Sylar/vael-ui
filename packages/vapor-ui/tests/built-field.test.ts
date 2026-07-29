// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import FieldRoot from './fixtures/FieldRoot.vue'

test('Field context (disabled) reaches a wrapped control in the built vapor-lib bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(FieldRoot)
  app.mount(host)
  try {
    const input = host.querySelector<HTMLInputElement>('[data-testid="vapor-built-field-input"]')!
    expect(input.disabled).toBe(true)
  } finally {
    app.unmount()
  }
})
