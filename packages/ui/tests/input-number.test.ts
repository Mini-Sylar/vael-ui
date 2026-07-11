import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { nextTick } from 'vue'
import InputNumberFixture from './fixtures/InputNumberFixture.vue'

function basicInput(screen: ReturnType<typeof render>) {
  return screen.container.querySelector<HTMLInputElement>('[data-testid="basic"] .ui-input-el')!
}
function basicIncrement(screen: ReturnType<typeof render>) {
  return screen.container.querySelector<HTMLButtonElement>(
    '[data-testid="basic"] .ui-input-number-stepper--inc',
  )!
}

test('typing a de-DE formatted string parses to the correct number on commit', async () => {
  const screen = render(InputNumberFixture, { props: { locale: 'de-DE' } })
  const input = basicInput(screen)
  await userEvent.type(input, '1.234,5')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('1234.5')
})

test('blur reformats the display and clamps to min/max', async () => {
  const screen = render(InputNumberFixture, { props: { min: 0, max: 10 } })
  const input = basicInput(screen)
  await userEvent.type(input, '25')
  input.blur()
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('10')
  await expect.poll(() => input.value).toBe('10')
})

test('null model when cleared, with allowEmpty (default)', async () => {
  const screen = render(InputNumberFixture, { props: { min: 0 } })
  const input = basicInput(screen)
  await userEvent.type(input, '5')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('5')
  await userEvent.clear(input)
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('null')
  input.blur()
  // allowEmpty stays null after blur too — only allowEmpty=false coerces.
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('null')
})

test('allowEmpty=false coerces a blur-empty field to min ?? 0', async () => {
  const screen = render(InputNumberFixture, { props: { min: 2, allowEmpty: false } })
  const input = basicInput(screen)
  await userEvent.type(input, '5')
  await userEvent.clear(input)
  input.blur()
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('2')
})

test('steppers step decimal-safely: 0.1 by step 0.2 lands on exactly 0.3', async () => {
  const screen = render(InputNumberFixture, { props: { step: 0.2 } })
  const input = basicInput(screen)
  await userEvent.type(input, '0.1')
  await userEvent.click(basicIncrement(screen))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('0.3')
})

test('ArrowUp/ArrowDown step by the configured step and clamp at bounds', async () => {
  const screen = render(InputNumberFixture, { props: { min: 0, max: 2, step: 1 } })
  const input = basicInput(screen)
  input.focus()
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('1')
  await userEvent.keyboard('{ArrowUp}')
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('2')
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('1')
})

test('Home/End jump to min/max when defined', async () => {
  const screen = render(InputNumberFixture, { props: { min: -5, max: 5 } })
  const input = basicInput(screen)
  input.focus()
  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('5')
  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('-5')
})

test('press-and-hold on a stepper repeats the step beyond the first click', async () => {
  const screen = render(InputNumberFixture, { props: { step: 1 } })
  const inc = basicIncrement(screen)
  inc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
  // 500ms initial delay + several 60ms repeats.
  await new Promise((r) => setTimeout(r, 750))
  inc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
  const text = screen.getByTestId('basic-value').element().textContent ?? ''
  expect(Number(text)).toBeGreaterThan(2)
})

test('spinbutton ARIA reflects the current value and bounds', async () => {
  const screen = render(InputNumberFixture, { props: { min: 0, max: 10 } })
  const input = basicInput(screen)
  expect(input.getAttribute('role')).toBe('spinbutton')
  expect(input.getAttribute('aria-valuemin')).toBe('0')
  expect(input.getAttribute('aria-valuemax')).toBe('10')
  expect(input.hasAttribute('aria-valuenow')).toBe(false)
  await userEvent.type(input, '3')
  await nextTick()
  await expect.poll(() => input.getAttribute('aria-valuenow')).toBe('3')
})

test('disabled blocks typing and stepper interaction', async () => {
  const screen = render(InputNumberFixture, { props: { disabled: true } })
  const input = basicInput(screen)
  expect(input.disabled).toBe(true)
  const inc = basicIncrement(screen)
  expect(inc.disabled).toBe(true)
})

test('FormData carries the raw number string via the native input name', async () => {
  const screen = render(InputNumberFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('qty')).toBe('5')
})

test('increment/decrement are exposed as imperative step functions', async () => {
  const screen = render(InputNumberFixture, { props: { step: 2 } })
  const input = basicInput(screen)
  await userEvent.type(input, '4')
  await userEvent.click(screen.getByTestId('call-increment'))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('6')
  await userEvent.click(screen.getByTestId('call-decrement'))
  await userEvent.click(screen.getByTestId('call-decrement'))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('2')
})
