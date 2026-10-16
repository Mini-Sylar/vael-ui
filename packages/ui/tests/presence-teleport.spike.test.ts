/**
 * Upstream sentinels for motion-v's AnimatePresence (Vue's <Transition> with
 * JS hooks) across a Teleport, as of Vue 3.6.0-rc.3. A raw `<Teleport>` as
 * AnimatePresence's own direct child still loses its exit; if the KNOWN
 * BROKEN test starts failing, upstream fixed it and the README can drop the
 * force-mount + beforeClose caveat for that shape. Not part of `pnpm test`:
 * run with `pnpm test:spikes`.
 */
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PresenceDiagnostic from './fixtures/PresenceDiagnostic.vue'

// vitest-browser-vue stubs transition + transition-group by default, which
// would stub out AnimatePresence itself. The real ones must run here.
const realTransitions = {
  global: { stubs: { transition: false, 'transition-group': false } },
} as const

const probe = () => document.querySelector('[data-testid="probe"]')

test('control: AnimatePresence defers removal of a non-teleported motion.div', async () => {
  const screen = await render(PresenceDiagnostic, {
    props: { teleported: false },
    ...realTransitions,
  })
  await vi.waitFor(() => expect(probe()).not.toBeNull())

  await screen.getByTestId('hide').click()
  expect(probe()).not.toBeNull() // still present: exit is running

  await vi.waitFor(() => expect(probe()).toBeNull(), { timeout: 3000 })
  await expect.element(screen.getByTestId('exits')).toHaveTextContent('1')
})

test('KNOWN BROKEN: exit deferral does not cross a Teleport boundary', async () => {
  const screen = await render(PresenceDiagnostic, {
    props: { teleported: true },
    ...realTransitions,
  })
  await vi.waitFor(() => expect(probe()).not.toBeNull())

  await screen.getByTestId('hide').click()
  // Removed synchronously — no exit animation, no onExitComplete.
  expect(probe()).toBeNull()
  await new Promise((r) => setTimeout(r, 100))
  await expect.element(screen.getByTestId('exits')).toHaveTextContent('0')
})
