import '../src/style.css'
import { h } from 'vue'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import FieldFixture from './fixtures/FieldFixture.vue'
import Field from '../src/components/Field.vue'
import Input from '../src/components/Input.vue'

test('label "for" points at the control\'s id', async () => {
  const screen = render(FieldFixture, { props: { label: 'Name' } })
  const label = screen.container.querySelector<HTMLLabelElement>('.ui-field-label')!
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(label.getAttribute('for')).toBe(input.id)
  expect(input.id).not.toBe('')
})

test('describedby composes description+error ids and drops absent ones', async () => {
  const bare = render(FieldFixture, { props: {} })
  const bareInput = bare.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(bareInput.getAttribute('aria-describedby')).toBeNull()

  const withDescription = render(FieldFixture, { props: { description: 'Helper text' } })
  const descInput = withDescription.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const descId = withDescription.container.querySelector('.ui-field-description')!.id
  expect(descInput.getAttribute('aria-describedby')).toBe(descId)

  const withBoth = render(FieldFixture, {
    props: { description: 'Helper text', error: 'Required' },
  })
  const bothInput = withBoth.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const bothDescId = withBoth.container.querySelector('.ui-field-description')!.id
  const bothErrorId = withBoth.container.querySelector('.ui-field-error')!.id
  expect(bothInput.getAttribute('aria-describedby')).toBe(`${bothDescId} ${bothErrorId}`)
})

test('error flips aria-invalid on the slotted Input and renders role="alert"', async () => {
  const screen = render(FieldFixture, { props: { error: 'Required field' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.getAttribute('aria-invalid')).toBe('true')
  const error = screen.container.querySelector('.ui-field-error')!
  expect(error.getAttribute('role')).toBe('alert')
  expect(error.textContent).toBe('Required field')
  expect(screen.container.querySelector('.ui-field')!.hasAttribute('data-invalid')).toBe(true)
})

test("data-focused/data-filled mirror the control's focus and value reports", async () => {
  const screen = render(FieldFixture, {})
  const root = screen.container.querySelector('.ui-field')!
  expect(root.hasAttribute('data-focused')).toBe(false)
  expect(root.hasAttribute('data-filled')).toBe(false)

  await userEvent.click(page.getByPlaceholder('Type here'))
  await vi.waitFor(() => expect(root.hasAttribute('data-focused')).toBe(true))

  await userEvent.fill(page.getByPlaceholder('Type here'), 'hello')
  await vi.waitFor(() => expect(root.hasAttribute('data-filled')).toBe(true))

  await userEvent.click(screen.getByTestId('fill').element())
  await userEvent.keyboard('{Tab}')
  await vi.waitFor(() => expect(root.hasAttribute('data-focused')).toBe(false))
})

test("Field's disabled alone disables a nested control with no local disabled prop", async () => {
  const screen = render(Field, {
    props: { label: 'Locked', disabled: true },
    slots: { default: () => h(Input) },
  })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.disabled).toBe(true)
  expect(screen.container.querySelector('.ui-input--disabled')).not.toBeNull()
})

test('controls work standalone with no Field ancestor — no throw, own generated id', async () => {
  const screen = render(Input, { props: { placeholder: 'standalone' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.id).not.toBe('')
  expect(input.getAttribute('aria-describedby')).toBeNull()
  expect(input.getAttribute('aria-invalid')).toBeNull()
})

test('float placement flips data-filled when the input gets a value programmatically', async () => {
  const screen = render(FieldFixture, { props: { labelPlacement: 'float', label: 'Email' } })
  const root = screen.container.querySelector('.ui-field')!
  expect(root.hasAttribute('data-filled')).toBe(false)

  await screen.getByTestId('fill').click()
  await vi.waitFor(() => expect(root.hasAttribute('data-filled')).toBe(true))
})

test('#label slot replaces the label text but keeps the <label> element and for-wiring', async () => {
  const screen = render(Field, {
    slots: { label: '<strong data-testid="custom-label">Custom</strong>', default: '' },
  })
  const label = screen.container.querySelector('label')!
  expect(label).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="custom-label"]')).not.toBeNull()
})
