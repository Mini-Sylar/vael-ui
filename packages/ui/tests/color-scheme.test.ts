import '../src/style.css'
import { afterEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import ColorSchemeFixture from './fixtures/ColorSchemeFixture.vue'

afterEach(() => {
  delete document.documentElement.dataset.theme
})

test('defaults to system, applies data-theme on explicit choice, clears it back to system', async () => {
  const screen = render(ColorSchemeFixture)

  await expect.element(screen.getByTestId('mode')).toHaveTextContent('system')
  expect(document.documentElement.dataset.theme).toBeUndefined()

  await screen.getByTestId('set-dark').click()
  await expect.element(screen.getByTestId('mode')).toHaveTextContent('dark')
  await expect.element(screen.getByTestId('resolved')).toHaveTextContent('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')

  await screen.getByTestId('set-system').click()
  await expect.element(screen.getByTestId('mode')).toHaveTextContent('system')
  expect(document.documentElement.dataset.theme).toBeUndefined()
})

test('persists through the provided get/set pair and restores it on the next mount', async () => {
  let stored: string | null = null
  const persist = { get: () => stored, set: (m: string | null) => (stored = m) }

  const screen = render(ColorSchemeFixture, { props: { persist } })
  await screen.getByTestId('set-light').click()
  expect(stored).toBe('light')
  screen.unmount()

  const screen2 = render(ColorSchemeFixture, { props: { persist } })
  await expect.element(screen2.getByTestId('mode')).toHaveTextContent('light')
})
