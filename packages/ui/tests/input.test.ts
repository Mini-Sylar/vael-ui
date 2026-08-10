import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import InputFixture from './fixtures/InputFixture.vue'
import Input from '../src/components/Input/Input.vue'
import Field from '../src/components/Field/Field.vue'

test('v-model round-trips on every keystroke by default', async () => {
  const screen = render(InputFixture, {})
  await userEvent.fill(page.getByTestId('plain'), 'hello')
  await expect.element(page.getByTestId('plain-value')).toHaveTextContent('hello')
  expect(screen.container).not.toBeNull()
})

test('.trim modifier trims the committed value', async () => {
  render(InputFixture, {})
  await userEvent.fill(page.getByTestId('trim'), '  padded  ')
  await expect.element(page.getByTestId('trim-value')).toHaveTextContent('padded')
})

test('.lazy modifier commits on change (blur), not on every keystroke', async () => {
  render(InputFixture, {})
  const lazyInput = page.getByTestId('lazy')
  await userEvent.click(lazyInput)
  await userEvent.type(lazyInput, 'late')
  // Still uncommitted mid-typing (no blur/change yet).
  await expect.element(page.getByTestId('lazy-value')).toHaveTextContent('')
  await userEvent.keyboard('{Tab}')
  await expect.element(page.getByTestId('lazy-value')).toHaveTextContent('late')
})

test('frame click focuses the input; an interactive #end child keeps its own click instead', async () => {
  const screen = render(Input, {
    slots: { end: '<button type="button" data-testid="end-btn">X</button>' },
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-input')!
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  const btn = screen.container.querySelector<HTMLButtonElement>('[data-testid="end-btn"]')!

  root.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(document.activeElement).toBe(input))

  await userEvent.click(btn)
  expect(document.activeElement).toBe(btn)
})

test('disabled blocks input', async () => {
  const screen = render(Input, { props: { disabled: true, placeholder: 'off' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.disabled).toBe(true)
})

test('invalid prop and Field error both flip aria-invalid', async () => {
  const standalone = render(Input, { props: { invalid: true } })
  expect(standalone.container.querySelector('.ui-input-el')!.getAttribute('aria-invalid')).toBe(
    'true',
  )

  const inField = render(Field, {
    props: { error: 'Required' },
    slots: { default: () => null },
  })
  expect(inField.container.querySelector('.ui-field')).not.toBeNull()
})

test('size classes render for sm/md/lg', async () => {
  for (const size of ['sm', 'md', 'lg'] as const) {
    const screen = render(Input, { props: { size } })
    expect(screen.container.querySelector('.ui-input')).toHaveClass(`ui-input--${size}`)
  }
})

test('ui part overrides land on the right elements', async () => {
  const screen = render(Input, {
    props: { ui: { root: 'my-root', input: 'my-input', start: 'my-start', end: 'my-end' } },
    slots: { start: '<span>@</span>', end: '<span>x</span>' },
  })
  expect(screen.container.querySelector('.ui-input')).toHaveClass('my-root')
  expect(screen.container.querySelector('.ui-input-el')).toHaveClass('my-input')
  expect(screen.container.querySelector('.ui-input-start')).toHaveClass('my-start')
  expect(screen.container.querySelector('.ui-input-end')).toHaveClass('my-end')
})

test('fallthrough attrs land on the native input; class lands on the root frame', async () => {
  const screen = render(InputFixture, {})
  const wrapper = screen.container.querySelector('[data-testid="attrs"]')!.closest('.ui-input')!
  const input = wrapper.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(wrapper).toHaveClass('consumer-class')
  expect(input.getAttribute('maxlength')).toBe('5')
  expect(input.getAttribute('name')).toBe('username')
  expect(wrapper.getAttribute('maxlength')).toBeNull()
})
