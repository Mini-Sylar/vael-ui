import '../src/style.css'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, ref } from 'vue'
import Input from '../src/components/Input/Input.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import Slider from '../src/components/Slider/Slider.vue'
import Knob from '../src/components/Knob/Knob.vue'
import Dial from '../src/components/Dial/Dial.vue'
import Rating from '../src/components/Rating/Rating.vue'
import ColorPicker from '../src/components/ColorPicker/ColorPicker.vue'
import FileUpload from '../src/components/FileUpload/FileUpload.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import Checkbox from '../src/components/Checkbox/Checkbox.vue'
import Switch from '../src/components/Switch/Switch.vue'
import RadioGroup from '../src/components/RadioGroup/RadioGroup.vue'
import Radio from '../src/components/Radio/Radio.vue'

const ticks = async (n = 3) => {
  for (let i = 0; i < n; i++) await nextTick()
}

const items = [
  { label: 'Alpha', value: 'a' },
  { label: 'Beta', value: 'b' },
]

function inForm(
  control: unknown,
  initial: unknown,
  props: Record<string, unknown> = {},
  modelName = 'modelValue',
  children?: () => unknown,
) {
  const model = ref(initial)
  const Wrapper = defineComponent({
    setup: () => () =>
      h('form', [
        h(
          control as never,
          {
            name: 'field',
            ...props,
            [modelName]: model.value,
            [`onUpdate:${modelName}`]: (value: unknown) => (model.value = value),
          },
          children ? { default: children } : undefined,
        ),
        h('button', { type: 'reset' }, 'Reset'),
      ]),
  })
  return { Wrapper, model }
}

const file = new File(['x'], 'a.txt', { type: 'text/plain' })

const cases: [
  string,
  unknown,
  unknown,
  unknown,
  Record<string, unknown>?,
  string?,
  (() => unknown)?,
][] = [
  ['Input', Input, 'start', 'changed'],
  ['Textarea', Textarea, 'start', 'changed'],
  ['PasswordInput', PasswordInput, 'start', 'changed'],
  ['OtpInput', OtpInput, '12', '1234'],
  ['InputNumber', InputNumber, 5, 9],
  ['Select', Select, 'a', 'b', { items }],
  ['Select multiple', Select, ['a'], ['a', 'b'], { items, multiple: true }],
  ['Combobox', Combobox, 'a', 'b', { items }],
  ['CascadeSelect', CascadeSelect, 'a', 'b', { items }],
  ['TreeSelect', TreeSelect, 'a', 'b', { items }],
  ['DatePicker', DatePicker, new Date(2026, 0, 2), new Date(2026, 5, 9)],
  ['Slider', Slider, 10, 50],
  ['Slider range', Slider, [10, 20], [30, 60]],
  ['Knob', Knob, 10, 50],
  ['Dial', Dial, 10, 50],
  ['Rating', Rating, 2, 4],
  ['ColorPicker', ColorPicker, '#ff0000', '#00ff00'],
  ['FileUpload', FileUpload, [], [file], {}, 'files'],
  ['SelectButton', SelectButton, 'a', 'b', { items }],
  ['Checkbox', Checkbox, true, false, { label: 'Agree' }],
  ['Switch', Switch, false, true, { label: 'On' }],
  [
    'RadioGroup',
    RadioGroup,
    'a',
    'b',
    {},
    'modelValue',
    () => [h(Radio, { value: 'a', label: 'A' }), h(Radio, { value: 'b', label: 'B' })],
  ],
]

test.each(cases)(
  '%s: a form reset puts the model back to its value at mount',
  async (_, control, initial, changed, props, modelName, children) => {
    const { Wrapper, model } = inForm(control, initial, props, modelName, children)
    const screen = await render(Wrapper)
    await ticks()
    model.value = changed
    await ticks()
    screen.container.querySelector('form')!.reset()
    await ticks()
    expect(model.value).toEqual(initial)
  },
)

test('Input: typed text and a reset button press come back to the start, model and field alike', async () => {
  const { Wrapper, model } = inForm(Input, 'start')
  const screen = await render(Wrapper)
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  await userEvent.fill(input, 'typed')
  expect(model.value).toBe('typed')
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await ticks()
  expect(model.value).toBe('start')
  expect(input.value).toBe('start')

  // Untouched, a reset leaves the field showing its value too.
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await ticks()
  expect(input.value).toBe('start')
})

test('Checkbox and Switch: the box shows the reset value, not the browser default', async () => {
  const box = inForm(Checkbox, true, { label: 'Agree' })
  const screen = await render(box.Wrapper)
  const input = screen.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  await userEvent.click(screen.getByText('Agree'))
  expect(box.model.value).toBe(false)
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await ticks()
  expect(box.model.value).toBe(true)
  expect(input.checked).toBe(true)
  // An untouched reset keeps it checked.
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await ticks()
  expect(input.checked).toBe(true)
})

test('OtpInput: typed digits reset with the form', async () => {
  const { Wrapper, model } = inForm(OtpInput, '12')
  const screen = await render(Wrapper)
  const input = screen.container.querySelector<HTMLInputElement>('.ui-otp-input')!
  input.focus()
  input.setSelectionRange(2, 2)
  await userEvent.keyboard('34')
  expect(model.value).toBe('1234')
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await ticks()
  expect(model.value).toBe('12')
  expect(input.value).toBe('12')
})

test('an unmounted control stops listening for its form reset', async () => {
  const { Wrapper, model } = inForm(Input, 'start')
  const shown = ref(true)
  const Toggle = defineComponent({ setup: () => () => (shown.value ? h(Wrapper) : null) })
  const form = await render(Toggle)
  const el = form.container.querySelector('form')!
  model.value = 'changed'
  shown.value = false
  await ticks()
  el.reset()
  expect(model.value).toBe('changed')
})

test.each([
  ['Combobox', Combobox, 'a', 'b', { items }, 'Alpha'],
  ['InputNumber', InputNumber, 5, 9, {}, '5'],
] as const)(
  '%s: after a reset the field shows the start value and stays closed',
  async (_, control, initial, changed, props, shown) => {
    const { Wrapper, model } = inForm(control, initial, props)
    const screen = await render(Wrapper)
    const input = screen.container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!
    await ticks()
    model.value = changed
    await ticks()
    expect(input.value).not.toBe(shown)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await ticks()
    expect(model.value).toBe(initial)
    expect(input.value).toBe(shown)
    expect(input.getAttribute('aria-expanded')).not.toBe('true')
  },
)

test('DatePicker: typed text that did not read is dropped by a reset, with its invalid mark', async () => {
  const start = new Date(2026, 0, 2)
  const { Wrapper, model } = inForm(DatePicker, start)
  const screen = await render(Wrapper)
  const input = screen.container.querySelector<HTMLInputElement>('input:not([type="hidden"])')!
  await ticks()
  const shown = input.value
  expect(shown).not.toBe('')
  await userEvent.fill(input, 'not a date')
  input.blur()
  await ticks()
  expect(input.getAttribute('aria-invalid')).toBe('true')
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  await ticks()
  expect(model.value).toEqual(start)
  expect(input.value).toBe(shown)
  expect(input.hasAttribute('aria-invalid')).toBe(false)
})
