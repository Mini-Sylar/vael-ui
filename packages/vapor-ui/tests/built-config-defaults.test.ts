// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import ConfigDefaultsVaporRoot from './fixtures/ConfigDefaultsVaporRoot.vue'

test('ConfigProvider size, motion and i18n locale reach Vapor components, and update live', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createVaporApp(ConfigDefaultsVaporRoot)
  const root = app.mount(host) as unknown as {
    setSize: (size: 'sm' | 'md' | 'lg') => void
    setLocale: (locale: string) => void
  }
  const q = (selector: string) => host.querySelector<HTMLElement>(selector)!
  await nextTick()

  expect(q('[data-testid="inherits"]').classList.contains('ui-button--sm')).toBe(true)
  expect(q('[data-testid="own"]').classList.contains('ui-button--lg')).toBe(true)
  expect(q('[data-testid="calendar"]').dataset.motion).toBe('off')
  expect(q('.ui-calendar-label').textContent).toContain('juin 2024')

  root.setSize('md')
  root.setLocale('de-DE')
  await nextTick()
  expect(q('[data-testid="inherits"]').classList.contains('ui-button--md')).toBe(true)
  await expect.poll(() => q('.ui-calendar-label').textContent).toContain('Juni 2024')

  app.unmount()
  host.remove()
})
