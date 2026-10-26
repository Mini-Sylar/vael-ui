// toast.promise settles in place: the same toast moves into success or error, and the Toaster's
// `states` for that variant play on it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import { toast } from '../src/composables/useToast'

const motion = {
  states: {
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
    // Sampled every frame: under load, the state can play out before a later look would see it.
    // Counted once the card shows the outcome, so its own entrance doesn't count.
    const text = outcome === 'success' ? 'Saved' : 'Failed'
    let played = false
    const sample = () => {
      const part = outcome === 'success' ? loading.querySelector('.ui-toast-icon') : loading
      if (loading.textContent?.includes(text) && part?.getAnimations().length) played = true
      else requestAnimationFrame(sample)
    }
    settle()
    sample()
    await vi.waitFor(() => expect(loading.textContent).toContain(text))
    // The same card, and its state played on the part.
    expect(loading.isConnected).toBe(true)
    await vi.waitFor(() => expect(played).toBe(true))
    toast.dismiss()
  })
}
