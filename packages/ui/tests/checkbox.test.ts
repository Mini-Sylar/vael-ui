import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CheckboxFixture from './fixtures/CheckboxFixture.vue'
import Checkbox from '../src/components/Checkbox.vue'

test('click toggles the boolean model; label click toggles it too', async () => {
  const screen = render(CheckboxFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="basic"] .ui-checkbox-input',
  )!
  await expect.element(screen.getByTestId('bool-value')).toHaveTextContent('false')

  await userEvent.click(input)
  await expect.element(screen.getByTestId('bool-value')).toHaveTextContent('true')

  await userEvent.click(screen.getByText('Subscribe'))
  await expect.element(screen.getByTestId('bool-value')).toHaveTextContent('false')
})

test('Space toggles a focused checkbox', async () => {
  const screen = render(CheckboxFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="basic"] .ui-checkbox-input',
  )!
  input.focus()
  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('bool-value')).toHaveTextContent('true')
})

test('array model reflects membership via the value prop', async () => {
  const screen = render(CheckboxFixture, {})
  const a = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="opt-a"] .ui-checkbox-input',
  )!
  const b = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="opt-b"] .ui-checkbox-input',
  )!

  await userEvent.click(a)
  await expect.element(screen.getByTestId('group-value')).toHaveTextContent('["a"]')
  await userEvent.click(b)
  await expect.element(screen.getByTestId('group-value')).toHaveTextContent('["a","b"]')
  await userEvent.click(a)
  await expect.element(screen.getByTestId('group-value')).toHaveTextContent('["b"]')
})

test('indeterminate sets and clears the native property, not an attribute', async () => {
  const screen = render(Checkbox, { props: { indeterminate: true } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-checkbox-input')!
  await vi.waitFor(() => expect(input.indeterminate).toBe(true))
  expect(input.hasAttribute('indeterminate')).toBe(false)

  await screen.rerender({ indeterminate: false })
  await vi.waitFor(() => expect(input.indeterminate).toBe(false))
})

test('disabled blocks interaction', async () => {
  const screen = render(Checkbox, { props: { disabled: true, label: 'Off' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-checkbox-input')!
  expect(input.disabled).toBe(true)
})

test('form participation: FormData carries the name for a checked box', async () => {
  const screen = render(CheckboxFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="form-check"] .ui-checkbox-input',
  )!
  expect(input.checked).toBe(true)
  const data = new FormData(form)
  expect(data.get('agree')).toBe('on')
})

test('no draw animation on initial checked mount; transitions resume right after', async () => {
  const screen = render(Checkbox, { props: { modelValue: true, label: 'Pre-checked' } })
  const root = screen.container.querySelector<HTMLElement>('.ui-checkbox')!
  expect(root).toHaveClass('ui-checkbox--no-anim')
  await vi.waitFor(() => expect(root).not.toHaveClass('ui-checkbox--no-anim'))
})

test('motionCss=false keeps the no-anim class permanently, past first paint', async () => {
  const screen = render(Checkbox, { props: { motionCss: false, label: 'No motion' } })
  const root = screen.container.querySelector<HTMLElement>('.ui-checkbox')!
  // Long enough for the sibling test's own first-paint guard to have
  // resolved by now — the class staying past that point is motionCss's doing.
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(root).toHaveClass('ui-checkbox--no-anim')
})
