import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import SwitchFixture from './fixtures/SwitchFixture.vue'
import Switch from '../src/components/Switch/Switch.vue'

test('click toggles the model; label click toggles it too', async () => {
  const screen = await render(SwitchFixture, {})
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
  const screen = await render(SwitchFixture, {})
  const input = screen.container.querySelector<HTMLInputElement>(
    '[data-testid="basic"] .ui-switch-input',
  )!
  input.focus()
  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('true')
})

test('role="switch" and aria-checked reflect state', async () => {
  const screen = await render(Switch, { props: { modelValue: true, label: 'On' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-switch-input')!
  expect(input.getAttribute('role')).toBe('switch')
  expect(input.getAttribute('aria-checked')).toBe('true')
})

test('disabled blocks interaction', async () => {
  const screen = await render(Switch, { props: { disabled: true, label: 'Off' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-switch-input')!
  expect(input.disabled).toBe(true)
})

test('form participation: FormData carries the name for a checked switch', async () => {
  const screen = await render(SwitchFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('agree')).toBe('on')
})

test('thumb carries no Vue-managed inline style (convention 15 regression guard)', async () => {
  const screen = await render(Switch, { props: { modelValue: true, label: 'On' } })
  const thumb = screen.container.querySelector<HTMLElement>('.ui-switch-thumb')!
  expect(thumb.getAttribute('style')).toBeNull()
})

test('motion=false keeps the no-anim class permanently, past first paint', async () => {
  const screen = await render(Switch, { props: { motion: false, label: 'No motion' } })
  const root = screen.container.querySelector<HTMLElement>('.ui-switch')!
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  expect(root).toHaveClass('ui-switch--no-anim')
})

test('motion false turns off the track color fade as well as the thumb slide', async () => {
  await render(Switch, { props: { modelValue: false, label: 'Wi-Fi', motion: false } })
  const track = document.querySelector('.ui-switch-track')!
  const thumb = document.querySelector('.ui-switch-thumb')!
  expect(getComputedStyle(track).transitionProperty).toBe('none')
  expect(getComputedStyle(thumb).transitionProperty).toBe('none')
})

test('id and aria-* reach the native input, so an outside label or aria-label names it', async () => {
  const screen = await render({
    components: { Switch },
    template: `<div><label for="wifi">Wi-Fi</label><Switch id="wifi" data-testid="root" /><Switch aria-label="Bluetooth" /></div>`,
  })
  await expect.element(screen.getByRole('switch', { name: 'Wi-Fi' })).toHaveAttribute('id', 'wifi')
  await expect.element(screen.getByRole('switch', { name: 'Bluetooth' })).toBeInTheDocument()
  // The wrapper keeps everything else.
  await expect.element(screen.getByTestId('root')).toHaveClass('ui-switch')
  expect(document.querySelectorAll('[aria-label="Bluetooth"]')).toHaveLength(1)
})

test('dragging the thumb past halfway turns it on, and short of halfway leaves it', async () => {
  const value = shallowRef(false)
  const screen = await render({
    render: () =>
      h(Switch, {
        modelValue: value.value,
        'onUpdate:modelValue': (next: boolean) => (value.value = next),
        label: 'Alerts',
      }),
  })
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const track = screen.container.querySelector<HTMLElement>('.ui-switch-track')!
  const thumb = screen.container.querySelector<HTMLElement>('.ui-switch-thumb')!
  const travel = track.offsetWidth - track.offsetHeight
  const pointer = (type: string, clientX: number) =>
    new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX })

  input.dispatchEvent(pointer('pointerdown', 100))
  input.dispatchEvent(pointer('pointermove', 100 + travel * 0.3))
  await nextTick()
  expect(screen.container.querySelector('.ui-switch')!.hasAttribute('data-dragging')).toBe(true)
  expect(parseFloat(thumb.style.translate)).toBeCloseTo(travel * 0.3, 0)
  input.dispatchEvent(pointer('pointerup', 100 + travel * 0.3))
  input.click()
  await nextTick()
  expect(value.value).toBe(false)
  expect(thumb.style.translate).toBe('')

  input.dispatchEvent(pointer('pointerdown', 100))
  input.dispatchEvent(pointer('pointermove', 100 + travel * 0.8))
  await nextTick()
  expect(screen.container.querySelector('.ui-switch')!.getAttribute('data-state')).toBe('checked')
  input.dispatchEvent(pointer('pointerup', 100 + travel * 0.8))
  input.click()
  await nextTick()
  expect(value.value).toBe(true)
  expect(input.checked).toBe(true)

  input.click()
  await nextTick()
  expect(value.value).toBe(false)
})
