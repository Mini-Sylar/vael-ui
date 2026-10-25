/**
 * v-hover-indicator through the BUILT vapor bundle: its function form must be registered in
 * generate-vapor.mjs, or a Vapor app only finds out at runtime ("dir is not a function").
 */
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import HoverIndicatorRoot from './fixtures/HoverIndicatorRoot.vue'

test('the built vapor bundle adds the highlight and slides it to the hovered row', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(HoverIndicatorRoot)
  app.mount(host)
  try {
    const list = host.querySelector<HTMLElement>('[data-testid="vapor-hover-list"]')!
    await vi.waitFor(() => expect(list.querySelector(':scope > .ui-indicator')).not.toBeNull())
    const row = [...list.querySelectorAll<HTMLElement>('.row')].find(
      (el) => el.textContent === 'Three',
    )!
    await userEvent.hover(row)
    await vi.waitFor(() => expect(row.hasAttribute('data-indicated')).toBe(true))
  } finally {
    app.unmount()
  }
  expect(host.querySelector('.ui-indicator')).toBeNull()
})
