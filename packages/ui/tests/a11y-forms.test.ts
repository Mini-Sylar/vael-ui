import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import Editable from '../src/components/Editable/Editable.vue'
import Field from '../src/components/Field/Field.vue'
import Input from '../src/components/Input/Input.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import ColorPicker from '../src/components/ColorPicker/ColorPicker.vue'
import Slider from '../src/components/Slider/Slider.vue'
import Knob from '../src/components/Knob/Knob.vue'
import Rating from '../src/components/Rating/Rating.vue'
import FileUpload from '../src/components/FileUpload/FileUpload.vue'

const ticks = async (n = 3) => {
  for (let i = 0; i < n; i++) await nextTick()
}

function inField(control: unknown, fieldProps: Record<string, unknown>, controlProps = {}) {
  return defineComponent({
    setup: () => () => h(Field, fieldProps, { default: () => h(control as never, controlProps) }),
  })
}

// 1
test('Editable activation-mode=focus: closing returns focus to the preview without reopening it', async () => {
  const screen = await render(Editable, { props: { modelValue: 'Title', activationMode: 'focus' } })
  const preview = () => screen.container.querySelector<HTMLButtonElement>('.ui-editable-preview')
  const input = () => screen.container.querySelector<HTMLInputElement>('.ui-editable input')
  preview()!.focus()
  await vi.waitFor(() => expect(document.activeElement).toBe(input()))
  await userEvent.keyboard('{Escape}')
  await ticks()
  await new Promise((r) => setTimeout(r, 50))
  expect(input()).toBeNull()
  expect(document.activeElement).toBe(preview())

  // Focus leaving for the page isn't pulled back to the preview.
  const outside = document.createElement('button')
  document.body.append(outside)
  try {
    preview()!.blur()
    preview()!.focus()
    await vi.waitFor(() => expect(document.activeElement).toBe(input()))
    outside.focus()
    await ticks()
    await new Promise((r) => setTimeout(r, 50))
    expect(input()).toBeNull()
    expect(document.activeElement).toBe(outside)
  } finally {
    outside.remove()
  }
})

// 2
test('Editable: aria-label and aria-labelledby name the inner input, not the wrapper', async () => {
  const screen = await render(Editable, {
    props: { modelValue: 'Title', 'aria-label': 'Project name', editing: true },
  })
  const root = screen.container.querySelector('.ui-editable')!
  const input = screen.container.querySelector<HTMLInputElement>('.ui-editable input')!
  expect(input.getAttribute('aria-label')).toBe('Project name')
  expect(root.hasAttribute('aria-label')).toBe(false)

  const other = await render(Editable, {
    props: { modelValue: 'Title', 'aria-labelledby': 'heading', editing: true },
  })
  expect(other.container.querySelector('.ui-editable input')!.getAttribute('aria-labelledby')).toBe(
    'heading',
  )
})

// 3
test.each([
  ['Input', Input, 'input'],
  ['Textarea', Textarea, 'textarea'],
] as const)(
  '%s: your aria-describedby joins the Field description, and survives outside a Field',
  async (_, control, tag) => {
    const screen = await render(
      inField(
        control,
        { label: 'Bio', description: 'Shown publicly' },
        {
          'aria-describedby': 'own-hint',
        },
      ),
    )
    const el = screen.container.querySelector(tag)!
    const descId = screen.container.querySelector('.ui-field-description')!.id
    expect(el.getAttribute('aria-describedby')).toBe(`own-hint ${descId}`)

    const Bare = defineComponent({
      setup: () => () => h(control as never, { 'aria-describedby': 'own-hint' }),
    })
    const bare = await render(Bare)
    expect(bare.container.querySelector(tag)!.getAttribute('aria-describedby')).toBe('own-hint')
  },
)

