// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import CascadeSearchRoot from './fixtures/CascadeSearchRoot.vue'

test('CascadeSelect search and per-level panels work in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(CascadeSearchRoot)
  app.mount(host)
  try {
    // CascadeSelect's trigger is a menu button.
    await userEvent.click(host.querySelector<HTMLElement>('.ui-cascade-select-control')!)
    await expect
      .poll(() => document.activeElement?.closest('.ui-cascade-select-filter'))
      .toBeTruthy()
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await expect
      .poll(() =>
        [...document.querySelectorAll<HTMLElement>('.geo-panel')].map((el) => el.dataset.level),
      )
      .toEqual(['1', '2'])
    await userEvent.keyboard('k')
    await expect
      .poll(() =>
        document.querySelector('[role="menuitem"]')?.textContent?.replace(/\s+/g, ' ').trim(),
      )
      .toBe('Kumasi Africa / Ghana')
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => host.querySelector('[data-testid="value"]')?.textContent).toBe('kumasi')
  } finally {
    app.unmount()
    host.remove()
  }
})
