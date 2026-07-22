import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import BareDirectiveFixture from './fixtures/BareDirectiveFixture.vue'

test('bare v-scroll-mask / v-tooltip (no value at all) does not crash', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(BareDirectiveFixture)
  expect(() => app.mount(host)).not.toThrow()
  try {
    expect(host.querySelector('[data-testid="bare-scroll-mask"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="bare-tooltip"]')).not.toBeNull()
  } finally {
    app.unmount()
  }
})
