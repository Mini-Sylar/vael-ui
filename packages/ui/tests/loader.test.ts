// The spinner is a pure CSS animation with no presence state — assertions
// here are about markup/ARIA and class-merge, not visual timing.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { vi } from 'vitest'
import Loader from '../src/components/Loader/Loader.vue'
import ButtonFixture from './fixtures/ButtonFixture.vue'
import { h } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Button from '../src/components/Button/Button.vue'

test('default: aria-hidden, no accessible name', async () => {
  const screen = await render(Loader)
  const el = screen.container.querySelector('.ui-loader')!
  expect(el.getAttribute('aria-hidden')).toBe('true')
  expect(el.getAttribute('role')).toBeNull()
})

test('label renders role=status with the label as accessible text', async () => {
  const screen = await render(Loader, { props: { label: 'Loading results' } })
  const status = screen.getByRole('status')
  await expect.element(status).toHaveAccessibleName('Loading results')
  expect(status.element().getAttribute('aria-hidden')).toBeNull()
})

test('ui.root merges onto the root class', async () => {
  const screen = await render(Loader, { props: { ui: { root: 'my-loader' } } })
  const el = screen.container.querySelector('.ui-loader')!
  expect(el).toHaveClass('my-loader')
})

test('size sets font-size on the root', async () => {
  const screen = await render(Loader, { props: { size: '2rem' } })
  const el = screen.container.querySelector<HTMLElement>('.ui-loader')!
  expect(el.style.fontSize).toBe('2rem')
})

// Regression on the Button/Toaster spinner extraction: Button's auto-loading
// path must still show a spinner (now `.ui-loader` instead of the old
// `.ui-button-spinner` class) while a click's returned promise is pending.
test('Button still shows a spinner while auto-loading after the .ui-loader extraction', async () => {
  let resolveTask!: () => void
  const task = () => new Promise<void>((resolve) => (resolveTask = resolve))
  const screen = await render(ButtonFixture, { props: { task } })

  const button = screen.getByRole('button')
  const loaderWrap = document.querySelector<HTMLElement>('.ui-button-loader')!
  expect(loaderWrap.querySelector('.ui-loader')).not.toBeNull()
  expect(getComputedStyle(loaderWrap).opacity).toBe('0')

  await button.click()
  await vi.waitFor(() => expect(getComputedStyle(loaderWrap).opacity).toBe('1'))

  resolveTask()
  await vi.waitFor(() => expect(getComputedStyle(loaderWrap).opacity).toBe('0'))
})

test.each([
  ['ring', 0],
  ['dots', 3],
  ['bars', 3],
  ['comet', 0],
  ['dither', 9],
] as const)('type="%s" draws its parts inside the same 1em square', async (type, parts) => {
  const screen = await render(Loader, { props: { type, size: '20px' } })
  const el = screen.container.querySelector<HTMLElement>('.ui-loader')!
  expect(el.classList.contains(`ui-loader--${type}`)).toBe(true)
  expect(el.querySelectorAll('.ui-loader-part')).toHaveLength(parts)
  const box = el.getBoundingClientRect()
  expect(box.width).toBeCloseTo(20, 0)
  expect(box.height).toBeCloseTo(20, 0)
})

test("ConfigProvider's loaderType reaches Loader and the library's own spinners; a component's own type wins", async () => {
  const screen = await render({
    render: () =>
      h(ConfigProvider, { loaderType: 'dots' }, () => [
        h(Loader, { 'data-testid': 'inherits' }),
        h(Loader, { type: 'bars', 'data-testid': 'own' }),
        h(Button, { loading: true }, () => 'Save'),
        h(
          Button,
          { loading: true, loaderType: 'comet', 'data-testid': 'own-button' },
          () => 'Send',
        ),
      ]),
  })
  const inherits = screen.container.querySelector('[data-testid="inherits"]')!
  const own = screen.container.querySelector('[data-testid="own"]')!
  expect(inherits.classList.contains('ui-loader--dots')).toBe(true)
  expect(own.classList.contains('ui-loader--bars')).toBe(true)
  const buttonSpinner = screen.container.querySelector('.ui-button-loader .ui-loader')!
  expect(buttonSpinner.classList.contains('ui-loader--dots')).toBe(true)
  expect(buttonSpinner.querySelectorAll('.ui-loader-part')).toHaveLength(3)
  const ownButton = screen.container.querySelector('[data-testid="own-button"] .ui-loader')!
  expect(ownButton.classList.contains('ui-loader--comet')).toBe(true)
})

test('without a provider every spinner stays the ring', async () => {
  const screen = await render(Button, {
    props: { loading: true },
    slots: { default: () => 'Save' },
  })
  const spinner = screen.container.querySelector('.ui-button-loader .ui-loader')!
  expect(spinner.classList.contains('ui-loader--ring')).toBe(true)
  expect(getComputedStyle(spinner).animationName).toBe('ui-spin')
})

const Spinner = {
  name: 'MySpinner',
  render: () => h('svg', { class: 'my-spinner', viewBox: '0 0 16 16' }),
}

test('ConfigProvider loader-type takes your own component, for Loader and a loading Button', async () => {
  const screen = await render(() =>
    h(ConfigProvider as never, { loaderType: Spinner }, () => [
      h(Loader),
      h(Button as never, { loading: true }, () => 'Save'),
    ]),
  )
  const custom = screen.container.querySelectorAll('.ui-loader--custom')
  expect(custom).toHaveLength(2)
  for (const box of custom) {
    expect(box.querySelector('.my-spinner')).not.toBeNull()
    // The same 1em box the built-in loaders use.
    expect(box.getBoundingClientRect().width).toBeCloseTo(box.getBoundingClientRect().height, 0)
  }
})

test('a render function works as a loader, and a component from ref() renders without a warning', async () => {
  const { ref } = await import('vue')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const kept = ref(Spinner)
  const screen = await render(() =>
    h('div', [
      h(Loader, { type: () => h('span', { class: 'from-render-fn' }) }),
      h(Loader, { type: kept.value as never }),
    ]),
  )
  expect(
    screen.container.querySelector('.ui-loader--custom .from-render-fn, .from-render-fn'),
  ).not.toBeNull()
  expect(screen.container.querySelectorAll('.my-spinner')).toHaveLength(1)
  expect(warn.mock.calls.some((call) => String(call[0]).includes('reactive object'))).toBe(false)
  warn.mockRestore()
})
