import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import FileUpload from '../src/components/FileUpload/FileUpload.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import Rating from '../src/components/Rating/Rating.vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import Slider from '../src/components/Slider/Slider.vue'
import Field from '../src/components/Field/Field.vue'
import Calendar from '../src/components/Calendar/Calendar.vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'

const global = { stubs: { transition: false, 'transition-group': false } }
const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
]

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner, .ui-menu-positioner'))
    el.remove()
})
afterEach(() => vi.restoreAllMocks())

// A control in a form, its model kept in a shallowRef.
function inForm(component: unknown, props: Record<string, unknown>, initial: unknown = null) {
  const model = shallowRef<unknown>(initial)
  const screen = render(
    () =>
      h('form', { 'data-testid': 'form' }, [
        h(component as never, {
          modelValue: model.value,
          'onUpdate:modelValue': (value: unknown) => (model.value = value),
          ...props,
        }),
      ]),
    { global },
  )
  const form = () => document.querySelector<HTMLFormElement>('[data-testid="form"]')!
  return { screen, model, form }
}

function composingKey(target: Element, key: string) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true, cancelable: true }),
  )
}

test('FileUpload: a plain form post carries every file, dropped ones and after a removal', async () => {
  const files = shallowRef<File[]>([])
  const screen = await render(
    () =>
      h('form', { 'data-testid': 'form' }, [
        h(FileUpload, {
          name: 'docs',
          files: files.value,
          'onUpdate:files': (value: File[]) => (files.value = value),
        }),
      ]),
    { global },
  )
  const form = document.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const transfer = new DataTransfer()
  transfer.items.add(new File(['a'], 'a.txt', { type: 'text/plain' }))
  transfer.items.add(new File(['bb'], 'b.txt', { type: 'text/plain' }))
  for (const type of ['dragenter', 'dragover', 'drop']) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', { value: transfer })
    document.querySelector('.ui-file-upload-dropzone')!.dispatchEvent(event)
  }
  await vi.waitFor(() => expect(files.value).toHaveLength(2))
  await nextTick()
  const posted = () => (new FormData(form).getAll('docs') as File[]).map((file) => file.name)
  expect(posted()).toEqual(['a.txt', 'b.txt'])

  await screen.getByRole('button', { name: /a\.txt/ }).click()
  await vi.waitFor(() => expect(posted()).toEqual(['b.txt']))
})

test('FileUpload: a picked file stays in the input, and a rejected pick leaves it out', async () => {
  const files = shallowRef<File[]>([])
  await render(
    () =>
      h(FileUpload, {
        name: 'docs',
        accept: '.txt',
        files: files.value,
        'onUpdate:files': (value: File[]) => (files.value = value),
      }),
    { global },
  )
  const input = document.querySelector<HTMLInputElement>('.ui-file-upload-input')!
  const pick = (file: File) => {
    const transfer = new DataTransfer()
    transfer.items.add(file)
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  pick(new File(['a'], 'a.txt', { type: 'text/plain' }))
  await vi.waitFor(() => expect(files.value).toHaveLength(1))
  expect([...input.files!].map((file) => file.name)).toEqual(['a.txt'])
  pick(new File(['p'], 'p.png', { type: 'image/png' }))
  await nextTick()
  expect([...input.files!].map((file) => file.name)).toEqual(['a.txt'])
})

test('DatePicker: the hidden input posts at the shown precision, from local fields', async () => {
  const date = new Date(2026, 2, 5, 9, 7)
  const cases: [Record<string, unknown>, string][] = [
    [{}, '2026-03-05'],
    [{ showTime: true }, '2026-03-05T09:07'],
    [{ timeOnly: true }, '09:07'],
    [{ view: 'month' }, '2026-03'],
  ]
  for (const [props, expected] of cases) {
    const { screen, form } = inForm(DatePicker, { name: 'when', ...props }, date)
    await screen
    expect(new FormData(form()).get('when')).toBe(expected)
    ;(await screen).unmount()
  }
})

test('DatePicker and Combobox: your autocomplete wins, and it is off by default', async () => {
  for (const [component, props] of [
    [DatePicker, {}],
    [Combobox, { items: fruits }],
  ] as const) {
    const own = await render(() => h(component as never, { ...props, autocomplete: 'bday' }))
    expect(document.querySelector('input.ui-input-el')!.getAttribute('autocomplete')).toBe('bday')
    own.unmount()
    const plain = await render(() => h(component as never, props))
    expect(document.querySelector('input.ui-input-el')!.getAttribute('autocomplete')).toBe('off')
    plain.unmount()
  }
})

test('IME: Enter while composing in a Combobox does not pick', async () => {
  const { screen, model } = inForm(Combobox, { items: fruits })
  const input = (await screen).getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'ban')
  await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())
  await userEvent.keyboard('{ArrowDown}')
  composingKey(input.element(), 'Enter')
  await nextTick()
  expect(model.value).toBeNull()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(model.value).toBe('banana'))
})

test('IME: Enter while composing in the Select filter does not pick', async () => {
  const { screen, model } = inForm(Select, { items: fruits, filter: true })
  await (await screen).getByRole('combobox').click()
  const filter = await vi.waitFor(() =>
    document.querySelector<HTMLInputElement>('.ui-select-filter input')!,
  )
  await userEvent.type(filter, 'ban')
  composingKey(filter, 'Enter')
  await nextTick()
  expect(model.value).toBeNull()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(model.value).toBe('banana'))
})

