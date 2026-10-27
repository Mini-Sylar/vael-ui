// The four gaps left after the accessibility pass, each checked against the code.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h } from 'vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'
import ContextMenu from '../src/components/ContextMenu/ContextMenu.vue'
import Dial from '../src/components/Dial/Dial.vue'
import Input from '../src/components/Input/Input.vue'

// The accessible name aria-labelledby gives: each referenced element's label or text, in order.
const nameFrom = (el: Element) =>
  (el.getAttribute('aria-labelledby') ?? '')
    .split(' ')
    .map((id) => {
      const ref = document.getElementById(id)!
      return ref.getAttribute('aria-label') ?? ref.textContent!.trim()
    })
    .join(' ')

test('Dial: invalid sets aria-invalid on the slider', async () => {
  render(() => h(Dial as never, { modelValue: 2, invalid: true, 'aria-label': 'Volume' }))
  await vi.waitFor(() =>
    expect(document.querySelector('[role="slider"]')!.getAttribute('aria-invalid')).toBe('true'),
  )
})

test('CascadeSelect: an aria-label is read with the value after it', async () => {
  const items = [{ label: 'Ghana', value: 'gh', children: [{ label: 'Accra', value: 'acc' }] }]
  render(() => h(CascadeSelect as never, { items, modelValue: 'acc', 'aria-label': 'City' }))
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-cascade-select-control')).not.toBeNull(),
  )
  const control = document.querySelector('.ui-cascade-select-control')!
  expect(control.getAttribute('role')).toBe('button')
  expect(nameFrom(control)).toMatch(/^City .*Accra/)
})

test('ContextMenu: the menu is named by your aria-label, never by its hidden anchor', async () => {
  render(() =>
    h(
      ContextMenu as never,
      { items: [{ label: 'Copy', value: 'copy' }], 'aria-label': 'Note actions' },
      () => h('div', { class: 'area', style: 'block-size: 80px' }, 'Right-click me'),
    ),
  )
  await userEvent.click(document.querySelector('.area')!, { button: 'right' })
  const menu = await vi.waitFor(() => document.querySelector('[role="menu"]')!)
  expect(menu.getAttribute('aria-label')).toBe('Note actions')
  expect(menu.getAttribute('aria-labelledby')).toBeNull()
})

test("Input clearable: the clear button is named 'Clear', not Select's wording", async () => {
  render(() => h(Input as never, { modelValue: 'hello', clearable: true, 'aria-label': 'Name' }))
  const clear = await vi.waitFor(() => document.querySelector('.ui-input-clear')!)
  expect(clear.getAttribute('aria-label')).toBe('Clear')
})
