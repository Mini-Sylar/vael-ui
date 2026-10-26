import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import InputNumberFixture from './fixtures/InputNumberFixture.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

function basicInput(screen: Awaited<ReturnType<typeof render>>) {
  return screen.container.querySelector<HTMLInputElement>('[data-testid="basic"] .ui-input-el')!
}
function basicIncrement(screen: Awaited<ReturnType<typeof render>>) {
  return screen.container.querySelector<HTMLButtonElement>(
    '[data-testid="basic"] .ui-input-number-stepper--inc',
  )!
}

test('typing a de-DE formatted string parses to the correct number on commit', async () => {
  const screen = await render(InputNumberFixture, { props: { locale: 'de-DE' } })
  const input = basicInput(screen)
  await userEvent.type(input, '1.234,5')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('1234.5')
})

test('blur reformats the display and clamps to min/max', async () => {
  const screen = await render(InputNumberFixture, { props: { min: 0, max: 10 } })
  const input = basicInput(screen)
  await userEvent.type(input, '25')
  input.blur()
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('10')
  await expect.poll(() => input.value).toBe('10')
})

test('Enter clamps to min/max without leaving the field', async () => {
  const screen = await render(InputNumberFixture, { props: { min: 0, max: 10 } })
  const input = basicInput(screen)
  await userEvent.type(input, '25{Enter}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('10')
  await expect.poll(() => input.value).toBe('10')
  expect(document.activeElement).toBe(input)
})

test('null model when cleared, with allowEmpty (default)', async () => {
  const screen = await render(InputNumberFixture, { props: { min: 0 } })
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
  const screen = await render(InputNumberFixture, { props: { min: 2, allowEmpty: false } })
  const input = basicInput(screen)
  await userEvent.type(input, '5')
  await userEvent.clear(input)
  input.blur()
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('2')
})

test('steppers step decimal-safely: 0.1 by step 0.2 lands on exactly 0.3', async () => {
  const screen = await render(InputNumberFixture, { props: { step: 0.2 } })
  const input = basicInput(screen)
  await userEvent.type(input, '0.1')
  await userEvent.click(basicIncrement(screen))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('0.3')
})

test('ArrowUp/ArrowDown step by the configured step and clamp at bounds', async () => {
  const screen = await render(InputNumberFixture, { props: { min: 0, max: 2, step: 1 } })
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
  const screen = await render(InputNumberFixture, { props: { min: -5, max: 5 } })
  const input = basicInput(screen)
  input.focus()
  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('5')
  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('-5')
})

test('press-and-hold on a stepper repeats the step beyond the first click', async () => {
  const screen = await render(InputNumberFixture, { props: { step: 1 } })
  const inc = basicIncrement(screen)
  inc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
  // 500ms initial delay, then 60ms repeats.
  await expect
    .poll(() => Number(screen.getByTestId('basic-value').element().textContent), { timeout: 2000 })
    .toBeGreaterThan(2)
  inc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
})

test('spinbutton ARIA reflects the current value and bounds', async () => {
  const screen = await render(InputNumberFixture, { props: { min: 0, max: 10 } })
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
  const screen = await render(InputNumberFixture, { props: { disabled: true } })
  const input = basicInput(screen)
  expect(input.disabled).toBe(true)
  const inc = basicIncrement(screen)
  expect(inc.disabled).toBe(true)
})

test('FormData carries the raw number string via the native input name', async () => {
  const screen = await render(InputNumberFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('qty')).toBe('5')
})

test('increment/decrement are exposed as imperative step functions', async () => {
  const screen = await render(InputNumberFixture, { props: { step: 2 } })
  const input = basicInput(screen)
  await userEvent.type(input, '4')
  await userEvent.click(screen.getByTestId('call-increment'))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('6')
  await userEvent.click(screen.getByTestId('call-decrement'))
  await userEvent.click(screen.getByTestId('call-decrement'))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('2')
})

test('the phone keypad follows the range: full keyboard when it can go negative, else digits', async () => {
  const mode = async (props: Record<string, unknown>) => {
    const screen = await render(InputNumber, { props: { modelValue: 1, ...props } })
    const value = screen.container.querySelector('.ui-input-el')!.getAttribute('inputmode')
    await screen.unmount()
    return value
  }
  // The iPhone's number pads have no minus key.
  expect(await mode({})).toBe('text')
  expect(await mode({ min: -10 })).toBe('text')
  expect(await mode({ min: 0 })).toBe('decimal')
  expect(await mode({ min: 0, maxFractionDigits: 0 })).toBe('numeric')
})

test('animated rolls stepped values over the input and typing shows plain text', async () => {
  const value = shallowRef<number | null>(1200)
  const screen = await render({
    render: () =>
      h(InputNumber, {
        modelValue: value.value,
        'onUpdate:modelValue': (next: number | null) => (value.value = next),
        animated: true,
        locale: 'en-US',
        'aria-label': 'Amount',
      }),
  })
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const display = () => screen.container.querySelector<HTMLElement>('.ui-input-display')!
  const digits = () => display().querySelector('.ui-animated-number')
  await vi.waitFor(() => expect(digits()).not.toBeNull())
  expect(display().getAttribute('aria-hidden')).toBe('true')
  expect(getComputedStyle(input).color).toBe('rgba(0, 0, 0, 0)')
  expect(getComputedStyle(display()).fontSize).toBe(getComputedStyle(input).fontSize)

  input.focus()
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() =>
    expect(display().querySelector('.ui-animated-number-text')!.textContent).toBe('1,201'),
  )

  await userEvent.keyboard('5')
  await vi.waitFor(() => expect(digits()).toBeNull())
  expect(display().textContent).toBe(input.value)

  input.blur()
  await vi.waitFor(() => expect(digits()).not.toBeNull())
})