test('IME: Enter while composing in the CascadeSelect search does not pick', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  const search = () => document.querySelector<HTMLInputElement>('.ui-cascade-select-filter input')
  await vi.waitFor(() => expect(document.activeElement).toBe(search()))
  await userEvent.keyboard('par')
  composingKey(search()!, 'Enter')
  await nextTick()
  expect(screen.getByTestId('value').element().textContent).toBe('')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('paris')
})

test('required: an empty Select blocks a native submit and takes the focus; a choice lets it through', async () => {
  const { screen, model, form } = inForm(Select, { items: fruits, name: 'fruit', required: true })
  const combobox = (await screen).getByRole('combobox')
  await expect.element(combobox).toHaveAttribute('aria-required', 'true')
  expect(
    document.querySelector('[role="listbox"][required], .ui-select-panel[required]'),
  ).toBeNull()
  expect(form().checkValidity()).toBe(false)
  form().reportValidity()
  await vi.waitFor(() => expect(document.activeElement).toBe(combobox.element()))
  model.value = 'apple'
  await nextTick()
  expect(form().checkValidity()).toBe(true)
})

test('required: hidden-input controls block a native submit while empty', async () => {
  const cases: [unknown, Record<string, unknown>, unknown, unknown][] = [
    [Combobox, { items: fruits, multiple: true }, [], ['apple']],
    [TreeSelect, { items: [{ value: 'a', label: 'A' }] }, null, 'a'],
    [DatePicker, {}, null, new Date(2026, 0, 1)],
    [Rating, {}, 0, 3],
  ]
  for (const [component, props, empty, filled] of cases) {
    const { screen, model, form } = inForm(component, { ...props, required: true }, empty)
    await screen
    expect(form().checkValidity(), `${(component as { __name?: string }).__name} empty`).toBe(false)
    model.value = filled
    await nextTick()
    expect(form().checkValidity(), `${(component as { __name?: string }).__name} filled`).toBe(true)
    ;(await screen).unmount()
  }
})

test('required: a Combobox with chips and no typed text is valid', async () => {
  const { screen, form } = inForm(Combobox, { items: fruits, multiple: true, required: true }, [
    'apple',
  ])
  await screen
  expect(document.querySelector<HTMLInputElement>('input.ui-input-el')!.required).toBe(false)
  expect(form().checkValidity()).toBe(true)
})

test("required: a Field's own required stays aria-only, so no native check", async () => {
  const model = shallowRef(null)
  await render(
    () =>
      h('form', { 'data-testid': 'form' }, [
        h(Field, { label: 'Fruit', required: true }, () =>
          h(Select as never, { items: fruits, modelValue: model.value }),
        ),
      ]),
    { global },
  )
  const form = document.querySelector<HTMLFormElement>('[data-testid="form"]')!
  expect(document.querySelector('[role="combobox"]')!.getAttribute('aria-required')).toBe('true')
  expect(form.checkValidity()).toBe(true)
})

test('OtpInput: required and autocorrect reach the real input', async () => {
  await render(() => h(OtpInput, { required: true }))
  const input = document.querySelector<HTMLInputElement>('.ui-otp input')!
  expect(input.required).toBe(true)
  expect(input.getAttribute('autocorrect')).toBe('off')
  expect(input.closest('.ui-otp')?.hasAttribute('required') ?? false).toBe(false)
})

test('InputNumber: aria-valuetext reads the formatted value', async () => {
  await render(() => h(InputNumber, { modelValue: 0.25, mode: 'percent' }))
  const spin = document.querySelector('[role="spinbutton"]')!
  expect(spin.getAttribute('aria-valuenow')).toBe('0.25')
  expect(spin.getAttribute('aria-valuetext')).toBe(
    new Intl.NumberFormat(undefined, { style: 'percent' }).format(0.25),
  )
})

test('Slider and Rating let the page scroll across them; the thumb keeps every gesture', async () => {
  await render(() => [
    h(Slider, { modelValue: 10, 'aria-label': 'h' }),
    h(Slider, { modelValue: 10, orientation: 'vertical', 'aria-label': 'v' }),
    h(Rating, { modelValue: 2 }),
  ])
  const [horizontal, vertical] = document.querySelectorAll<HTMLElement>('.ui-slider')
  expect(getComputedStyle(horizontal!).touchAction).toBe('pan-y')
  expect(getComputedStyle(vertical!).touchAction).toBe('pan-x')
  expect(getComputedStyle(document.querySelector('.ui-slider-thumb')!).touchAction).toBe('none')
  expect(getComputedStyle(document.querySelector('.ui-rating')!).touchAction).toBe('pan-y')
})

test('Calendar builds its date formatters once, not once per cell', async () => {
  const Original = Intl.DateTimeFormat
  let built = 0
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
    ...args: ConstructorParameters<typeof Intl.DateTimeFormat>
  ) {
    built++
    return new Original(...args)
  } as never)
  await render(() => h(Calendar, { modelValue: new Date(2026, 2, 5) }), { global })
  expect(document.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(27)
  expect(built).toBeLessThan(10)
})
