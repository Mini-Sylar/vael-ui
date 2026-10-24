/**
 * `states` in the built Vapor components. Run `pnpm build` first. Same behaviour as the VDOM build:
 * keyframes once on entering a state, plain values held while it's on.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import StatesVaporRoot from './fixtures/StatesVaporRoot.vue'

const states = (el: Element | null) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')

test('Vapor: invalid shakes, a press is held, the chevron holds while open', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(StatesVaporRoot)
  const root = app.mount(host) as unknown as { open: string | undefined }
  try {
    const field = () => host.querySelector('.ui-input')
    await vi.waitFor(() => expect(field()).not.toBeNull())
    // The player loads on mount; a change before it arrives shows the built-in look, nothing waits.
    await new Promise((resolve) => setTimeout(resolve, 300))
    host.querySelector<HTMLElement>('[data-testid="toggle"]')!.click()
    await vi.waitFor(() =>
      expect(states(field()).some((a) => a.playState === 'running')).toBe(true),
    )

    const press = host.querySelector<HTMLElement>('[data-testid="press"]')!
    const label = press.querySelector<HTMLElement>('.ui-button-label')!
    press.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
    )
    await vi.waitFor(() => expect(getComputedStyle(label).scale).toBe('0.8'), { timeout: 2000 })
    window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
    await vi.waitFor(() => expect(states(label)).toHaveLength(0), { timeout: 2000 })

    host.querySelector<HTMLElement>('.ui-accordion-trigger')!.click()
    const chevron = host.querySelector('.ui-accordion-chevron')!
    await vi.waitFor(() => expect(getComputedStyle(chevron).rotate).toBe('-90deg'), {
      timeout: 2000,
    })
    void root
  } finally {
    app.unmount()
    host.remove()
  }
})