// An empty field with a stepper, optionally inside a ConfigProvider with motion off.
async function emptyStepper(motion?: boolean) {
  const value = shallowRef<number | null>(null)
  const field = () =>
    h(InputNumber, {
      modelValue: value.value,
      'onUpdate:modelValue': (next: number | null) => (value.value = next),
      min: 5,
      max: 600,
      step: 5,
      animated: true,
      'aria-label': 'Minutes',
    })
  const screen = await render({
    render: () => (motion === undefined ? field() : h(ConfigProvider, { motion }, field)),
  })
  const reels = () => [...screen.container.querySelectorAll('.ui-animated-number-reel')]
  return { value, screen, reels }
}

test('stepping up from empty lands on the first step within min, as a native number input', async () => {
  const { value, screen } = await emptyStepper()
  await userEvent.click(
    screen.container.querySelector<HTMLButtonElement>('.ui-input-number-stepper--inc')!,
  )
  await vi.waitFor(() => expect(value.value).toBe(5))
})

test('animated: a first value stepped in from empty rolls up, like any later step', async () => {
  const { screen, reels } = await emptyStepper()
  await userEvent.click(
    screen.container.querySelector<HTMLButtonElement>('.ui-input-number-stepper--inc')!,
  )
  await vi.waitFor(() => expect(reels().some((reel) => reel.getAnimations().length > 0)).toBe(true))
})

test('animated: with motion off around it, the first value shows at once, never 0 first', async () => {
  const { screen, reels } = await emptyStepper(false)
  // Each digit as it's first drawn: a roll-in would start its reel at 0.
  const firstDigits: string[] = []
  const watcher = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes)
        if (node instanceof HTMLElement)
          for (const digit of node.querySelectorAll<HTMLElement>('.ui-animated-number-digit'))
            firstDigits.push(digit.style.getPropertyValue('--ui-digit'))
  })
  watcher.observe(screen.container, { childList: true, subtree: true })
  await userEvent.click(
    screen.container.querySelector<HTMLButtonElement>('.ui-input-number-stepper--inc')!,
  )
  await vi.waitFor(() => expect(reels().length).toBeGreaterThan(0))
  watcher.disconnect()
  expect(firstDigits).toEqual(['5'])
})

test('without animated, nothing is drawn over the input', async () => {
  const screen = await render(InputNumber, { props: { modelValue: 5, 'aria-label': 'Amount' } })
  expect(screen.container.querySelector('.ui-input-display')).toBeNull()
  expect(screen.container.querySelector('input')!.hasAttribute('data-ui-roll')).toBe(false)
})

function pointer(type: string, clientX: number, init: PointerEventInit = {}) {
  return new PointerEvent(type, { button: 0, bubbles: true, cancelable: true, clientX, ...init })
}

test('scrub: dragging sideways steps the value, Shift by ten, and a click still focuses', async () => {
  const value = shallowRef<number | null>(10)
  const screen = await render({
    render: () =>
      h(InputNumber, {
        modelValue: value.value,
        'onUpdate:modelValue': (next: number | null) => (value.value = next),
        scrub: true,
        max: 100,
        'aria-label': 'Amount',
      }),
  })
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  expect(getComputedStyle(input).cursor).toBe('ew-resize')

  input.dispatchEvent(pointer('pointerdown', 100))
  input.dispatchEvent(pointer('pointermove', 102))
  expect(value.value).toBe(10)
  input.dispatchEvent(pointer('pointermove', 120))
  expect(value.value).toBe(15)
  await nextTick()
  expect(input.dataset.uiScrub).toBe('active')
  input.dispatchEvent(pointer('pointermove', 108, { shiftKey: true }))
  expect(value.value).toBe(30)
  input.dispatchEvent(pointer('pointermove', 600))
  expect(value.value).toBe(100)
  input.dispatchEvent(pointer('pointerup', 600))
  expect(document.activeElement).not.toBe(input)

  input.dispatchEvent(pointer('pointerdown', 50))
  input.dispatchEvent(pointer('pointerup', 50))
  expect(document.activeElement).toBe(input)
})
