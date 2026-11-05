import '../src/style.css'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import * as ui from '../src/index'

// `@focus` and `@blur` on a form control mean focus entered and left the control, whichever
// element inside it is the real input. (A listener on a wrapping element would never hear a blur:
// it does not bubble.)
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
  RadioGroup: '<RadioGroup><Radio value="a" label="A" /><Radio value="b" label="B" /></RadioGroup>',
  Slider: '<Slider />',
  Rating: '<Rating />',
  SelectButton: '<SelectButton :items="flat" />',
}

for (const [name, template] of Object.entries(controls)) {
  test(`${name}: @focus and @blur fire when focus enters and leaves it`, async () => {
    const seen: string[] = []
    const screen = await render({
      components: ui as never,
      data: () => ({ flat, tree }),
      methods: { note: (event: string) => seen.push(event) },
      template: `<div>${template.replace(/^<(\w+)/, '<$1 @focus="note(\'focus\')" @blur="note(\'blur\')"')}<button id="outside">outside</button></div>`,
    })
    const root = screen.container.firstElementChild!
    const first = root.querySelector<HTMLElement>(
      'input:not([type=hidden]), textarea, [role=combobox], [role=slider], [tabindex="0"], button:not(#outside)',
    )!
    expect(first).not.toBeNull()
    // A real click gives the page focus, without which a scripted focus fires no events.
    await userEvent.click(root.querySelector<HTMLElement>('#outside')!)
    seen.length = 0
    first.focus()
    expect(seen.filter((event) => event === 'focus').length).toBeGreaterThanOrEqual(1)
    root.querySelector<HTMLElement>('#outside')!.focus()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(seen).toContain('blur')
  })
}

test('RadioGroup: moving between its radios is not leaving it, and a real Tab out is', async () => {
  const seen: string[] = []
  const screen = await render({
    components: ui as never,
    methods: { note: (event: string) => seen.push(event) },
    template: `<div><RadioGroup @focus="note('focus')" @blur="note('blur')"><Radio value="a" label="A" /><Radio value="b" label="B" /></RadioGroup><button>outside</button></div>`,
  })
  const inputs = screen.container.querySelectorAll<HTMLInputElement>('input[type=radio]')
  // Start from the radio itself: a Tab from wherever the last test left focus could land elsewhere.
  await userEvent.click(inputs[0]!)
  expect(document.activeElement).toBe(inputs[0])
  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(inputs[1])
  expect(seen).toEqual(['focus'])
  await userEvent.tab()
  expect(seen).toEqual(['focus', 'blur'])
})

test('Checkbox: a real focus and Tab reach @focus and @blur once each', async () => {
  const seen: string[] = []
  const screen = await render({
    components: ui as never,
    methods: { note: (event: string) => seen.push(event) },
    template: `<div><Checkbox label="Agree" @focus="note('focus')" @blur="note('blur')" /><button>outside</button></div>`,
  })
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.container.querySelector('input'))
  await userEvent.tab()
  expect(seen).toEqual(['focus', 'blur'])
})
