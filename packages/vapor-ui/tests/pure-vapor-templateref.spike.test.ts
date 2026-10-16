/**
 * Upstream Vue Vapor sentinel (pure-Vapor app, no interop plugin): useTemplateRef on a plain
 * Vapor-native element was broken on 3.6.0-beta.17 and fixed in rc.1. Not part of `pnpm test`:
 * run with `pnpm test:spikes`.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import PureVaporRoot from './fixtures/PureVaporRoot.vue'

const byId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

test('useTemplateRef resolves for a plain Vapor-native element (rc.1)', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(PureVaporRoot)
  app.mount(host)
  try {
    // Previously documented as broken on 3.6.0-beta.17 (see App.vue's own
    // comment on `dropzoneEl`) — this is a regression guard in both
    // directions: catches it staying broken, and catches it breaking again.
    await vi.waitFor(() =>
      expect(byId('vapor-dialog-templateref-resolved')!.textContent).toBe('yes'),
    )
  } finally {
    app.unmount()
  }
})
