// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import SelectGroupsRoot from './fixtures/SelectGroupsRoot.vue'

test('a grouped Select renders labelled groups and picks inside them in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(SelectGroupsRoot)
  app.mount(host)
  try {
    const trigger = host.querySelector<HTMLElement>('[role="combobox"]')!
    await userEvent.click(trigger)
    await expect.poll(() => document.querySelector('[role="group"]')).toBeTruthy()
    const group = document.querySelector('[role="group"]')!
    const labelId = group.getAttribute('aria-labelledby')!
    expect(document.getElementById(labelId)?.textContent?.trim()).toBe('Ghana')
    await userEvent.click(document.querySelectorAll<HTMLElement>('[role="option"]')[2]!) // Kumasi
    await expect.poll(() => trigger.textContent).toContain('Kumasi')
  } finally {
    app.unmount()
    host.remove()
  }
})
