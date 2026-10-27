import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import InputFixture from './fixtures/InputFixture.vue'
import Input from '../src/components/Input/Input.vue'
import Field from '../src/components/Field/Field.vue'

test('v-model round-trips on every keystroke by default', async () => {
  const screen = await render(InputFixture, {})
  await userEvent.fill(page.getByTestId('plain'), 'hello')
  await expect.element(page.getByTestId('plain-value')).toHaveTextContent('hello')
  expect(screen.container).not.toBeNull()
})

test('.trim modifier trims the committed value', async () => {
  await render(InputFixture, {})
  await userEvent.fill(page.getByTestId('trim'), '  padded  ')
  await expect.element(page.getByTestId('trim-value')).toHaveTextContent('padded')
})

test('.lazy modifier commits on change (blur), not on every keystroke', async () => {
  await render(InputFixture, {})
  const lazyInput = page.getByTestId('lazy')
  await userEvent.click(lazyInput)
  await userEvent.type(lazyInput, 'late')
  // Still uncommitted mid-typing (no blur/change yet).
  await expect.element(page.getByTestId('lazy-value')).toHaveTextContent('')
  await userEvent.keyboard('{Tab}')
  await expect.element(page.getByTestId('lazy-value')).toHaveTextContent('late')
})

test('frame click focuses the input; an interactive #end child keeps its own click instead', async () => {
  const screen = await render(Input, {
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
  const screen = await render(Input, { props: { disabled: true, placeholder: 'off' } })
  const input = screen.container.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(input.disabled).toBe(true)
})

test('invalid prop and Field error both flip aria-invalid', async () => {
  const standalone = await render(Input, { props: { invalid: true } })
  expect(standalone.container.querySelector('.ui-input-el')!.getAttribute('aria-invalid')).toBe(
    'true',
  )

  const inField = await render(Field, {
    props: { error: 'Required' },
    slots: { default: () => null },
  })
  expect(inField.container.querySelector('.ui-field')).not.toBeNull()
})

test('size classes render for sm/md/lg', async () => {
  for (const size of ['sm', 'md', 'lg'] as const) {
    const screen = await render(Input, { props: { size } })
    expect(screen.container.querySelector('.ui-input')).toHaveClass(`ui-input--${size}`)
  }
})

test('ui part overrides land on the right elements', async () => {
  const screen = await render(Input, {
    props: { ui: { root: 'my-root', input: 'my-input', start: 'my-start', end: 'my-end' } },
    slots: { start: '<span>@</span>', end: '<span>x</span>' },
  })
  expect(screen.container.querySelector('.ui-input')).toHaveClass('my-root')
  expect(screen.container.querySelector('.ui-input-el')).toHaveClass('my-input')
  expect(screen.container.querySelector('.ui-input-start')).toHaveClass('my-start')
  expect(screen.container.querySelector('.ui-input-end')).toHaveClass('my-end')
})

test('fallthrough attrs land on the native input; class lands on the root frame', async () => {
  const screen = await render(InputFixture, {})
  const wrapper = screen.container.querySelector('[data-testid="attrs"]')!.closest('.ui-input')!
  const input = wrapper.querySelector<HTMLInputElement>('.ui-input-el')!
  expect(wrapper).toHaveClass('consumer-class')
  expect(input.getAttribute('maxlength')).toBe('5')
  expect(input.getAttribute('name')).toBe('username')
  expect(wrapper.getAttribute('maxlength')).toBeNull()
})

test('#display draws the text over the input, which keeps the caret and the value', async () => {
  const value = shallowRef('hello')
  const screen = await render({
    render: () =>
      h(
        Input,
        {
          modelValue: value.value,
          'onUpdate:modelValue': (next: string) => (value.value = next),
          'aria-label': 'Name',
        },
        { display: ({ value }: { value: string }) => h('b', { class: 'mine' }, value) },
      ),
  })
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const display = screen.container.querySelector<HTMLElement>('.ui-input-display')!
  expect(display.querySelector('.mine')!.textContent).toBe('hello')
  expect(getComputedStyle(input).color).toBe('rgba(0, 0, 0, 0)')
  expect(getComputedStyle(input).caretColor).not.toBe('rgba(0, 0, 0, 0)')
  input.focus()
  await userEvent.keyboard('{End}!')
  await vi.waitFor(() => expect(display.querySelector('.mine')!.textContent).toBe('hello!'))
  const inputBox = input.getBoundingClientRect()
  const displayBox = display.getBoundingClientRect()
  expect(
    Math.abs(displayBox.left - inputBox.left - parseFloat(getComputedStyle(input).paddingLeft)),
  ).toBeLessThan(0.01)
})

test('#display follows the input as a long value scrolls', async () => {
  const long = 'a fairly long value that cannot possibly fit inside this narrow input'
  const screen = await render({
    render: () =>
      h(
        Input,
        { modelValue: long, style: 'inline-size: 8rem', 'aria-label': 'Long' },
        { display: ({ value }: { value: string }) => value },
      ),
  })
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const track = screen.container.querySelector<HTMLElement>('.ui-input-display-track')!
  input.focus()
  input.setSelectionRange(long.length, long.length)
  input.dispatchEvent(new Event('select'))
  await vi.waitFor(() => {
    expect(input.scrollLeft).toBeGreaterThan(0)
    expect(track.style.translate).toBe(`${-input.scrollLeft}px`)
  })
})

test('animated crossfades the placeholder and a value set while you are away, never typing', async () => {
  const value = shallowRef('')
  const placeholder = shallowRef('Search orders')
  const screen = await render(
    {
      render: () =>
        h(Input, {
          modelValue: value.value,
          'onUpdate:modelValue': (next: string) => (value.value = next),
          placeholder: placeholder.value,
          animated: true,
          'aria-label': 'Search',
        }),
    },
    { global: { stubs: { transition: false } } },
  )
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const display = () => screen.container.querySelector<HTMLElement>('.ui-input-display')
  expect(display()!.textContent).toBe('Search orders')
  expect(input.getAttribute('data-ui-display')).toBe('placeholder')
  // AnimatedText loads after mount; until then the same text shows as plain markup.
  await import('../src/components/AnimatedText/AnimatedText.vue')
  await new Promise((resolve) => setTimeout(resolve))
  placeholder.value = 'Search tasks'
  await nextTick()
  expect(display()!.querySelectorAll('.ui-animated-text-value')).toHaveLength(2)

  input.focus()
  await userEvent.keyboard('lamp')
  await vi.waitFor(() => expect(display()).toBeNull())
  expect(input.hasAttribute('data-ui-display')).toBe(false)

  input.blur()
  await vi.waitFor(() => expect(display()!.textContent).toBe('lamp'))
  expect(input.getAttribute('data-ui-display')).toBe('value')
})
