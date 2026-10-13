import '../src/style.css'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { afterEach, expect, test } from 'vitest'
import * as lib from '../src/index'
import GlobalRegistrationRoot from './fixtures/GlobalRegistrationRoot.vue'

let unmount: (() => void) | undefined
afterEach(() => {
  unmount?.()
  unmount = undefined
})

// Registering every component under its own name is the common global setup. A native
// tag passed to `<component :is>` used to resolve to the registered component of the same
// name ('button' -> Button), so Button rendered itself forever and Menu/MenuList/Stepper
// rows rendered vael-ui's Button instead of a plain <button>.
test('every component registered globally under its own name renders native tags', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(GlobalRegistrationRoot)
  for (const [name, value] of Object.entries(lib)) {
    if (/^[A-Z]/.test(name) && value && typeof value === 'object' && 'setup' in value) {
      app.component(name, value as never)
    }
  }
  app.component(
    'FakeLink',
    defineComponent(
      (_, { slots }) =>
        () =>
          h('a', { 'data-fake-link': '' }, slots.default?.()),
    ),
  )
  app.mount(host)
  unmount = () => {
    app.unmount()
    host.remove()
  }
  await nextTick()

  const button = host.querySelector('[data-testid="button"]')!
  expect(button.tagName).toBe('BUTTON')
  expect(button.querySelector('.ui-button')).toBeNull()
  expect(host.querySelector('[data-testid="card"]')!.tagName).toBe('DIV')

  const listRows = host.querySelectorAll('[data-testid="menu-list"] .ui-menu-list-item')
  expect(listRows[0]!.tagName).toBe('BUTTON')
  expect(listRows[0]!.classList.contains('ui-button')).toBe(false)
  expect(listRows[1]!.hasAttribute('data-fake-link')).toBe(true)

  const stepTrigger = host.querySelector('[data-testid="stepper"] .ui-stepper-trigger')!
  expect(stepTrigger.tagName).toBe('BUTTON')
  expect(stepTrigger.classList.contains('ui-button')).toBe(false)

  const menuItems = document.querySelectorAll('.ui-menu-item')
  expect(menuItems[0]!.tagName).toBe('BUTTON')
  expect(menuItems[0]!.classList.contains('ui-button')).toBe(false)
  expect(menuItems[1]!.hasAttribute('data-fake-link')).toBe(true)
})
