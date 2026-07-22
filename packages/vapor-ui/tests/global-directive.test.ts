import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import { vTooltip } from 'vael-ui/vapor'
import GlobalDirectiveFixture from './fixtures/GlobalDirectiveFixture.vue'

test('v-tooltip resolves via app.directive() global registration with no local import', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(GlobalDirectiveFixture)
  app.directive('tooltip', vTooltip)
  app.mount(host)
  try {
    const target = host.querySelector('[data-testid="global-directive-target"]')
    expect(target).not.toBeNull()
    expect(target!.hasAttribute('data-ui-tooltip')).toBe(true)
  } finally {
    app.unmount()
  }
})
