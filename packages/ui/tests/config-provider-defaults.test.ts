import '../src/style.css'
import { h, nextTick, shallowRef } from 'vue'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Button from '../src/components/Button/Button.vue'
import Input from '../src/components/Input/Input.vue'
import Switch from '../src/components/Switch/Switch.vue'
import Calendar from '../src/components/Calendar/Calendar.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import { toast, useToastQueue } from '../src/composables/useToast'

const q = (selector: string) => document.querySelector<HTMLElement>(selector)!
const all = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector))

test('size: components inside take the provider size, and their own size wins', async () => {
  await render(() =>
    h(ConfigProvider, { size: 'sm' }, () => [
      h(Button, null, () => 'Inherits'),
      h(Button, { size: 'lg' }, () => 'Own'),
      h(Input, { 'aria-label': 'Name' }),
    ]),
  )
  const [inherits, own] = all('.ui-button')
  expect(inherits!.classList.contains('ui-button--sm')).toBe(true)
  expect(own!.classList.contains('ui-button--lg')).toBe(true)
  expect(q('.ui-input').classList.contains('ui-input--sm')).toBe(true)
})

test('size: without a provider, components keep md', async () => {
  await render(() => [h(Button, null, () => 'Plain'), h(Switch, { 'aria-label': 'On' })])
  expect(q('.ui-button').classList.contains('ui-button--md')).toBe(true)
  expect(q('.ui-switch').classList.contains('ui-switch--md')).toBe(true)
})

test('size: a size a component lacks falls back to md', async () => {
  // Switch comes in sm and md only.
  await render(() => h(ConfigProvider, { size: 'lg' }, () => h(Switch, { 'aria-label': 'On' })))
  expect(q('.ui-switch').classList.contains('ui-switch--md')).toBe(true)
})

test('size: a nested provider overrides its parent, and a runtime change updates every component', async () => {
  const outer = shallowRef<'sm' | 'md' | 'lg'>('sm')
  await render(() =>
    h(ConfigProvider, { size: outer.value }, () => [
      h(Button, { 'data-testid': 'outer' }, () => 'Outer'),
      h(ConfigProvider, { size: 'lg' }, () => h(Button, { 'data-testid': 'inner' }, () => 'Inner')),
    ]),
  )
  expect(q('[data-testid="outer"]').classList.contains('ui-button--sm')).toBe(true)
  expect(q('[data-testid="inner"]').classList.contains('ui-button--lg')).toBe(true)
  outer.value = 'md'
  await nextTick()
  expect(q('[data-testid="outer"]').classList.contains('ui-button--md')).toBe(true)
  expect(q('[data-testid="inner"]').classList.contains('ui-button--lg')).toBe(true)
})

test('motionCss false turns built-in transitions off inside, and a component can turn its own back on', async () => {
  await render(() =>
    h(ConfigProvider, { motionCss: false }, () => [
      h(Calendar, { 'data-testid': 'off' }),
      h(Calendar, { 'data-testid': 'on', motionCss: true }),
    ]),
  )
  expect(q('[data-testid="off"]').dataset.motion).toBe('off')
  expect(q('[data-testid="on"]').dataset.motion).toBeUndefined()
})

test('locale: dates follow the i18n locale, including when it changes', async () => {
  const locale = shallowRef('fr-FR')
  const i18n = { t: (key: string) => key, locale }
  await render(() =>
    h(ConfigProvider, { i18n }, () => h(Calendar, { modelValue: new Date(2024, 5, 15) })),
  )
  expect(q('.ui-calendar-label').textContent).toContain('juin 2024')
  locale.value = 'de-DE'
  await nextTick()
  await expect.poll(() => q('.ui-calendar-label').textContent).toContain('Juni 2024')
})

test('locale: a component’s own locale wins, and a name Intl rejects falls back safely', async () => {
  const i18n = { t: (key: string) => key, locale: 'not a locale!' }
  await render(() =>
    h(ConfigProvider, { i18n }, () => [
      h(Calendar, { 'data-testid': 'safe', modelValue: new Date(2024, 5, 15) }),
      h(Calendar, { 'data-testid': 'own', modelValue: new Date(2024, 5, 15), locale: 'es-ES' }),
    ]),
  )
  // No crash: the invalid name is ignored and the browser's language is used.
  expect(q('[data-testid="safe"] .ui-calendar-label').textContent).toMatch(/2024/)
  expect(q('[data-testid="own"] .ui-calendar-label').textContent).toContain('junio')
})

test('locale: a number field re-renders its text when the locale changes', async () => {
  const locale = shallowRef('fr-FR')
  const i18n = { t: (key: string) => key, locale }
  await render(() =>
    h(ConfigProvider, { i18n }, () =>
      h(InputNumber, {
        modelValue: 1234.5,
        mode: 'currency',
        currency: 'EUR',
        'aria-label': 'Price',
      }),
    ),
  )
  await expect.poll(() => (q('input') as HTMLInputElement).value).toMatch(/1\s234,50\s€/)
  locale.value = 'en-US'
  await expect.poll(() => (q('input') as HTMLInputElement).value).toBe('€1,234.50')
})

// Animations off from a provider means instant, not "hands off": panels still open and close.
test('motionCss false from a provider: Accordion and Collapsible open and close instantly', async () => {
  const value = shallowRef<string | null>(null)
  const open = shallowRef(false)
  await render(() =>
    h(ConfigProvider, { motionCss: false }, () => [
      h(
        Accordion as never,
        { value: value.value, 'onUpdate:value': (v: string | null) => (value.value = v) },
        () => h(AccordionItem, { value: 'a', title: 'Section' }, () => 'Body'),
      ),
      h(
        Collapsible,
        { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) },
        () => 'Panel',
      ),
    ]),
  )
  const panels = () => all('.ui-accordion-panel, .ui-collapsible-panel')
  const heights = () => panels().map((p) => Math.round(p.getBoundingClientRect().height))
  expect(panels()).toHaveLength(2)
  expect(heights()).toEqual([0, 0])

  value.value = 'a'
  open.value = true
  await nextTick()
  await expect.poll(heights).toEqual([expect.any(Number), expect.any(Number)])
  await expect.poll(() => heights().every((h) => h > 0)).toBe(true)

  value.value = null
  open.value = false
  await expect.poll(heights).toEqual([0, 0])
})

test('a component’s own motion-css="false" still hands the height over to you', async () => {
  await render(() =>
    h(ConfigProvider, { motionCss: false }, () =>
      h(Collapsible, { open: false, motionCss: false }, () => 'Panel'),
    ),
  )
  // Hands-off writes no inline styles at all, so your own animation isn't fought.
  expect(q('.ui-collapsible-panel').getAttribute('style') ?? '').toBe('')
})

test('motionCss false from a provider: a dismissed toast still leaves, with no @card-leave listener', async () => {
  useToastQueue().dismiss()
  await render(() => h(ConfigProvider, { motionCss: false }, () => h(Toaster)), {
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  const id = toast('Saved', { duration: 60_000 })
  await expect.poll(() => all('.ui-toast').length).toBe(1)
  useToastQueue().dismiss(id)
  await expect.poll(() => all('.ui-toast').length).toBe(0)
})
