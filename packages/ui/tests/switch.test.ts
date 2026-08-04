import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import SwitchFixture from './fixtures/SwitchFixture.vue'
import Switch from '../src/components/Switch/Switch.vue'

test('click toggles the model; label click toggles it too', async () => {
  const screen = render(SwitchFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="basic"] .ui-switch-input',
  )!
  await expect.element(screen.getByTestId('value')).toHaveTextContent('false')

  await userEvent.click(input)
  await expect.element(screen.getByTestId('value')).toHaveTextContent('true')

  await userEvent.click(screen.getByText('Notifications'))
  await expect.element(screen.getByTestId('value')).toHaveTextContent('false')
})

test('Space toggles a focused switch', async () => {
  const screen = render(SwitchFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="basic"] .ui-switch-input',
  )!
  input.focus()
  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('true')
})

test('role="switch" and aria-checked reflect state', async () => {
  const screen = render(Switch, { props: { modelValue: true, label: 'On' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-switch-input')!
  expect(input.getAttribute('role')).toBe('switch')
  expect(input.getAttribute('aria-checked')).toBe('true')
})

test('disabled blocks interaction', async () => {
  const screen = render(Switch, { props: { disabled: true, label: 'Off' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-switch-input')!
  expect(input.disabled).toBe(true)
})

test('form participation: FormData carries the name for a checked switch', async () => {
  const screen = render(SwitchFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('agree')).toBe('on')
})

test('thumb carries no Vue-managed inline style (convention 15 regression guard)', async () => {
  const screen = render(Switch, { props: { modelValue: true, label: 'On' } })
  const thumb = screen.container.querySelector<HTMLElement>('.ui-switch-thumb')!
  expect(thumb.getAttribute('style')).toBeNull()
})

test('motionCss=false keeps the no-anim class permanently, past first paint', async () => {
  const screen = render(Switch, { props: { motionCss: false, label: 'No motion' } })
  const root = screen.container.querySelector<HTMLElement>('.ui-switch')!
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(root).toHaveClass('ui-switch--no-anim')
})
