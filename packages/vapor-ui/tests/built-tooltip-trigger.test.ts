// Tooltip's #trigger slot through the built Vapor bundle: `:ref="setTriggerEl"` must attach.
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import TooltipTriggerVaporRoot from './fixtures/TooltipTriggerVaporRoot.vue'

test('Vapor: setTriggerEl attaches a plain element and a component', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(TooltipTriggerVaporRoot)
  app.mount(host)
  try {
    for (const id of ['plain-trigger', 'button-trigger', 'row-one', 'row-two', 'child-trigger']) {
      const el = host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
      const trigger = el.matches('button') ? el : (el.querySelector('button') ?? el)
      await userEvent.hover(trigger)
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull())
      await vi.waitFor(() => expect(trigger.getAttribute('aria-describedby')).toBeTruthy())
      await userEvent.unhover(trigger)
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull())
    }
  } finally {
    app.unmount()
  }
})

test('Vapor: a component that exposes no element gets a dev warning naming the fix', async () => {
  const { default: Root } = await import('./fixtures/TooltipTriggerClosedRoot.vue')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(Root)
  app.mount(host)
  try {
    await vi.waitFor(() =>
      expect(warn.mock.calls.some(([m]) => String(m).includes('defineExpose({ el })'))).toBe(true),
    )
  } finally {
    app.unmount()
    warn.mockRestore()
  }
})
