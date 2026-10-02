import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import * as ui from '../src/index'

// Every Field-aware control, rendered with an attached label plus #prepend/#append. Framed
// controls must join flush; frameless ones must fall back to a plain side label and inline text.
const flat = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
]
const tree = [{ label: 'Root', value: 'root', children: [{ label: 'Leaf', value: 'leaf' }] }]
const controls: Record<string, { template: string; framed: boolean }> = {
  Input: { template: '<Input />', framed: true },
  Textarea: { template: '<Textarea />', framed: true },
  InputNumber: { template: '<InputNumber />', framed: true },
  PasswordInput: { template: '<PasswordInput />', framed: true },
  Select: { template: '<Select :items="flat" />', framed: true },
  Combobox: { template: '<Combobox :items="flat" />', framed: true },
  CascadeSelect: { template: '<CascadeSelect :items="tree" />', framed: true },
  TreeSelect: { template: '<TreeSelect :items="tree" />', framed: true },
  DatePicker: { template: '<DatePicker />', framed: true },
  OtpInput: { template: '<OtpInput :length="4" />', framed: false },
  Checkbox: { template: '<Checkbox label="Agree" />', framed: false },
  Switch: { template: '<Switch />', framed: false },
  RadioGroup: {
    template: '<RadioGroup><Radio value="a" label="A" /><Radio value="b" label="B" /></RadioGroup>',
    framed: false,
  },
  Slider: { template: '<Slider />', framed: false },
  Knob: { template: '<Knob />', framed: false },
  Dial: { template: '<Dial :min="0" :max="100" />', framed: false },
  Rating: { template: '<Rating />', framed: false },
  SelectButton: { template: '<SelectButton :items="flat" />', framed: false },
  FileUpload: { template: '<FileUpload />', framed: false },
}

for (const [name, { template, framed }] of Object.entries(controls)) {
  test(`${name} in a Field with an attached label and #prepend/#append`, async () => {
    const screen = await render({
      components: ui as never,
      data: () => ({ flat, tree }),
      template: `<div style="inline-size: 32rem"><Field label="${name}" label-placement="start" attached>
        <template #prepend>pre</template>${template}<template #append>post</template>
      </Field></div>`,
    })
    const field = screen.container.querySelector<HTMLElement>('.ui-field')!
    const ids = [...field.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)

    const label = field.querySelector<HTMLLabelElement>('.ui-field-label')!
    const named = document.getElementById(label.htmlFor) ?? field.querySelector('[aria-labelledby]')
    expect(named).not.toBeNull()

    const prepend = field.querySelector<HTMLElement>('.ui-field-prepend')!
    const append = field.querySelector<HTMLElement>('.ui-field-append')!
    if (framed) {
      const frame = field.querySelector<HTMLElement>(
        '.ui-field-control [data-ui-frame]:not(:is(.ui-field-prepend, .ui-field-append) *)',
      )!
      expect(Math.round(prepend.getBoundingClientRect().right)).toBe(
        Math.round(frame.getBoundingClientRect().left),
      )
      expect(Math.round(append.getBoundingClientRect().left)).toBe(
        Math.round(frame.getBoundingClientRect().right),
      )
      expect(getComputedStyle(label).borderTopWidth).toBe('1px')
    } else {
      for (const el of [label, prepend, append]) {
        expect(getComputedStyle(el).borderTopWidth).toBe('0px')
        expect(getComputedStyle(el).backgroundColor).toBe('rgba(0, 0, 0, 0)')
      }
      const group = field.querySelector<HTMLElement>('.ui-field-group')!
      const control = group.querySelector<HTMLElement>(
        ':scope > :not(.ui-field-prepend, .ui-field-append)',
      )!
      expect(prepend.getBoundingClientRect().right).toBeLessThanOrEqual(
        control.getBoundingClientRect().left,
      )
      expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(
        append.getBoundingClientRect().left,
      )
    }
  })
}
