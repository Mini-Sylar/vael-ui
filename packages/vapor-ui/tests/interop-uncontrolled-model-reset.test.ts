/**
 * Regression guard for vuejs/core#15670 (broken through vue 3.6.0-rc.9, fixed
 * in 3.6.0-rc.10): a Vapor component's uncontrolled `defineModel` (the parent
 * doesn't bind it) was reset to its default every time a vdom parent
 * re-rendered under vaporInteropPlugin, even for an unrelated prop change. It
 * surfaced in vael-ui as Combobox's input going blank after a pick when its
 * parent is a plain vdom SFC (see built-combobox-create.test.ts).
 */
import { expect, test } from 'vitest'
import { createApp, nextTick, vaporInteropPlugin } from 'vue'
import InteropModelChild from './fixtures/InteropModelChild.vue'
import InteropModelVdomParent from './fixtures/InteropModelVdomParent.vue'

// Not the "unmarked component falls back to vdom" case (vuejs/core#15596's answer): the child is a real Vapor component.
test('the interop child is explicitly marked Vapor', () => {
  expect((InteropModelChild as { __vapor?: boolean }).__vapor).toBe(true)
})

test('an uncontrolled defineModel survives an unrelated vdom parent re-render', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(InteropModelVdomParent).use(vaporInteropPlugin)
  app.mount(host)
  try {
    const text = () => host.querySelector('[data-testid="text"]')!.textContent
    host.querySelector<HTMLElement>('[data-testid="set"]')!.click()
    await nextTick()
    expect(text()).toBe('local')
    host.querySelector<HTMLElement>('[data-testid="bump"]')!.click()
    await nextTick()
    await nextTick()
    expect(text()).toBe('local')
  } finally {
    app.unmount()
    host.remove()
  }
})
