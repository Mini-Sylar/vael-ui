// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import ComboboxGroupsRoot from './fixtures/ComboboxGroupsRoot.vue'

test('a grouped Combobox filters inside groups and picks in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ComboboxGroupsRoot)
  app.mount(host)
  try {
    const input = host.querySelector<HTMLInputElement>('[role="combobox"]')!
    await userEvent.click(input)
    await expect.poll(() => document.querySelectorAll('[role="group"]').length).toBe(2)
    expect(document.querySelector('[role="group"]')!.classList).toContain('food-group')
    await userEvent.type(input, 'ma')
    await expect.poll(() => document.querySelectorAll('[role="group"]').length).toBe(1)
    const group = document.querySelector('[role="group"]')!
    const label = document.getElementById(group.getAttribute('aria-labelledby')!)!
    expect(label.textContent?.trim()).toBe('Fruit · 1')
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => input.value).toBe('Mango')
  } finally {
    app.unmount()
    host.remove()
  }
})
