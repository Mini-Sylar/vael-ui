import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'

// A remote search replaces `items` with each response; what was chosen keeps its label.
const users = [
  { label: 'ada@example.com', value: 1 },
  { label: 'grace@example.com', value: 2 },
]
const response = [{ label: 'linus@example.com', value: 3 }]

test('Select: a choice missing from the latest items keeps its label, until it is cleared', async () => {
  const items = shallowRef(users)
  const value = shallowRef<number | null>(2)
  await render(() =>
    h(Select as never, {
      items: items.value,
      modelValue: value.value,
      placeholder: 'Pick a user',
      filter: false,
    }),
  )
  const label = () => document.querySelector('.ui-select-value')?.textContent?.trim()
  await vi.waitFor(() => expect(label()).toBe('grace@example.com'))
  items.value = response
  await nextTick()
  expect(label()).toBe('grace@example.com')
  expect(document.querySelector('.ui-select-placeholder')).toBeNull()
  value.value = null
  await nextTick()
  expect(label()).toBe('Pick a user')
})

test('Select multiple: chips for choices missing from the latest items stay', async () => {
  const items = shallowRef(users)
  await render(() =>
    h(Select as never, { items: items.value, modelValue: [1, 2], multiple: true, filter: false }),
  )
  const chips = () => [...document.querySelectorAll('.ui-chip')].map((c) => c.textContent?.trim())
  await vi.waitFor(() => expect(chips()).toEqual(['ada@example.com', 'grace@example.com']))
  items.value = response
  await nextTick()
  expect(chips()).toEqual(['ada@example.com', 'grace@example.com'])
})

test('Combobox: a choice missing from the latest items shows its label, not its raw value', async () => {
  const items = shallowRef(users)
  await render(() => h(Combobox as never, { items: items.value, modelValue: 2, filter: false }))
  const input = () => document.querySelector<HTMLInputElement>('input')!
  await vi.waitFor(() => expect(input().value).toBe('grace@example.com'))
  items.value = response
  await nextTick()
  // Reading the label again (as a blur or reset does) still finds it.
  input().dispatchEvent(new FocusEvent('blur'))
  await nextTick()
  expect(input().value).toBe('grace@example.com')
})

test('Combobox multiple: chips for choices missing from the latest items stay', async () => {
  const items = shallowRef(users)
  await render(() =>
    h(Combobox as never, { items: items.value, modelValue: [1, 2], multiple: true, filter: false }),
  )
  const chips = () => [...document.querySelectorAll('.ui-chip')].map((c) => c.textContent?.trim())
  await vi.waitFor(() => expect(chips()).toEqual(['ada@example.com', 'grace@example.com']))
  items.value = response
  await nextTick()
  expect(chips()).toEqual(['ada@example.com', 'grace@example.com'])
})
