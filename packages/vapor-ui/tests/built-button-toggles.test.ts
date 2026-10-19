// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import ButtonGroupTogglesRoot from './fixtures/ButtonGroupTogglesRoot.vue'

test('ButtonGroup v-model and Button v-model:pressed toggle in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ButtonGroupTogglesRoot)
  app.mount(host)
  try {
    const get = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
    expect(get('bold').getAttribute('aria-pressed')).toBe('true')
    expect(get('italic').getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(get('italic'))
    await userEvent.click(get('bold'))
    await userEvent.click(get('pin'))
    await expect.poll(() => get('state').textContent).toBe('italic|true')
    expect(get('italic').getAttribute('aria-pressed')).toBe('true')
    expect(get('bold').getAttribute('aria-pressed')).toBe('false')
    expect(get('pin').getAttribute('aria-pressed')).toBe('true')
  } finally {
    app.unmount()
    host.remove()
  }
})
