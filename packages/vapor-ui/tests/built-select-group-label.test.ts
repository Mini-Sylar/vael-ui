// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import SelectGroupLabelRoot from './fixtures/SelectGroupLabelRoot.vue'

test('#group-label, #item group and ui.group work in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(SelectGroupLabelRoot)
  app.mount(host)
  try {
    await userEvent.click(host.querySelector<HTMLElement>('[role="combobox"]')!)
    await expect.poll(() => document.querySelector('[role="group"]')).toBeTruthy()
    const group = document.querySelector('[role="group"]')!
    expect(group.classList).toContain('office-group')
    const label = document.getElementById(group.getAttribute('aria-labelledby')!)!
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe('🇬🇭 Ghana · 2')
    const options = [...document.querySelectorAll('[role="option"]')].map((el) =>
      el.textContent?.trim(),
    )
    expect(options).toEqual(['Remote (none)', 'Accra (🇬🇭)', 'Kumasi (🇬🇭)'])
  } finally {
    app.unmount()
    host.remove()
  }
})
