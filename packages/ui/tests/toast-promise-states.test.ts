// toast.promise settles in place: the same toast moves into success or error, and the Toaster's
// `states` for that variant play on it.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import { toast } from '../src/composables/useToast'
import { catchAnimations, runsOn, startedSoFar } from './utils/startedAnimations'

catchAnimations()

// Toasts live in one store for the page: a test that fails mid-way must not leave its toast for the
// next one (or its own retry) to find.
afterEach(() => {
  toast.dismiss()
  document.body.innerHTML = ''
})

const motion = {
  states: {
    // Held values only (the card's first variant), so the test can tell the Toaster has seen it.
    loading: { toast: { opacity: 0.999 } },
    success: { icon: { scale: [0.6, 1.25, 1] } },
    error: { toast: { x: [0, -8, 8, -4, 4, 0] } },
  },
}

for (const outcome of ['success', 'error'] as const) {
  test(`a promise toast that ends in ${outcome} stays the same toast and plays its ${outcome} state`, async () => {
    const screen = await render(() => h(Toaster, { motion }))
    let settle!: () => void
    const result = new Promise<void>(
      (resolve, reject) =>
        (settle = outcome === 'success' ? resolve : () => reject(new Error('no'))),
    )
    void toast
      .promise(result, { loading: 'Saving…', success: 'Saved', error: 'Failed' })
      .catch(() => {})
    const loading = await vi.waitFor(() => {
      const el = screen.container.ownerDocument.querySelector<HTMLElement>('.ui-toast')
      expect(el?.textContent).toContain('Saving')
      return el!
    })
    // A card's first variant only sets held values: settle once the Toaster has seen the loading
    // one, or a slow runner settles it first and nothing is left to play.
    await vi.waitFor(() => expect(runsOn(loading).some((run) => run.id === 'ui-state')).toBe(true))
    // What had started before the outcome, so its own entrance doesn't count. The state is caught
    // as it starts, however short it is and however late the runner looks.
    const text = outcome === 'success' ? 'Saved' : 'Failed'
    const before = startedSoFar()
    settle()
    await vi.waitFor(() => expect(loading.textContent).toContain(text))
    // The same card, and its state played on the part.
    expect(loading.isConnected).toBe(true)
    // Any state that started on the part since, even on an icon swapped out by the time we look.
    await vi.waitFor(() => {
      const played = [...startedSoFar()].filter((run) => {
        if (before.has(run) || run.id !== 'ui-state') return false
        const target = (run.effect as KeyframeEffect | null)?.target
        return outcome === 'success' ? !!target?.matches('.ui-toast-icon') : target === loading
      })
      expect(played.length).toBeGreaterThan(0)
    })
  })
}
