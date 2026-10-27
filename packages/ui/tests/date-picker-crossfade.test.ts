// A date picked from the calendar crossfades into the field, as Select's label does; what you type
// shows plain, with no overlay over it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, shallowRef } from 'vue'
import type { Component } from 'vue'
import Select from '../src/components/Select/Select.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'

async function renderPicker(props: Record<string, unknown> = {}) {
  const model = shallowRef<Date | null>(new Date(2024, 5, 10))
  const Host = defineComponent(
    () => () =>
      h(DatePicker as Component, {
        locale: 'en-US',
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: Date | null) => (model.value = value),
      }),
  )
  const screen = await render(Host, { global: { stubs: { transition: false } } })
  const input = screen.getByRole('combobox').element() as HTMLInputElement
  return { screen, model, input }
}

test('a picked date crossfades in, and typing takes over with plain text', async () => {
  const { screen, input } = await renderPicker()
  await screen.getByRole('combobox').click()
  const day = () => document.querySelector<HTMLElement>('[data-date="2024-06-15"]')
  await vi.waitFor(() => expect(day()).not.toBeNull())
  day()!.click()
  await vi.waitFor(() =>
    expect(
      document.querySelector('.ui-input-display .ui-animated-text-enter-active'),
    ).not.toBeNull(),
  )
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-input-display')?.textContent).toContain('15'),
  )
  input.focus()
  input.select()
  await userEvent.keyboard('6/2')
  await vi.waitFor(() => expect(document.querySelector('.ui-input-display')).toBeNull())
})

test('with motion off a picked date is written straight into the field', async () => {
  const { screen } = await renderPicker({ motion: false })
  await screen.getByRole('combobox').click()
  const day = () => document.querySelector<HTMLElement>('[data-date="2024-06-15"]')
  await vi.waitFor(() => expect(day()).not.toBeNull())
  day()!.click()
  await vi.waitFor(() =>
    expect((screen.getByRole('combobox').element() as HTMLInputElement).value).toContain('15'),
  )
  expect(document.querySelector('.ui-input-display')).toBeNull()
})

test('motion.valueSwap: false writes a picked date plainly, with the calendar still animated', async () => {
  const { screen } = await renderPicker({ motion: { valueSwap: false } })
  await screen.getByRole('combobox').click()
  const day = () => document.querySelector<HTMLElement>('[data-date="2024-06-15"]')
  await vi.waitFor(() => expect(day()).not.toBeNull())
  day()!.click()
  await vi.waitFor(() =>
    expect((screen.getByRole('combobox').element() as HTMLInputElement).value).toContain('15'),
  )
  expect(document.querySelector('.ui-input-display')).toBeNull()
})

test('Select with motion.valueSwap: false swaps its label without the crossfade', async () => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]
  const screen = await render(Select as Component, {
    props: { items, motion: { valueSwap: false }, 'aria-label': 'Fruit' },
    global: { stubs: { transition: false } },
  })
  await screen.getByRole('combobox').click()
  await screen.getByRole('option', { name: 'Banana' }).click()
  await vi.waitFor(() =>
    expect(screen.getByRole('combobox').element().textContent).toContain('Banana'),
  )
  expect(document.querySelector('.ui-animated-text-enter-active')).toBeNull()
})

async function pickBanana(
  selectProps: Record<string, unknown>,
  providerProps: Record<string, unknown>,
) {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]
  const screen = await render(
    () =>
      h(ConfigProvider as Component, providerProps, () =>
        h(Select as Component, { items, 'aria-label': 'Fruit', ...selectProps }),
      ),
    { global: { stubs: { transition: false } } },
  )
  await screen.getByRole('combobox').click()
  await screen.getByRole('option', { name: 'Banana' }).click()
  const crossfaded = await vi
    .waitFor(() => {
      if (!document.querySelector('.ui-animated-text-enter-active')) throw new Error('none')
    }, 600)
    .then(
      () => true,
      () => false,
    )
  return crossfaded
}

test("ConfigProvider's motion.valueSwap: false turns the crossfade off for every picker inside", async () => {
  expect(await pickBanana({}, { motion: { valueSwap: false } })).toBe(false)
})

test('a full motion style carries valueSwap too', async () => {
  expect(await pickBanana({}, { motion: { version: 1, valueSwap: false } })).toBe(false)
})

test("a component's own valueSwap wins over the provider's", async () => {
  expect(await pickBanana({ motion: { valueSwap: true } }, { motion: { valueSwap: false } })).toBe(
    true,
  )
})
