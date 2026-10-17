import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import HistoryDialogsFixture from './fixtures/HistoryDialogsFixture.vue'

const settle = () => new Promise((resolve) => setTimeout(resolve, 150))

function waitForPopState() {
  return new Promise<void>((resolve) =>
    window.addEventListener('popstate', () => setTimeout(resolve), { once: true }),
  )
}

test('closing a nested closeOnHistoryBack dialog leaves the outer one open', async () => {
  const startLength = history.length
  const screen = await render(HistoryDialogsFixture)
  await screen.getByTestId('open-a').click()
  await expect.element(page.getByRole('dialog', { name: 'Outer' })).toBeVisible()
  await screen.getByTestId('open-b').click()
  await expect.element(page.getByRole('dialog', { name: 'Inner' })).toBeVisible()

  const popped = waitForPopState()
  await page.getByRole('dialog', { name: 'Inner' }).getByRole('button', { name: 'Close' }).click()
  await popped
  await settle()

  await expect.element(screen.getByTestId('state-b')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('state-a')).toHaveTextContent('open')

  // A real back gesture still closes the outer dialog.
  history.back()
  await vi.waitFor(() => expect(screen.getByTestId('state-a').element().textContent).toBe('closed'))
  expect(history.length).toBeGreaterThanOrEqual(startLength)
})

test('reopening a closeOnHistoryBack dialog before the closing back() lands keeps it open', async () => {
  const screen = await render(HistoryDialogsFixture)
  await screen.getByTestId('open-a').click()
  await expect.element(page.getByRole('dialog', { name: 'Outer' })).toBeVisible()

  const popped = waitForPopState()
  // Behind the overlay, so dispatch the click directly.
  ;(screen.getByTestId('reopen-a').element() as HTMLElement).click()
  await popped
  await settle()

  await expect.element(screen.getByTestId('state-a')).toHaveTextContent('open')
  expect(history.state?.__uiDialog).toBeTruthy()

  history.back()
  await vi.waitFor(() => expect(screen.getByTestId('state-a').element().textContent).toBe('closed'))
})