// 4
test('PasswordInput: each requirement reads its state, the list describes the input, a change is announced once', async () => {
  const rules = [
    { label: 'At least 3 characters', test: (v: string) => v.length >= 3 },
    { label: 'A number', test: (v: string) => /\d/.test(v) },
  ]
  const screen = await render(PasswordInput, { props: { rules, hintPlacement: 'inline' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const list = screen.container.querySelector<HTMLElement>('.ui-password-input-hint-list')!
  expect(list.id).not.toBe('')
  expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(list.id)
  // The list itself isn't live, so its text isn't read on every keystroke.
  expect(list.hasAttribute('aria-live')).toBe(false)
  const items = [...list.querySelectorAll('li')]
  expect(items[0]!.textContent).toContain('not met')

  const status = screen.container.querySelector<HTMLElement>('.ui-password-input-status')!
  expect(status.getAttribute('aria-live')).toBe('polite')
  await userEvent.type(input, 'ab1')
  await ticks()
  expect(items[0]!.textContent).toMatch(/met$/)
  expect(items[0]!.textContent).not.toContain('not met')
  expect(status.textContent).toContain('At least 3 characters')
  expect(status.textContent).toContain('A number')
  // Typing that changes no rule leaves the announcement alone.
  const before = status.textContent
  await userEvent.type(input, 'c')
  await ticks()
  expect(status.textContent).toBe(before)
})

// 5
test('OtpInput mask: the real input is a password field, so the code is not read aloud', async () => {
  const screen = await render(OtpInput, { props: { mask: true, modelValue: '123' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-otp-input')!
  expect(input.type).toBe('password')
  expect(input.getAttribute('autocomplete')).toBe('one-time-code')
  const plain = await render(OtpInput, { props: { modelValue: '123' } })
  expect(plain.container.querySelector<HTMLInputElement>('.ui-otp-input')!.type).toBe('text')
})

// 6
test('ColorPicker right to left: the hue gradient runs from the right, like the thumb', async () => {
  document.documentElement.dir = 'rtl'
  try {
    const screen = await render(ColorPicker, { props: { modelValue: '#ff0000' } })
    screen.container.querySelector<HTMLButtonElement>('.ui-color-picker-swatch')!.click()
    const track = await vi.waitFor(() => {
      const el = document.querySelector<HTMLElement>('.ui-color-picker-hue .ui-slider-track')
      expect(el).not.toBeNull()
      return el!
    })
    expect(getComputedStyle(track).backgroundImage).toContain('to left')
  } finally {
    document.documentElement.dir = ''
  }
})

// 7
test('Slider, Knob, Rating and FileUpload set aria-invalid from their prop or the Field error', async () => {
  const slider = await render(inField(Slider, { label: 'Volume', error: 'Too loud' }))
  expect(slider.container.querySelector('[role="slider"]')!.getAttribute('aria-invalid')).toBe(
    'true',
  )
  const ownSlider = await render(Slider, { props: { invalid: true, 'aria-label': 'Volume' } })
  expect(ownSlider.container.querySelector('[role="slider"]')!.getAttribute('aria-invalid')).toBe(
    'true',
  )
  const okSlider = await render(Slider, { props: { 'aria-label': 'Volume' } })
  expect(okSlider.container.querySelector('[role="slider"]')!.hasAttribute('aria-invalid')).toBe(
    false,
  )

  const knob = await render(inField(Knob, { label: 'Gain', error: 'Clipping' }))
  expect(knob.container.querySelector('[role="slider"]')!.getAttribute('aria-invalid')).toBe('true')
  const ownKnob = await render(Knob, { props: { invalid: true, 'aria-label': 'Gain' } })
  expect(ownKnob.container.querySelector('[role="slider"]')!.getAttribute('aria-invalid')).toBe(
    'true',
  )

  const rating = await render(inField(Rating, { label: 'Score', error: 'Pick one' }))
  expect(rating.container.querySelector('[role="slider"]')!.getAttribute('aria-invalid')).toBe(
    'true',
  )

  const upload = await render(inField(FileUpload, { label: 'Files', error: 'Add one' }))
  expect(upload.container.querySelector('input[type="file"]')!.getAttribute('aria-invalid')).toBe(
    'true',
  )
  expect(
    upload.container.querySelector('.ui-file-upload-dropzone button')!.getAttribute('aria-invalid'),
  ).toBe('true')
})

// 8
test('FileUpload in a Field: the label, description and error reach the Browse button', async () => {
  const screen = await render(
    inField(FileUpload, { label: 'Attachments', description: 'PDF only', error: 'Required' }),
  )
  const browse = screen.container.querySelector<HTMLButtonElement>(
    '.ui-file-upload-dropzone button',
  )!
  const labelId = screen.container.querySelector('.ui-field-label')!.id
  const descId = screen.container.querySelector('.ui-field-description')!.id
  const errorId = screen.container.querySelector('.ui-field-error')!.id
  const labelledBy = browse.getAttribute('aria-labelledby')?.split(' ') ?? []
  expect(labelledBy[0]).toBe(labelId)
  // The button's own text still follows the label: "Attachments Browse files".
  expect(labelledBy.at(-1)).toBe(browse.id)
  expect(browse.getAttribute('aria-describedby')).toBe(`${descId} ${errorId}`)
})

test('FileUpload always has a name: a Field without a label still names the file input', async () => {
  const screen = await render(inField(FileUpload, { description: 'PDF only' }))
  const input = screen.container.querySelector('input[type="file"]')!
  expect(input.getAttribute('aria-label')).toBe('Browse files')
  const browse = screen.container.querySelector('.ui-file-upload-dropzone button')!
  expect(browse.hasAttribute('aria-labelledby')).toBe(false)
})

test('FileUpload announces a rejected file in a polite live region', async () => {
  const screen = await render(FileUpload, { props: { accept: '.pdf', maxSize: 50 } })
  const status = screen.container.querySelector<HTMLElement>('.ui-file-upload-status')!
  expect(status.getAttribute('aria-live')).toBe('polite')
  const input = screen.container.querySelector<HTMLInputElement>('input[type="file"]')!
  const transfer = new DataTransfer()
  transfer.items.add(new File(['x'], 'notes.txt', { type: 'text/plain' }))
  transfer.items.add(new File([new Uint8Array(100)], 'big.pdf', { type: 'application/pdf' }))
  input.files = transfer.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await vi.waitFor(() => {
    expect(status.textContent).toContain(
      'notes.txt wasn’t added: that type of file isn’t accepted.',
    )
    expect(status.textContent).toContain('big.pdf wasn’t added: it’s too large.')
  })
})

test('Field: a control in a Field without a label is not pointed at a missing label', async () => {
  const screen = await render(inField(Rating, { description: 'Stars' }))
  expect(screen.container.querySelector('[role="slider"]')!.hasAttribute('aria-labelledby')).toBe(
    false,
  )
  const labelled = await render(inField(Rating, { label: 'Score' }))
  const labelId = labelled.container.querySelector('.ui-field-label')!.id
  expect(labelled.container.querySelector('[role="slider"]')!.getAttribute('aria-labelledby')).toBe(
    labelId,
  )
})
