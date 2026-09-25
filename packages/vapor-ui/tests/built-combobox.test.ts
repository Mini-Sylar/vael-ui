// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp, nextTick } from 'vue'
import ComboboxFilterRoot from './fixtures/ComboboxFilterRoot.vue'

function visibleOptions() {
  return [...document.querySelectorAll('[role="option"]')].map((el) => el.textContent?.trim())
}

test('Combobox filters on real (trusted) keystrokes in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ComboboxFilterRoot)
  app.mount(host)
  try {
    const input = host.querySelector<HTMLInputElement>('input')!
    await userEvent.click(input)
    await userEvent.type(input, 'kas')
    await nextTick()
    await expect.poll(visibleOptions).toEqual(['Kasoa Toll Booth', 'Kasoa Amanfrom'])
  } finally {
    app.unmount()
    host.remove()
  }
})
