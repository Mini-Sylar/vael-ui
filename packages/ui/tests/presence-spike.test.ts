/**
 * SPIKE RESULT (documented in the README, verified here as regression
 * sentinels):
 *
 * motion-v's AnimatePresence is Vue's <Transition>/<TransitionGroup> with JS
 * hooks. Vue transitions cannot animate a child whose root node is a
 * <Teleport>, so exit-detection does NOT defer DOM removal through Dialog's
 * Teleport boundary — the subtree is yanked synchronously and `exit` never
 * runs. The supported motion path for Dialog exits is therefore the
 * imperative fallback: `force-mount` + `beforeClose(done)` driving
 * panelEl.animate()/GSAP/motion's animate().
 *
 * If test 2 ever starts failing, motion-v (or Vue) fixed the interop —
 * update the README and prefer the AnimatePresence pattern again.
 */
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PresenceDiagnostic from './fixtures/PresenceDiagnostic.vue'
import PresenceFixture from './fixtures/PresenceFixture.vue'
import BeforeCloseFixture from './fixtures/BeforeCloseFixture.vue'

// vitest-browser-vue stubs transition + transition-group by default, which
// would stub out AnimatePresence itself. The real ones must run here.
const realTransitions = {
  global: { stubs: { transition: false, 'transition-group': false } },
} as const

const probe = () => document.querySelector('[data-testid="probe"]')

test('control: AnimatePresence defers removal of a non-teleported motion.div', async () => {
  const screen = render(PresenceDiagnostic, { props: { teleported: false }, ...realTransitions })
  await vi.waitFor(() => expect(probe()).not.toBeNull())

  await screen.getByTestId('hide').click()
  expect(probe()).not.toBeNull() // still present: exit is running

  await vi.waitFor(() => expect(probe()).toBeNull(), { timeout: 3000 })
  await expect.element(screen.getByTestId('exits')).toHaveTextContent('1')
})

test('KNOWN BROKEN: exit deferral does not cross a Teleport boundary', async () => {
  const screen = render(PresenceDiagnostic, { props: { teleported: true }, ...realTransitions })
  await vi.waitFor(() => expect(probe()).not.toBeNull())

  await screen.getByTestId('hide').click()
  // Removed synchronously — no exit animation, no onExitComplete.
  expect(probe()).toBeNull()
  await new Promise((r) => setTimeout(r, 100))
  await expect.element(screen.getByTestId('exits')).toHaveTextContent('0')
})

test('KNOWN BROKEN: same failure with the full force-mounted Dialog', async () => {
  const screen = render(PresenceFixture, realTransitions)
  await screen.getByTestId('open').click()
  const content = () => document.querySelector('[data-testid="motion-content"]')
  await vi.waitFor(() => expect(content()).not.toBeNull())

  await screen.getByTestId('dismiss').click()
  expect(content()).toBeNull()
  await new Promise((r) => setTimeout(r, 100))
  await expect.element(screen.getByTestId('exits')).toHaveTextContent('0')
})

test('fallback: force-mount + beforeClose defers close for an imperative exit', async () => {
  const screen = render(BeforeCloseFixture, realTransitions)
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
