import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import * as ui from '../src/index'

// A form library spreads `id`, `aria-invalid` and `aria-describedby` on a control. Inside a Field,
// the Field's label must still name the control, and the Field's error must still describe it
// next to what was passed.
const flat = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
]
const tree = [{ label: 'Root', value: 'root', children: [{ label: 'Leaf', value: 'leaf' }] }]
const controls: Record<string, string> = {
  Input: '<Input />',
  Textarea: '<Textarea />',
  InputNumber: '<InputNumber />',
  PasswordInput: '<PasswordInput />',
  Select: '<Select :items="flat" />',
  Combobox: '<Combobox :items="flat" />',
  CascadeSelect: '<CascadeSelect :items="tree" />',
  TreeSelect: '<TreeSelect :items="tree" />',
  DatePicker: '<DatePicker />',
  OtpInput: '<OtpInput :length="4" />',
  Checkbox: '<Checkbox label="Agree" />',
  Switch: '<Switch />',
  RadioGroup: '<RadioGroup><Radio value="a" label="A" /></RadioGroup>',
  Slider: '<Slider />',
  SelectButton: '<SelectButton :items="flat" />',
}

for (const [name, template] of Object.entries(controls)) {
  test(`${name} in a Field keeps its label and error when id and aria are passed`, async () => {
    const screen = await render({
      components: ui as never,
      data: () => ({ flat, tree }),
      template: `<Field label="Label" error="Field error">${template.replace(
        /^<(\w+)/,
        '<$1 id="passed" aria-invalid="true" aria-describedby="passed-error"',
      )}</Field>`,
    })
    const field = screen.container.querySelector<HTMLElement>('.ui-field')!
    const label = field.querySelector<HTMLLabelElement>('label')!
    const named = label.htmlFor
      ? document.getElementById(label.htmlFor)
      : field.querySelector('[aria-labelledby]')
    expect(named, 'the label points at something').not.toBeNull()
    // the id the label points at belongs to the control (not a dangling or a duplicate id)
    expect(document.querySelectorAll(`[id="${CSS.escape(label.htmlFor)}"]`).length).toBe(1)
    const described = (named!.getAttribute('aria-describedby') ?? '').split(' ')
    const errorId = field.querySelector('[role=alert]')!.id
    expect(described, 'the Field error describes the control').toContain(errorId)
  })
}
