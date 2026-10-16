/**
 * motion-v's AnimatePresence defers removal through Dialog's internal
 * Teleport (fixed in Vue 3.6.0-rc.3), and the imperative fallback
 * (`force-mount` + `beforeClose(done)`) still works. The direct-Teleport-child
 * upstream sentinels live in presence-teleport.spike.test.ts.
 */
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PresenceFixture from './fixtures/PresenceFixture.vue'
import BeforeCloseFixture from './fixtures/BeforeCloseFixture.vue'

// vitest-browser-vue stubs transition + transition-group by default, which
// would stub out AnimatePresence itself. The real ones must run here.
const realTransitions = {
  global: { stubs: { transition: false, 'transition-group': false } },
} as const

test("FIXED (3.6.0-rc.3): AnimatePresence defers removal through Dialog's internal Teleport", async () => {
  const screen = await render(PresenceFixture, realTransitions)
  await screen.getByTestId('open').click()
  const content = () => document.querySelector('[data-testid="motion-content"]')
  await vi.waitFor(() => expect(content()).not.toBeNull())

  await screen.getByTestId('dismiss').click()
  expect(content()).not.toBeNull() // still present: exit is running

  await vi.waitFor(() => expect(content()).toBeNull(), { timeout: 3000 })
  await expect.element(screen.getByTestId('exits')).toHaveTextContent('1')
})

test('fallback: force-mount + beforeClose defers close for an imperative exit', async () => {
  const screen = await render(BeforeCloseFixture, realTransitions)
  await screen.getByTestId('open').click()
  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')

  await screen.getByTestId('dismiss').click()
  // beforeClose holds the model open while the 400ms WAAPI exit runs…
  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')
  expect(document.querySelector<HTMLElement>('.ui-dialog')!.style.display).not.toBe('none')

  // …then done() flips the model and v-show hides the shell.
  await vi.waitFor(() => expect(screen.getByTestId('state').element().textContent).toBe('closed'), {
    timeout: 3000,
  })
  await expect.element(screen.getByTestId('exit-ran')).toHaveTextContent('true')
  expect(document.querySelector<HTMLElement>('.ui-dialog')!.style.display).toBe('none')
})
