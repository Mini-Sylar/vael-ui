// A v-tooltip target's own `ui` through the BUILT vapor bundle.
import '../../ui/src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import TooltipUiVaporRoot from './fixtures/TooltipUiVaporRoot.vue'

test('Vapor: a target takes its own tooltip ui over the host, the others keep the host look', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(TooltipUiVaporRoot)
  app.mount(host)
  try {
    const bg = () =>
      getComputedStyle(document.querySelector('[role="tooltip"]')!, '::before').backgroundColor
    const hover = (id: string) =>
      userEvent.hover(host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!)
    await hover('plain')
    await vi.waitFor(() => expect(bg()).toBe('rgb(0, 128, 0)'))
    await hover('own')
    await vi.waitFor(() => expect(bg()).toBe('rgb(255, 0, 0)'))
    await hover('plain')
    await vi.waitFor(() => expect(bg()).toBe('rgb(0, 128, 0)'))
  } finally {
    app.unmount()
  }
})
