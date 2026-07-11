/**
 * Real-component interactive verification for vTooltipVapor/
 * vScrollMaskVapor — not just "did it render," but did the directive
 * actually DO its job: register a tooltip target, toggle the scroll-fade
 * class on real overflow. Through the BUILT dist bundle, no interop plugin.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import DirectivesRoot from './fixtures/DirectivesRoot.vue'

test('vTooltipVapor registers a real target on a Dock item', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(DirectivesRoot)
  app.mount(host)
  try {
    const dockButton = host.querySelector<HTMLElement>('[class*="ui-dock-item"]')
    expect(dockButton).not.toBeNull()
    expect(dockButton!.hasAttribute('data-ui-tooltip')).toBe(true)
  } finally {
    app.unmount()
  }
})

test('vScrollMaskVapor toggles scroll-fade based on real overflow', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(DirectivesRoot)
  app.mount(host)
  try {
    host.querySelector<HTMLElement>('[data-testid="directives-popover-trigger"]')!.click()
    // v-scroll-mask is on Popover's OWN .ui-popover-body wrapper (the thing
    // that actually scrolls), not the plain content div nested inside it —
    // Popover teleports its content to document.body, so search there, not
    // inside `host`. 200 lines reliably overflows the panel's own
    // auto-computed max-height regardless of viewport size.
    await vi.waitFor(() => {
      const body = document.querySelector<HTMLElement>('.ui-popover-body')
      expect(body).not.toBeNull()
      expect(body!.classList.contains('scroll-fade')).toBe(true)
    })
  } finally {
    app.unmount()
  }
})
