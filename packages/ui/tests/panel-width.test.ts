// `panelWidth` on the dropdowns: `'trigger'` (the default) matches the field; a set width in px or
// any CSS length is exactly that, even narrower than the panel's usual floor.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import type { Component } from 'vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import Select from '../src/components/Select/Select.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import type { PanelWidth } from '../src/composables/panelWidth'

afterEach(() => {
  for (const el of document.querySelectorAll('[class$="-positioner"]')) el.remove()
})

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
]
const tree = [{ label: 'Fruits', value: 'fruits', children: options }]
const kinds: [string, Component, unknown][] = [
  ['Select', Select as Component, options],
  ['Combobox', Combobox as Component, options],
  ['TreeSelect', TreeSelect as Component, tree],
]

async function panelWidth(component: Component, items: unknown, width?: PanelWidth) {
  const screen = await render(() =>
    h('div', { style: 'width: 480px' }, [h(component, { items, panelWidth: width })]),
  )
  await screen.getByRole('combobox').click()
  const panel = () => document.querySelector<HTMLElement>('.ui-select-panel')
  await vi.waitFor(() => expect(panel()).toBeTruthy())
  await new Promise((r) => setTimeout(r, 400))
  return panel()!.getBoundingClientRect().width
}

for (const [name, component, items] of kinds) {
  test(`${name}: unset, the panel matches the field`, async () => {
    expect(await panelWidth(component, items)).toBeCloseTo(480, 0)
  })

  test(`${name}: a set width is the panel's width, even under its usual floor`, async () => {
    expect(await panelWidth(component, items, 150)).toBeCloseTo(150, 0)
  })

  test(`${name}: a CSS length works too`, async () => {
    expect(await panelWidth(component, items, '20rem')).toBeCloseTo(320, 0)
  })
}

async function datePanelWidth(width?: PanelWidth) {
  const screen = await render(() =>
    h('div', { style: 'width: 480px' }, [h(DatePicker as Component, { panelWidth: width })]),
  )
  await screen.getByRole('combobox').click()
  const panel = () => document.querySelector<HTMLElement>('.ui-date-picker-panel')
  await vi.waitFor(() => expect(panel()).toBeTruthy())
  await new Promise((r) => setTimeout(r, 400))
  return panel()!.getBoundingClientRect().width
}

test("DatePicker: unset, the panel is the calendar's own width", async () => {
  expect(await datePanelWidth()).toBeLessThan(400)
})

test("DatePicker: 'trigger' makes it at least the field's width", async () => {
  expect(await datePanelWidth('trigger')).toBeGreaterThanOrEqual(480 - 0.5)
})

test('DatePicker: a set width is its width', async () => {
  expect(await datePanelWidth('22rem')).toBeCloseTo(352, 0)
})

test('a set width wider than the screen still fits it', async () => {
  expect(await panelWidth(Select as Component, options, 5000)).toBeLessThanOrEqual(
    window.innerWidth,
  )
})
