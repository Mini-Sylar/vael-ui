import '../src/style.css'
import { h } from 'vue'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import RadioGroupFixture from './fixtures/RadioGroupFixture.vue'
import Field from '../src/components/Field.vue'
import RadioGroup from '../src/components/RadioGroup.vue'
import Radio from '../src/components/Radio.vue'

test('click selects; model updates and change fires once per distinct selection', async () => {
  const screen = render(RadioGroupFixture, {})
  const free = screen.container.querySelector<HTMLInputElement>('input[value="free"]')!

  await userEvent.click(free)
  await expect.element(screen.getByTestId('value')).toHaveTextContent('free')
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('1')

  // Re-clicking the already-selected option is a native no-op — no re-fire.
  await userEvent.click(free)
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('1')
})

test('arrow keys move selection natively and skip the disabled option', async () => {
  const screen = render(RadioGroupFixture, {})
  const free = screen.container.querySelector<HTMLInputElement>('input[value="free"]')!
  free.focus()

  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('pro')

  // "enterprise" is disabled — native roving skips it and wraps back to "free".
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('free')
})

test('group disabled blocks every radio in it', async () => {
  const screen = render(RadioGroupFixture, { props: { disabled: true } })
  for (const value of ['free', 'pro', 'enterprise']) {
    const input = screen.container.querySelector<HTMLInputElement>(`input[value="${value}"]`)!
    expect(input.disabled).toBe(true)
  }
})

test('FormData carries the shared name and selected value', async () => {
  const screen = render(RadioGroupFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('plan')).toBe('a')
})

test('Field label wires aria-labelledby on the group', async () => {
  const screen = render(Field, {
    props: { label: 'Plan' },
    slots: {
      default: () =>
        h(RadioGroup, { modelValue: null }, () => [
          h(Radio, { value: 'a', label: 'A' }),
          h(Radio, { value: 'b', label: 'B' }),
        ]),
    },
  })
  const group = screen.container.querySelector('.ui-radio-group')!
  const label = screen.container.querySelector('.ui-field-label')!
  expect(group.getAttribute('aria-labelledby')).toBe(label.id)
})

test('a Radio outside a RadioGroup throws', () => {
  expect(() => render(Radio, { props: { value: 'x' } })).toThrow()
})
