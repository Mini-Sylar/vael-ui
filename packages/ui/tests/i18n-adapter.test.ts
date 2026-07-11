/**
 * The i18n `Composer` returned by vue-i18n's `useI18n()` satisfies our
 * `I18nInstance` contract structurally (`{ t: (key) => string }`) — this
 * file proves the adapter works using a hand-rolled fake with the same
 * shape, without pulling `vue-i18n` in as a real dependency of the library.
 * A real vue-i18n instance is exercised in the playground
 * (`packages/playground/src/demos/DialogDemo.vue`).
 */
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { shallowRef } from 'vue'
import I18nAdapterFixture from './fixtures/I18nAdapterFixture.vue'

function closeLabel() {
  return document.querySelector('.ui-dialog-close')?.getAttribute('aria-label')
}

test('resolves the close label from an i18n instance under the uiKit.* namespace', () => {
  const i18n = { t: (key: string) => (key === 'uiKit.dialog.close' ? 'Fermer' : key) }
  render(I18nAdapterFixture, { props: { i18n } })
  expect(closeLabel()).toBe('Fermer')
})

test('a missing key falls back to the English default instead of leaking the raw path', () => {
  const i18n = { t: (key: string) => key } // simulates vue-i18n's own "key not found" behavior
  render(I18nAdapterFixture, { props: { i18n } })
  expect(closeLabel()).toBe('Close')
})

test('the static messages prop still overrides on top of a resolved i18n instance', () => {
  const i18n = { t: (key: string) => (key === 'uiKit.dialog.close' ? 'Fermer' : key) }
  render(I18nAdapterFixture, {
    props: { i18n, messages: { dialog: { close: 'Explicit override' } } },
  })
  expect(closeLabel()).toBe('Explicit override')
})

test('reacts to the i18n instance changing its own locale, like a real vue-i18n Composer would', async () => {
  const locale = shallowRef('en')
  const catalog: Record<string, Record<string, string>> = {
    en: { 'uiKit.dialog.close': 'Close' },
    fr: { 'uiKit.dialog.close': 'Fermer' },
  }
  // t() reads `locale.value` internally, same as a real Composer's t() does —
  // Vue's reactivity tracks that read transparently through the function call.
  const i18n = { t: (key: string) => catalog[locale.value]?.[key] ?? key }

  render(I18nAdapterFixture, { props: { i18n } })
  expect(closeLabel()).toBe('Close')

  locale.value = 'fr'
  await new Promise((r) => setTimeout(r, 0)) // flush the computed
  expect(closeLabel()).toBe('Fermer')
})
