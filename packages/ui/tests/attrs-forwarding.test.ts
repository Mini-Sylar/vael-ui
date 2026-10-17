import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import Tour from '../src/components/Tour/Tour.vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'

// Components with more than one root (or a Teleport root) route attrs by hand.

test('PasswordInput puts class and style on its wrapper and other attrs on the input', async () => {
  const screen = await render(PasswordInput, {
    attrs: { class: 'extra', style: 'margin-top: 3px', id: 'pw', 'data-testid': 'pw-input' },
  })
  const root = screen.container.querySelector('.ui-password-input')!
  expect(root.classList.contains('extra')).toBe(true)
  expect((root as HTMLElement).style.marginTop).toBe('3px')
  const input = screen.container.querySelector('input')!
  expect(input.id).toBe('pw')
  expect(input.dataset.testid).toBe('pw-input')
  expect(input.classList.contains('extra')).toBe(false)
})

test('Toaster puts attrs on the toast region', async () => {
  const screen = await render(Toaster, { attrs: { class: 'extra', 'data-testid': 'toasts' } })
  await vi.waitFor(() => {
    const region = document.querySelector('.ui-toaster')!
    expect(region.classList.contains('extra')).toBe(true)
    expect(region.getAttribute('data-testid')).toBe('toasts')
  })
  screen.unmount()
})

test('Tour puts attrs on its panel', async () => {
  const target = document.createElement('div')
  target.textContent = 'target'
  document.body.append(target)
  const screen = await render(Tour, {
    props: { open: true, steps: [{ target, title: 'Step' }] },
    attrs: { class: 'extra' },
  })
  await vi.waitFor(() => expect(document.querySelector('.ui-popover-panel.extra')).not.toBeNull())
  screen.unmount()
  target.remove()
})

test.each([
  ['Select', Select],
  ['Combobox', Combobox],
] as const)('%s applies ui.empty to the empty state', async (_, Comp) => {
  const screen = await render(Comp as never, {
    // Generic components: the shared props don't narrow through the union.
    props: { items: [], open: true, ui: { empty: 'custom-empty' } } as never,
  })
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-select-empty.custom-empty')).not.toBeNull(),
  )
  screen.unmount()
})

test.each([
  ['Select', Select, { items: [{ label: 'A', value: 'a' }] }],
  ['Combobox', Combobox, { items: [{ label: 'A', value: 'a' }] }],
  ['TreeSelect', TreeSelect, { items: [] }],
  ['DatePicker', DatePicker, {}],
] as const)('a plain class passed to %s reaches the rendered trigger', async (_, Comp, props) => {
  const screen = await render(Comp as never, {
    props: props as never,
    attrs: { class: 'my-field' },
  })
  expect(screen.getByRole('combobox').element().closest('.my-field')).not.toBeNull()
})

test.each([
  ['Select', Select, { items: [{ label: 'A', value: 'a' }] }],
  ['Combobox', Combobox, { items: [{ label: 'A', value: 'a' }] }],
  ['TreeSelect', TreeSelect, { items: [{ value: 'a', label: 'A' }] }],
  ['DatePicker', DatePicker, {}],
  ['CascadeSelect', CascadeSelect, { items: [{ label: 'A', value: 'a' }] }],
] as const)(
  '%s puts id, aria-* and data-* on the combobox, not the panel',
  async (_, Comp, props) => {
    const screen = await render(Comp as never, {
      props: { ...props, open: true } as never,
      attrs: { id: 'fruit', 'aria-label': 'Fruit', 'data-testid': 'fruit-control' },
    })
    const combobox = screen.getByRole('combobox', { name: 'Fruit' }).element()
    expect(combobox.id).toBe('fruit')
    expect(combobox.getAttribute('data-testid')).toBe('fruit-control')
    // The panel must not duplicate the id or steal the label.
    await new Promise((r) => setTimeout(r, 50))
    expect(document.querySelectorAll('#fruit')).toHaveLength(1)
    expect(document.querySelectorAll('[data-testid="fruit-control"]')).toHaveLength(1)
    expect(document.querySelectorAll('[aria-label="Fruit"]')).toHaveLength(1)
    screen.unmount()
  },
)
