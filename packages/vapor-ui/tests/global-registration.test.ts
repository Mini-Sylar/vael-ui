// Run `pnpm build` before this test — it consumes the built output, not source.
// Same check as packages/ui's global-registration test, as a pure Vapor app: components
// resolve from the registry through Vapor's createAssetComponent, not resolveComponent.
import { afterEach, expect, test } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import * as lib from 'vael-ui/vapor'
import GlobalRegistrationVaporRoot from './fixtures/GlobalRegistrationVaporRoot.vue'
import FakeLinkVapor from './fixtures/FakeLinkVapor.vue'

let unmount: (() => void) | undefined
afterEach(() => {
  unmount?.()
  unmount = undefined
})

test('every component registered globally under its own name renders native tags', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createVaporApp(GlobalRegistrationVaporRoot)
  for (const [name, value] of Object.entries(lib)) {
    if (/^[A-Z]/.test(name) && value && typeof value === 'object')
      app.component(name, value as never)
  }
  app.component('FakeLink', FakeLinkVapor as never)
  app.mount(host)
  unmount = () => {
    app.unmount()
    host.remove()
  }
  await nextTick()

  const button = host.querySelector('[data-testid="button"]')!
  expect(button.tagName).toBe('BUTTON')
  expect(button.querySelector('.ui-button')).toBeNull()

  const listRows = host.querySelectorAll('[data-testid="menu-list"] .ui-menu-list-item')
  expect(listRows[0]!.tagName).toBe('BUTTON')
  expect(listRows[0]!.classList.contains('ui-button')).toBe(false)
  expect(listRows[1]!.hasAttribute('data-fake-link')).toBe(true)

  const stepTrigger = host.querySelector('[data-testid="stepper"] .ui-stepper-trigger')!
  expect(stepTrigger.tagName).toBe('BUTTON')
  expect(stepTrigger.classList.contains('ui-button')).toBe(false)

  const menuItems = document.querySelectorAll('.ui-menu-item')
  expect(menuItems[0]!.tagName).toBe('BUTTON')
  expect(menuItems[1]!.hasAttribute('data-fake-link')).toBe(true)
})
