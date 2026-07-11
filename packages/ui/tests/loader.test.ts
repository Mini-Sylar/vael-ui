// The spinner is a pure CSS animation with no presence state — assertions
// here are about markup/ARIA and class-merge, not visual timing.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { vi } from 'vitest'
import Loader from '../src/components/Loader.vue'
import ButtonFixture from './fixtures/ButtonFixture.vue'

test('default: aria-hidden, no accessible name', async () => {
  const screen = render(Loader)
  const el = screen.container.querySelector('.ui-loader')!
  expect(el.getAttribute('aria-hidden')).toBe('true')
  expect(el.getAttribute('role')).toBeNull()
})

test('label renders role=status with the label as accessible text', async () => {
  const screen = render(Loader, { props: { label: 'Loading results' } })
  const status = screen.getByRole('status')
  await expect.element(status).toHaveAccessibleName('Loading results')
  expect(status.element().getAttribute('aria-hidden')).toBeNull()
})

test('ui.root merges onto the root class', async () => {
  const screen = render(Loader, { props: { ui: { root: 'my-loader' } } })
  const el = screen.container.querySelector('.ui-loader')!
  expect(el).toHaveClass('my-loader')
})

test('size sets font-size on the root', async () => {
  const screen = render(Loader, { props: { size: '2rem' } })
  const el = screen.container.querySelector<HTMLElement>('.ui-loader')!
  expect(el.style.fontSize).toBe('2rem')
})

// Regression on the Button/Toaster spinner extraction: Button's auto-loading
// path must still show a spinner (now `.ui-loader` instead of the old
// `.ui-button-spinner` class) while a click's returned promise is pending.
test('Button still shows a spinner while auto-loading after the .ui-loader extraction', async () => {
  let resolveTask!: () => void
  const task = () => new Promise<void>((resolve) => (resolveTask = resolve))
  const screen = render(ButtonFixture, { props: { task } })

  const button = screen.getByRole('button')
  const loaderWrap = document.querySelector<HTMLElement>('.ui-button-loader')!
  expect(loaderWrap.querySelector('.ui-loader')).not.toBeNull()
  expect(getComputedStyle(loaderWrap).opacity).toBe('0')

  await button.click()
  await vi.waitFor(() => expect(getComputedStyle(loaderWrap).opacity).toBe('1'))

  resolveTask()
  await vi.waitFor(() => expect(getComputedStyle(loaderWrap).opacity).toBe('0'))
})
